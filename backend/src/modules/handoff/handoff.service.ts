import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { hashRefreshToken } from '../../common/tokens.js';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { LivenessPurpose } from '../../generated/prisma/enums.js';
import { AuthService } from '../auth/auth.service.js';
import { LiveCaptureDto } from '../biometrics/biometrics.dto.js';
import { BiometricsService } from '../biometrics/biometrics.service.js';
import { IdentityService } from '../identity/identity.service.js';

/** Tiempo para escanear el QR y completar los gestos en el celular. */
const HANDOFF_TTL_MS = 10 * 60 * 1000;

const newSecret = () => randomBytes(32).toString('base64url');
const EXPIRED =
  'El código expiró o no es válido. Genera uno nuevo desde tu computadora.';

type Handoff = Awaited<
  ReturnType<PrismaService['biometricHandoff']['findUnique']>
>;

/**
 * Continuar en el celular: la computadora abre un traspaso y muestra un QR con
 * el token móvil. El celular hace la prueba de vida y el servidor ejecuta el
 * mismo flujo que si se hubiera hecho en la computadora (misma cuenta, mismos
 * intentos y reglas). La computadora consulta el resultado con un segundo
 * secreto que no viaja en el QR: quien fotografíe el código no obtiene nada.
 */
@Injectable()
export class HandoffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityService,
    private readonly biometrics: BiometricsService,
    private readonly auth: AuthService,
  ) {}

  /** Confirmación de identidad o verificación de solicitud de una cuenta con sesión. */
  async createForUser(
    userId: string,
    purpose: 'IDENTITY' | 'APPLICATION',
    applicationId?: string,
  ) {
    if (purpose === LivenessPurpose.IDENTITY) {
      const status = await this.identity.status(userId);
      if (status.status !== 'PENDING') {
        throw new BadRequestException(
          'Tu identidad no está pendiente de verificación',
        );
      }
      if (!status.hasDocument) {
        throw new BadRequestException(
          'Carga primero la foto del lado frontal de tu cédula',
        );
      }
    } else {
      const application = await this.prisma.investmentApplication.findUnique({
        where: { id: applicationId },
        select: { userId: true },
      });
      if (!application || application.userId !== userId) {
        throw new NotFoundException('Solicitud no encontrada');
      }
    }
    return this.create({ purpose, userId, applicationId });
  }

  /** Recuperación de clave: no revela si el correo existe (eso se sabe al verificar). */
  createForReset(email: string) {
    return this.create({ purpose: LivenessPurpose.PASSWORD_RESET, email });
  }

  /** Lo que ve el celular al abrir el QR, sin datos sensibles. */
  async mobileInfo(mobileToken: string) {
    const handoff = await this.byMobileToken(mobileToken);
    const user = handoff.userId
      ? await this.prisma.user.findUnique({
          where: { id: handoff.userId },
          select: { firstName: true },
        })
      : null;
    return {
      purpose: handoff.purpose,
      firstName: user?.firstName ?? null,
      completed: handoff.completedAt !== null,
      expiresAt: handoff.expiresAt,
    };
  }

  /**
   * El celular envía la prueba de vida y se ejecuta el flujo original. Si no pasa
   * el celular puede reintentar (con los mismos límites de intentos del flujo).
   */
  async verifyFromMobile(mobileToken: string, capture: LiveCaptureDto) {
    const handoff = await this.byMobileToken(mobileToken);
    if (handoff.completedAt) {
      throw new BadRequestException('Esta verificación ya se completó');
    }

    switch (handoff.purpose) {
      case LivenessPurpose.IDENTITY: {
        const result = await this.identity.verify(handoff.userId!, capture);
        if (result.passed)
          await this.complete(handoff.id, { status: result.status });
        return {
          passed: result.passed,
          failureReason: result.failureReason,
          remainingAttempts: result.remainingAttempts,
          locked: result.status === 'LOCKED',
        };
      }
      case LivenessPurpose.APPLICATION: {
        const result = await this.biometrics.verify(
          handoff.applicationId!,
          handoff.userId!,
          capture,
        );
        if (result.passed || result.biometricStatus === 'FAILED') {
          await this.complete(handoff.id, {
            passed: result.passed,
            matchScore: result.matchScore,
            biometricStatus: result.biometricStatus,
          });
        }
        return {
          passed: result.passed,
          failureReason: result.failureReason,
          remainingAttempts: result.remainingAttempts,
          locked: result.biometricStatus === 'FAILED',
        };
      }
      case LivenessPurpose.PASSWORD_RESET: {
        // Lanza 401 si el rostro no coincide: el celular lo muestra y reintenta.
        const reset = await this.auth.biometricResetVerify(
          handoff.email!,
          capture,
        );
        // El token de cambio de clave queda para la computadora; al celular no va.
        await this.complete(handoff.id, {
          resetToken: reset.resetToken,
          expiresAt: reset.expiresAt,
          matchScore: reset.matchScore,
        });
        return {
          passed: true,
          failureReason: null,
          remainingAttempts: null,
          locked: false,
        };
      }
    }
  }

  /**
   * Consulta de la computadora. En recuperación el token de cambio de clave se
   * entrega una sola vez y se borra del traspaso.
   */
  async poll(handoffId: string, pollToken: string) {
    const handoff = await this.prisma.biometricHandoff.findUnique({
      where: { id: handoffId },
    });
    if (!handoff || handoff.pollTokenHash !== hashRefreshToken(pollToken)) {
      throw new NotFoundException('Traspaso no encontrado');
    }
    if (!handoff.completedAt) {
      return {
        status: handoff.expiresAt <= new Date() ? 'EXPIRED' : 'PENDING',
        result: null,
      };
    }
    const result = handoff.result as Record<string, unknown> | null;
    if (
      handoff.purpose === LivenessPurpose.PASSWORD_RESET &&
      result?.resetToken
    ) {
      await this.prisma.biometricHandoff.update({
        where: { id: handoff.id },
        data: { result: { delivered: true } },
      });
    }
    return { status: 'COMPLETED', result };
  }

  private async create(data: {
    purpose: LivenessPurpose;
    userId?: string;
    applicationId?: string;
    email?: string;
  }) {
    // Limpieza oportunista de traspasos vencidos.
    await this.prisma.biometricHandoff.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - HANDOFF_TTL_MS) } },
    });
    const mobileToken = newSecret();
    const pollToken = newSecret();
    const handoff = await this.prisma.biometricHandoff.create({
      data: {
        ...data,
        mobileTokenHash: hashRefreshToken(mobileToken),
        pollTokenHash: hashRefreshToken(pollToken),
        expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
      },
    });
    return {
      handoffId: handoff.id,
      mobileToken,
      pollToken,
      expiresAt: handoff.expiresAt,
    };
  }

  private async byMobileToken(
    mobileToken: string,
  ): Promise<NonNullable<Handoff>> {
    const handoff = await this.prisma.biometricHandoff.findUnique({
      where: { mobileTokenHash: hashRefreshToken(mobileToken) },
    });
    if (!handoff || handoff.expiresAt <= new Date()) {
      throw new GoneException(EXPIRED);
    }
    return handoff;
  }

  private complete(id: string, result: Prisma.InputJsonObject) {
    return this.prisma.biometricHandoff.update({
      where: { id },
      data: { completedAt: new Date(), result },
    });
  }
}
