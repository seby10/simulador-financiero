import {
  BadRequestException,
  GoneException,
  HttpException,
  Injectable,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  concat,
  defer,
  distinctUntilChanged,
  filter,
  interval,
  map,
  merge,
  Observable,
  Subject,
  switchMap,
  takeWhile,
} from 'rxjs';
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
/** Sin latidos del celular por este tiempo, el proceso se da por interrumpido. */
const HEARTBEAT_TIMEOUT_MS = 8_000;
/** Cada cuánto se revisa si el celular dejó de latir. */
const WATCHDOG_MS = 2_000;

const newSecret = () => randomBytes(32).toString('base64url');
const EXPIRED =
  'El código expiró o no es válido. Genera uno nuevo desde tu computadora.';

/** Lo que el celular informa que está haciendo. */
export const MOBILE_STAGES = ['CONNECTED', 'CAPTURING', 'VERIFYING'] as const;
export type MobileStage = (typeof MOBILE_STAGES)[number];

/** Lo que ve la computadora, en tiempo real. */
export type LiveStatus =
  'WAITING' | MobileStage | 'INTERRUPTED' | 'COMPLETED' | 'EXPIRED';

export interface LiveState {
  status: LiveStatus;
  /** Motivo del último intento fallido en el celular, si lo hubo. */
  lastFailure?: string | null;
}

type Handoff = NonNullable<
  Awaited<ReturnType<PrismaService['biometricHandoff']['findUnique']>>
>;

/** Estado del traspaso según la base: completado, vencido, esperando o qué hace el celular. */
function liveStatus(handoff: Handoff, now = Date.now()): LiveStatus {
  if (handoff.completedAt) return 'COMPLETED';
  if (handoff.expiresAt.getTime() <= now) return 'EXPIRED';
  if (!handoff.mobileStage) return 'WAITING';
  if (handoff.mobileStage === 'LEFT') return 'INTERRUPTED';
  const seen = handoff.mobileSeenAt?.getTime() ?? 0;
  // Mientras el servidor compara el rostro el celular no late: no es un abandono.
  if (
    handoff.mobileStage !== 'VERIFYING' &&
    now - seen > HEARTBEAT_TIMEOUT_MS
  ) {
    return 'INTERRUPTED';
  }
  return handoff.mobileStage as MobileStage;
}

/**
 * Continuar en el celular: la computadora abre un traspaso y muestra un QR con
 * el token móvil. El celular hace la prueba de vida y el servidor ejecuta el
 * mismo flujo que si se hubiera hecho en la computadora (misma cuenta, mismos
 * intentos y reglas). La computadora recibe en vivo lo que pasa en el celular
 * (eventos del servidor) y consulta el resultado con un segundo secreto que no
 * viaja en el QR: quien fotografíe el código no obtiene nada.
 *
 * ponytail: los avisos en vivo viajan por memoria del proceso; con varias
 * instancias del backend habría que pasarlos por Redis o Postgres LISTEN/NOTIFY.
 * La base sigue siendo la fuente de verdad (el vigilante la consulta).
 */
@Injectable()
export class HandoffService {
  private readonly changes = new Subject<{
    id: string;
    lastFailure?: string;
  }>();

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

