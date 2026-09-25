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
  LivenessPurpose,
} from '../../generated/prisma/enums.js';
import {
  BIOMETRIC_PROVIDER,
  type BiometricAssessment,
  type BiometricProvider,
} from './biometrics.provider.js';
import { BiometricsDto, LiveCaptureDto } from './biometrics.dto.js';
import {
  CHALLENGE_LABELS,
  CHALLENGES,
  type Challenge,
  drawChallenges,
} from './liveness.js';

/** Tiempo para completar los gestos: suficiente para hacerlos, corto para reusar. */
const LIVENESS_TTL_MS = 3 * 60 * 1000;

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
  /** Fotograma de frente: el que se guarda como referencia si la verificación pasa. */
  selfie: Buffer;
}

@Injectable()
export class BiometricsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BIOMETRIC_PROVIDER) private readonly provider: BiometricProvider,
  ) {}

  /** Abre una sesión de prueba de vida: dos gestos al azar, un solo uso, 3 minutos. */
  async createLivenessSession(purpose: LivenessPurpose) {
    // Limpieza oportunista de sesiones vencidas.
    await this.prisma.livenessSession.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - LIVENESS_TTL_MS) } },
    });
    const session = await this.prisma.livenessSession.create({
      data: {
        purpose,
        challenges: drawChallenges(),
        expiresAt: new Date(Date.now() + LIVENESS_TTL_MS),
      },
    });
    return {
      sessionId: session.id,
      challenges: session.challenges as Challenge[],
      expiresAt: session.expiresAt,
      instructions: (session.challenges as Challenge[]).map(
        (c) => CHALLENGE_LABELS[c],
      ),
    };
  }

  /**
   * Revisa al cargarla que en la foto de la cédula se encuentra el retrato, para
   * pedir otra foto de inmediato y no al final de la verificación facial.
   */
  async inspectReference(reference: Buffer) {
    await this.provider.inspectReference?.(reference);
  }

  /**
   * Consume la sesión de prueba de vida, contrasta los fotogramas con la
   * referencia y aplica los umbrales. La sesión se gasta aunque la captura
   * falle: cada intento necesita gestos nuevos.
   */
  async evaluate(
    purpose: LivenessPurpose,
    capture: LiveCaptureDto,
    reference: Buffer,
  ): Promise<BiometricEvaluation> {
    const challenges = await this.consumeSession(
      purpose,
      capture.livenessSessionId,
    );
    // Uno de frente, uno por gesto y, opcionalmente, uno de cierre otra vez de frente.
    const expected = challenges.length + 1;
    if (
      capture.frames.length !== expected &&
      capture.frames.length !== expected + 1
    ) {
      throw new BadRequestException(
        `Se esperaban ${expected} o ${expected + 1} fotogramas: uno de frente, uno por cada gesto y uno de cierre opcional`,
      );
    }
    const frames = capture.frames.map((frame, i) =>
      decodeImageBase64(frame, `frames[${i}]`),
    );
    const assessment = await this.provider.assess({
      frames,
      challenges,
      reference,
    });
    const failureReason = this.rejectionReason(assessment);
    return {
      ...assessment,
      passed: failureReason === null,
      failureReason,
      selfie: frames[0],
    };
  }

  private async consumeSession(purpose: LivenessPurpose, sessionId: string) {
    const session = await this.prisma.livenessSession.findUnique({
      where: { id: sessionId },
    });
    // Condicionado: dos envíos simultáneos de la misma sesión no pasan ambos.
    const { count } = await this.prisma.livenessSession.updateMany({
      where: {
        id: sessionId,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (!session || count === 0) {
      throw new BadRequestException(
        'La sesión de verificación expiró o ya se usó. Inicia la verificación de nuevo.',
      );
    }
    return session.challenges.filter((c): c is Challenge =>
      (CHALLENGES as readonly string[]).includes(c),
    );
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

    const evaluation = await this.evaluate(
      LivenessPurpose.APPLICATION,
      dto,
      reference,
    );
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
      await this.markVerified(
        applicationId,
        evaluation.selfie,
        evaluation.matchScore,
      );
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
    livenessFailure,
    matchScore,
  }: BiometricAssessment): string | null {
    const liveness = livenessMin();
    if (livenessScore < liveness) {
      return (
        livenessFailure ??
        `Prueba de vida insuficiente (${livenessScore.toFixed(2)} < ${liveness})`
      );
    }
    const match = matchMin();
    if (matchScore < match) {
      // El puntaje queda guardado para el asesor; a la persona se le dice qué hacer.
      return 'Tu rostro no coincide lo suficiente con la foto de tu cédula. Busca buena luz de frente, quítate gafas o gorra y, si la foto de la cédula salió borrosa o con reflejos, vuelve a cargarla.';
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
