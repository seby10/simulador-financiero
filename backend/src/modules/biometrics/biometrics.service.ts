import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import {
  assertFileKind,
  decodeImageBase64,
  onboardingDocumentPath,
  saveFile,
} from '../../common/http.js';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  ApplicationStatus,
  BiometricStatus,
} from '../../generated/prisma/enums.js';
import {
  BIOMETRIC_PROVIDER,
  type BiometricAssessment,
  type BiometricProvider,
} from './biometrics.provider.js';
import { BiometricsDto } from './biometrics.dto.js';

/** Documento contra el que se compara la selfie. */
export const REFERENCE_DOCUMENT = 'idFront';
/** Captura que verificó la identidad; sirve de referencia para recuperar la clave. */
export const SELFIE_DOCUMENT = 'selfie';

const number = (name: string, fallback: number, max: number) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > max) {
    throw new ServiceUnavailableException(
      `${name} debe ser un número entre 0 y ${max}`,
    );
  }
  return parsed;
};

/** Umbrales configurables: un proveedor real exige calibrarlos por institución. */
const livenessMin = () => number('BIOMETRIC_LIVENESS_MIN', 75, 100);
const matchMin = () => number('BIOMETRIC_MATCH_MIN', 75, 100);
const maxAttempts = () => number('BIOMETRIC_MAX_ATTEMPTS', 3, 20);

/** Resultado de contrastar una captura con su referencia. */
export interface BiometricEvaluation extends BiometricAssessment {
  passed: boolean;
  /** Qué umbral no se alcanzó; null si pasó. */
  failureReason: string | null;
}