  /** El celular abrió el QR: la computadora se entera al instante. */
  async mobileInfo(mobileToken: string) {
    const handoff = await this.byMobileToken(mobileToken);
    if (!handoff.completedAt) await this.touch(handoff.id, 'CONNECTED');
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

  /** Latido del celular con la etapa en la que está. */
  async heartbeat(mobileToken: string, stage: MobileStage) {
    const handoff = await this.byMobileToken(mobileToken);
    if (!handoff.completedAt) await this.touch(handoff.id, stage);
  }

  /** El celular cerró o abandonó la página. */
  async leave(mobileToken: string) {
    const handoff = await this.byMobileToken(mobileToken);
    if (!handoff.completedAt) await this.touch(handoff.id, 'LEFT');
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
    await this.touch(handoff.id, 'VERIFYING');
    try {
      const outcome = await this.runFlow(handoff, capture);
      if (!outcome.passed && !outcome.locked) {
        await this.touch(
          handoff.id,
          'CAPTURING',
          outcome.failureReason ?? undefined,
        );
      }
      return outcome;
    } catch (error) {
      // La computadora se entera del intento fallido; el celular reintenta.
      const reason =
        error instanceof HttpException ? error.message : 'Error inesperado';
      await this.touch(handoff.id, 'CAPTURING', reason);
      throw error;
    }
  }

  private async runFlow(handoff: Handoff, capture: LiveCaptureDto) {
    switch (handoff.purpose) {
      case LivenessPurpose.IDENTITY: {
        const result = await this.identity.verify(handoff.userId!, capture);
        const locked = result.status === 'LOCKED';
        if (result.passed || locked) {
          await this.complete(handoff.id, {
            passed: result.passed,
            status: result.status,
          });
        }
        return {
          passed: result.passed,
          failureReason: result.failureReason,
          remainingAttempts: result.remainingAttempts,
          locked,
        };
      }
      case LivenessPurpose.APPLICATION: {
        const result = await this.biometrics.verify(
          handoff.applicationId!,
          handoff.userId!,
          capture,
        );
        const locked = result.biometricStatus === 'FAILED';
        if (result.passed || locked) {
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
          locked,
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
          passed: true,
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
   * Consulta de la computadora (respaldo de los eventos y entrega del resultado).
   * En recuperación el token de cambio de clave se entrega una sola vez.
   */
  async poll(handoffId: string, pollToken: string) {
    const handoff = await this.byPollToken(handoffId, pollToken);
    const status = liveStatus(handoff);
    if (status !== 'COMPLETED') return { status, result: null };
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
    return { status, result };
  }

  /**
   * Eventos en vivo para la computadora: el estado actual al conectarse, cada
   * cambio que informa el celular y un vigilante que detecta cuando deja de latir.
   * Termina al completarse o vencer (el resultado se retira con `poll`).
   */
  async events(
    handoffId: string,
    pollToken: string,
  ): Promise<Observable<MessageEvent>> {
    await this.byPollToken(handoffId, pollToken);
    const read = (lastFailure?: string) =>
      defer(async (): Promise<LiveState> => {
        const handoff = await this.prisma.biometricHandoff.findUniqueOrThrow({
          where: { id: handoffId },
        });
        return {
          status: liveStatus(handoff),
          lastFailure: lastFailure ?? null,
        };
      });

    const updates = merge(
      this.changes.pipe(
        filter((change) => change.id === handoffId),
        map((change) => change.lastFailure),
      ),
      interval(WATCHDOG_MS).pipe(map(() => undefined)),
    ).pipe(switchMap((lastFailure) => read(lastFailure)));

    return concat(read(), updates).pipe(
      // El vigilante repite el mismo estado cada 2 s: solo se envían cambios.
      distinctUntilChanged(
        (a, b) => a.status === b.status && a.lastFailure === b.lastFailure,
      ),
      takeWhile(
        (state) => state.status !== 'COMPLETED' && state.status !== 'EXPIRED',
        true,
      ),
      map((state): MessageEvent => ({ data: state })),
    );
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

  /** Registra qué hace el celular y avisa en vivo a la computadora. */
  private async touch(
    id: string,
    stage: MobileStage | 'LEFT',
    lastFailure?: string,
  ) {
    await this.prisma.biometricHandoff.update({
      where: { id },
      data: { mobileStage: stage, mobileSeenAt: new Date() },
    });
    this.changes.next({ id, lastFailure });
  }

  private async byMobileToken(mobileToken: string): Promise<Handoff> {
    const handoff = await this.prisma.biometricHandoff.findUnique({
      where: { mobileTokenHash: hashRefreshToken(mobileToken) },
    });
    if (!handoff || handoff.expiresAt <= new Date()) {
      throw new GoneException(EXPIRED);
    }
    return handoff;
  }

  private async byPollToken(handoffId: string, pollToken: string) {
    const handoff = await this.prisma.biometricHandoff.findUnique({
      where: { id: handoffId },
    });
    if (!handoff || handoff.pollTokenHash !== hashRefreshToken(pollToken)) {
      throw new NotFoundException('Traspaso no encontrado');
    }
    return handoff;
  }

  private async complete(id: string, result: Prisma.InputJsonObject) {
    await this.prisma.biometricHandoff.update({
      where: { id },
      data: { completedAt: new Date(), result },
    });
    this.changes.next({ id });
  }
}
