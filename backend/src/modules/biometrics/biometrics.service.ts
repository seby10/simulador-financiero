import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { assertFileKind, onboardingDocumentPath, saveFile } from '../../common/http.js';
import { PrismaService } from '../../database/prisma.service.js';
import { ApplicationStatus } from '../../generated/prisma/enums.js';
import {
  BIOMETRIC_PROVIDER,
  type BiometricProvider,
} from './biometrics.provider.js';
import { BiometricsDto } from './biometrics.dto.js';

/** Documento contra el que se compara la selfie. */
const REFERENCE_DOCUMENT = 'idFront';

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

const planSummary = { select: { id: true, name: true, tea: true } } as const;

@Injectable()
export class BiometricsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BIOMETRIC_PROVIDER) private readonly provider: BiometricProvider,
  ) {}

  /**
   * Un intento de verificación: valida la captura, la contrasta con el documento
   * y aprueba la solicitud solo si ambos puntajes superan su umbral. Cada intento
   * queda registrado, pase o no.
   */
  async verify(applicationId: string, dto: BiometricsDto) {
    const application = await this.loadPending(applicationId);

    const uploaded = application.documentUrls as Record<string, string>;
    const missing = (
      application.investmentPlan.requiredDocuments as string[]
    ).filter((kind) => !uploaded[kind]);
    if (missing.length) {
      throw new BadRequestException(`Faltan documentos: ${missing.join(', ')}`);
    }

    const base64 = dto.selfieBase64.replace(/^data:image\/[a-z]+;base64,/i, '');
    const selfie = Buffer.from(base64, 'base64');
    assertFileKind(selfie, ['png', 'jpg'], 'selfieBase64');
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

    const assessment = await this.provider.assess({ selfie, reference });
    const failureReason = this.rejectionReason(assessment);
    const passed = failureReason === null;
    const attempt = previous + 1;

    await this.prisma.biometricVerification
      .create({
        data: {
          applicationId,
          attempt,
          livenessScore: assessment.livenessScore.toFixed(2),
          matchScore: assessment.matchScore.toFixed(2),
          passed,
          failureReason,
          provider: assessment.provider,
        },
      })
      .catch(() => {
        // Choque con el índice único [applicationId, attempt]: otra petición
        // simultánea ya ocupó este número. Falla cerrado en vez de duplicar.
        throw new ConflictException(
          'Ya hay una verificación en curso para esta solicitud',
        );
      });

    if (passed) {
      await saveFile(onboardingDocumentPath(applicationId, 'selfie'), selfie);
      await this.prisma.$executeRaw`
        UPDATE "InvestmentApplication"
        SET "documentUrls" = "documentUrls" || ${JSON.stringify({ selfie: `/api/onboarding/applications/${applicationId}/documents/selfie` })}::jsonb
        WHERE id = ${applicationId}`;
    }

    const status = passed
      ? await this.approve(applicationId, assessment.matchScore)
      : application.status;

    return {
      applicationId,
      attempt,
      passed,
      livenessScore: assessment.livenessScore.toFixed(2),
      matchScore: assessment.matchScore.toFixed(2),
      status,
      remainingAttempts: limit - attempt,
      checks: {
        liveness:
          assessment.livenessScore >= livenessMin() ? 'PASSED' : 'FAILED',
        faceMatch: assessment.matchScore >= matchMin() ? 'MATCH' : 'NO_MATCH',
      },
      failureReason,
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
  }: {
    livenessScore: number;
    matchScore: number;
  }): string | null {
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

  /** Condicionado al estado: dos aprobaciones simultáneas no aprueban dos veces. */
  private async approve(applicationId: string, matchScore: number) {
    const { count } = await this.prisma.investmentApplication.updateMany({
      where: { id: applicationId, status: ApplicationStatus.PENDING_REVIEW },
      data: {
        biometricScore: matchScore.toFixed(2),
        status: ApplicationStatus.APPROVED,
      },
    });
    if (count === 0) {
      throw new ConflictException('La solicitud ya fue resuelta');
    }
    return ApplicationStatus.APPROVED;
  }

  private async loadPending(id: string) {
    const application =
      await this.prisma.investmentApplication.findUniqueOrThrow({
        where: { id },
        include: {
          investmentPlan: {
            select: { ...planSummary.select, requiredDocuments: true },
          },
        },
      });
    if (application.status !== ApplicationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `La solicitud ya fue resuelta (${application.status})`,
      );
    }
    return application;
  }

  private readReference(applicationId: string) {
    return readFile(
      onboardingDocumentPath(applicationId, REFERENCE_DOCUMENT),
    ).catch(() => {
      throw new BadRequestException(
        `Cargue ${REFERENCE_DOCUMENT} antes de la verificación biométrica`,
      );
    });
  }
}