@Injectable()
export class BiometricsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BIOMETRIC_PROVIDER) private readonly provider: BiometricProvider,
  ) {}

  /** Contrasta una captura con una imagen de referencia y aplica los umbrales. */
  async evaluate(
    selfie: Buffer,
    reference: Buffer,
  ): Promise<BiometricEvaluation> {
    const assessment = await this.provider.assess({ selfie, reference });
    const failureReason = this.rejectionReason(assessment);
    return { ...assessment, passed: failureReason === null, failureReason };
  }

  /**
   * Un intento de verificación de identidad del dueño de la solicitud. Compara la
   * captura con la cédula frontal; si pasa, la identidad queda verificada (la
   * inversión la aprueba un administrador). Cada intento queda registrado, y al
   * agotarlos la solicitud pasa a revisión manual.
   */
  async verify(applicationId: string, userId: string, dto: BiometricsDto) {
    const application = await this.loadPending(applicationId, userId);

    const uploaded = application.documentUrls as Record<string, string>;
    const missing = (
      application.investmentPlan.requiredDocuments as string[]
    ).filter((kind) => !uploaded[kind]);
    if (missing.length) {
      throw new BadRequestException(`Faltan documentos: ${missing.join(', ')}`);
    }

    const selfie = decodeImageBase64(dto.selfieBase64, 'selfieBase64');
    const reference = await this.readReference(applicationId);

    const limit = maxAttempts();
    const previous = await this.prisma.biometricVerification.count({
      where: { applicationId },
    });
    if (previous >= limit) {
      throw new HttpException(
        `Se agotaron los ${limit} intentos de verificación; la solicitud requiere revisión manual`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const evaluation = await this.evaluate(selfie, reference);
    const attempt = previous + 1;

    await this.prisma.biometricVerification
      .create({
        data: {
          applicationId,
          attempt,
          livenessScore: evaluation.livenessScore.toFixed(2),
          matchScore: evaluation.matchScore.toFixed(2),
          passed: evaluation.passed,
          failureReason: evaluation.failureReason,
          provider: evaluation.provider,
        },
      })
      .catch((error: unknown) => {
        // Choque con el índice único [applicationId, attempt]: otra petición
        // simultánea ya ocupó este número. Falla cerrado en vez de duplicar.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'Ya hay una verificación en curso para esta solicitud',
          );
        }
        throw error;
      });

    let biometricStatus: BiometricStatus = BiometricStatus.PENDING;
    if (evaluation.passed) {
      await this.markVerified(applicationId, selfie, evaluation.matchScore);
      biometricStatus = BiometricStatus.VERIFIED;
    } else if (attempt >= limit) {
      await this.prisma.investmentApplication.updateMany({
        where: { id: applicationId, biometricStatus: BiometricStatus.PENDING },
        data: { biometricStatus: BiometricStatus.FAILED },
      });
      biometricStatus = BiometricStatus.FAILED;
    }

    return {
      applicationId,
      attempt,
      passed: evaluation.passed,
      livenessScore: evaluation.livenessScore.toFixed(2),
      matchScore: evaluation.matchScore.toFixed(2),
      status: application.status,
      biometricStatus,
      remainingAttempts: limit - attempt,
      checks: {
        liveness:
          evaluation.livenessScore >= livenessMin() ? 'PASSED' : 'FAILED',
        faceMatch: evaluation.matchScore >= matchMin() ? 'MATCH' : 'NO_MATCH',
      },
      failureReason: evaluation.failureReason,
    };
  }

  /** Historial de intentos de una solicitud (datos personales: solo administradores). */
  async history(applicationId: string) {
    await this.prisma.investmentApplication.findUniqueOrThrow({
      where: { id: applicationId },
      select: { id: true },
    });
    return this.prisma.biometricVerification.findMany({
      where: { applicationId },
      orderBy: { attempt: 'asc' },
    });
  }

  private rejectionReason({
    livenessScore,
    matchScore,
  }: BiometricAssessment): string | null {
    const liveness = livenessMin();
    if (livenessScore < liveness) {
      return `Prueba de vida insuficiente (${livenessScore.toFixed(2)} < ${liveness})`;
    }
    const match = matchMin();
    if (matchScore < match) {
      return `La selfie no coincide con el documento (${matchScore.toFixed(2)} < ${match})`;
    }
    return null;
  }

  /**
   * Guarda la captura aprobada y marca la identidad como verificada en una sola
   * sentencia condicionada: dos intentos simultáneos no verifican dos veces.
   */
  private async markVerified(
    applicationId: string,
    selfie: Buffer,
    matchScore: number,
  ) {
    await saveFile(
      onboardingDocumentPath(applicationId, SELFIE_DOCUMENT),
      selfie,
    );
    const url = `/api/onboarding/applications/${applicationId}/documents/${SELFIE_DOCUMENT}`;
    const updated = await this.prisma.$executeRaw`
      UPDATE "InvestmentApplication"
      SET "biometricStatus" = 'VERIFIED',
          "biometricScore" = ${matchScore.toFixed(2)}::numeric,
          "documentUrls" = "documentUrls" || ${JSON.stringify({ [SELFIE_DOCUMENT]: url })}::jsonb,
          "updatedAt" = now()
      WHERE id = ${applicationId} AND "biometricStatus" = 'PENDING'`;
    if (updated === 0) {
      throw new ConflictException('La identidad ya fue verificada');
    }
  }

  /**
   * Solo el dueño opera sobre su solicitud; a cualquier otro se le responde como
   * si no existiera, para no confirmar identificadores ajenos.
   */
  private async loadPending(id: string, userId: string) {
    const application = await this.prisma.investmentApplication.findUnique({
      where: { id },
      include: {
        investmentPlan: { select: { requiredDocuments: true } },
      },
    });
    if (!application || application.userId !== userId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (application.status !== ApplicationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `La solicitud ya fue resuelta (${application.status})`,
      );
    }
    if (application.biometricStatus === BiometricStatus.VERIFIED) {
      throw new ConflictException('La identidad ya fue verificada');
    }
    return application;
  }

  private async readReference(applicationId: string) {
    const reference = await readFile(
      onboardingDocumentPath(applicationId, REFERENCE_DOCUMENT),
    ).catch(() => {
      throw new BadRequestException(
        `Cargue ${REFERENCE_DOCUMENT} antes de la verificación biométrica`,
      );
    });
    // Un PDF no tiene rostro que comparar: la cédula frontal debe ser una foto.
    assertFileKind(reference, ['png', 'jpg'], REFERENCE_DOCUMENT);
    return reference;
  }
}
