import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import {
  assertFileKind,
  onboardingDocumentPath,
  saveFile,
  userDocumentPath,
} from '../../common/http.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  BiometricStatus,
  IdentityStatus,
  LivenessPurpose,
} from '../../generated/prisma/enums.js';
import { LiveCaptureDto } from '../biometrics/biometrics.dto.js';
import {
  BiometricsService,
  SELFIE_DOCUMENT,
} from '../biometrics/biometrics.service.js';

/** Foto de la cédula frontal cargada en el registro: la referencia del enrolamiento. */
const ID_FRONT = 'idFront';
/** Selfie que confirmó la identidad: referencia para recuperar la clave. */
const REFERENCE_SELFIE = 'selfie';

const maxAttempts = () => {
  const raw = process.env.IDENTITY_MAX_ATTEMPTS;
  if (raw === undefined || raw === '') return 5;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    throw new ServiceUnavailableException(
      'IDENTITY_MAX_ATTEMPTS debe ser un entero entre 1 y 20',
    );
  }
  return parsed;
};

const EPOCH = new Date(0);

/**
 * Confirmación de identidad de la cuenta: el cliente carga su cédula y se toma
 * una selfie en vivo. Si el rostro coincide, la cuenta queda verificada y esa
 * selfie pasa a ser su referencia facial (la usa la recuperación de clave).
 * Mientras tanto la cuenta existe pero no puede operar (ver IdentityVerifiedGuard).
 */
@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly biometrics: BiometricsService,
  ) {}

  async status(userId: string) {
    const user = await this.load(userId);
    return this.describe(user);
  }

  async uploadDocument(userId: string, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Adjunte la foto en el campo "idFront"');
    }
    const user = await this.load(userId);
    this.assertPending(user.identityStatus);
    // La cédula es la referencia facial: tiene que ser una foto, no un PDF.
    assertFileKind(file.buffer, ['png', 'jpg'], ID_FRONT);
    await this.biometrics.inspectReference(file.buffer);
    await saveFile(userDocumentPath(userId, ID_FRONT), file.buffer);
    return this.describe(user);
  }

  async verify(userId: string, capture: LiveCaptureDto) {
    const user = await this.load(userId);
    this.assertPending(user.identityStatus);
    const document = await readFile(userDocumentPath(userId, ID_FRONT)).catch(
      () => {
        throw new BadRequestException(
          'Carga primero la foto del lado frontal de tu cédula',
        );
      },
    );

    const limit = maxAttempts();
    const used = await this.attemptsUsed(user);
    if (used >= limit) {
      await this.lock(userId);
      throw new HttpException(
        'Se agotaron los intentos de verificación. Un asesor revisará tu cuenta.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // El DTO exige consent: true; se registra la primera vez que se acepta.
    if (!user.biometricConsentAt) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { biometricConsentAt: new Date() },
      });
    }

    // Si la captura no tiene un rostro válido el proveedor responde 400 y el
    // intento no cuenta: es un problema de la foto, no un rostro distinto.
    const evaluation = await this.biometrics.evaluate(
      LivenessPurpose.IDENTITY,
      capture,
      document,
    );
    await this.prisma.identityVerification.create({
      data: {
        userId,
        livenessScore: evaluation.livenessScore.toFixed(2),
        matchScore: evaluation.matchScore.toFixed(2),
        passed: evaluation.passed,
        failureReason: evaluation.failureReason,
        provider: evaluation.provider,
      },
    });

    if (evaluation.passed) {
      await saveFile(
        userDocumentPath(userId, REFERENCE_SELFIE),
        evaluation.selfie,
      );
      const { count } = await this.prisma.user.updateMany({
        where: { id: userId, identityStatus: IdentityStatus.PENDING },
        data: {
          identityStatus: IdentityStatus.VERIFIED,
          identityVerifiedAt: new Date(),
          identityScore: evaluation.matchScore.toFixed(2),
        },
      });
      if (count === 0) {
        throw new ConflictException('La identidad ya fue verificada');
      }
    } else if (used + 1 >= limit) {
      await this.lock(userId);
    }

    return {
      ...(await this.describe(await this.load(userId))),
      passed: evaluation.passed,
      matchScore: evaluation.matchScore.toFixed(2),
      livenessScore: evaluation.livenessScore.toFixed(2),
      failureReason: evaluation.failureReason,
    };
  }

  /** Un administrador revisó el caso: la cuenta vuelve a tener todos sus intentos. */
  async unlock(userId: string) {
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, identityStatus: IdentityStatus.LOCKED },
      data: {
        identityStatus: IdentityStatus.PENDING,
        identityUnlockedAt: new Date(),
      },
    });
    if (count === 0) {
      throw new ConflictException(
        'La verificación de la cuenta no está bloqueada',
      );
    }
    return this.status(userId);
  }

  /**
   * Referencia facial de una cuenta verificada: la selfie del registro o, en
   * cuentas anteriores al enrolamiento, la de su última solicitud verificada.
   */
  async referenceFor(userId: string): Promise<Buffer | null> {
    const own = await readFile(
      userDocumentPath(userId, REFERENCE_SELFIE),
    ).catch(() => null);
    if (own) return own;
    const application = await this.prisma.investmentApplication.findFirst({
      where: { userId, biometricStatus: BiometricStatus.VERIFIED },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    if (!application) return null;
    return readFile(
      onboardingDocumentPath(application.id, SELFIE_DOCUMENT),
    ).catch(() => null);
  }

  private load(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        identityStatus: true,
        identityVerifiedAt: true,
        identityUnlockedAt: true,
        biometricConsentAt: true,
      },
    });
  }

  private attemptsUsed(user: { id: string; identityUnlockedAt: Date | null }) {
    return this.prisma.identityVerification.count({
      where: {
        userId: user.id,
        createdAt: { gt: user.identityUnlockedAt ?? EPOCH },
      },
    });
  }

  private async describe(user: Awaited<ReturnType<IdentityService['load']>>) {
    const limit = maxAttempts();
    const [used, hasDocument] = await Promise.all([
      this.attemptsUsed(user),
      readFile(userDocumentPath(user.id, ID_FRONT)).then(
        () => true,
        () => false,
      ),
    ]);
    return {
      status: user.identityStatus,
      verifiedAt: user.identityVerifiedAt,
      hasDocument,
      remainingAttempts: Math.max(0, limit - used),
      maxAttempts: limit,
    };
  }

  private assertPending(status: IdentityStatus) {
    if (status === IdentityStatus.VERIFIED) {
      throw new ConflictException('Tu identidad ya está verificada');
    }
    if (status === IdentityStatus.LOCKED) {
      throw new HttpException(
        'Se agotaron los intentos de verificación. Un asesor revisará tu cuenta.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async lock(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId, identityStatus: IdentityStatus.PENDING },
      data: { identityStatus: IdentityStatus.LOCKED },
    });
  }
}
