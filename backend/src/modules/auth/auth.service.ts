import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  decodeImageBase64,
  onboardingDocumentPath,
} from '../../common/http.js';
import {
  accessTtlSeconds,
  hashRefreshToken,
  newRefreshToken,
  refreshTtlSeconds,
  signAccessToken,
} from '../../common/tokens.js';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma, type User } from '../../generated/prisma/client.js';
import { BiometricStatus, UserRole } from '../../generated/prisma/enums.js';
import {
  BiometricsService,
  SELFIE_DOCUMENT,
} from '../biometrics/biometrics.service.js';
import {
  ChangePasswordDto,
  CreateUserAdminDto,
  LoginDto,
  RegisterDto,
} from './auth.dto.js';
import { hashPassword, verifyPassword } from './password.js';

/** Datos del cliente que se archivan con la sesión para auditoría. */
export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

/** Mismo texto para correo inexistente y contraseña errónea: no se filtra cuál falló. */
const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos';
const INVALID_SESSION = 'Sesión inválida';
const DISABLED_ACCOUNT = 'La cuenta está desactivada';

/** Mismo texto para correo inexistente, cuenta sin verificación previa o rostro distinto. */
const RESET_FAILED =
  'No fue posible verificar tu identidad. La recuperación por biometría solo está disponible si ya verificaste tu rostro en una solicitud.';
const RESET_EXPIRED = 'El token de recuperación es inválido o expiró';
const RESET_TTL_MS = 15 * 60 * 1000;
const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_MAX_FAILURES = 5;

const PUBLIC_FIELDS = [
  'id',
  'email',
  'fullName',
  'idNumber',
  'firstName',
  'lastName',
  'phone',
  'address',
  'role',
  'isActive',
  'createdAt',
] as const;

/** `actorId` es null cuando se entra con la cabecera x-admin-key (sin sesión). */
const assertNotSelf = (
  actorId: string | null,
  userId: string,
  action: string,
) => {
  if (actorId === userId) {
    throw new ForbiddenException(
      `No puedes ${action}; pídeselo a otro administrador`,
    );
  }
};

/** Nunca devolver `passwordHash` ni `updatedAt` al cliente. */
const toPublicUser = (user: User) =>
  Object.fromEntries(
    PUBLIC_FIELDS.map((field) => [field, user[field]]),
  ) as Pick<User, (typeof PUBLIC_FIELDS)[number]>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly biometrics: BiometricsService,
  ) {}

  /**
   * Contrasta una captura en vivo con la selfie que ya verificó la identidad del
   * titular en una solicitud. Si pasa, emite un token de un solo uso para fijar
   * la nueva clave. Toda falla responde igual: no se revela si el correo existe
   * ni si la cuenta tiene una verificación previa.
   */
  async biometricResetVerify(email: string, selfieBase64: string) {
    const selfie = decodeImageBase64(selfieBase64, 'selfieBase64');
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });
    const reference = user?.isActive
      ? await this.verifiedSelfie(user.id)
      : null;
    if (!user || !reference) throw new UnauthorizedException(RESET_FAILED);

    const failures = await this.prisma.biometricPasswordReset.count({
      where: {
        userId: user.id,
        passed: false,
        createdAt: { gte: new Date(Date.now() - RESET_WINDOW_MS) },
      },
    });
    if (failures >= RESET_MAX_FAILURES) {
      throw new HttpException(
        'Demasiados intentos fallidos. Espera una hora antes de volver a intentar.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const evaluation = await this.biometrics.evaluate(selfie, reference);
    const resetToken = evaluation.passed ? newRefreshToken() : null;
    const expiresAt = resetToken ? new Date(Date.now() + RESET_TTL_MS) : null;
    await this.prisma.biometricPasswordReset.create({
      data: {
        userId: user.id,
        passed: evaluation.passed,
        livenessScore: evaluation.livenessScore.toFixed(2),
        matchScore: evaluation.matchScore.toFixed(2),
        provider: evaluation.provider,
        tokenHash: resetToken && hashRefreshToken(resetToken),
        expiresAt,
      },
    });
    if (!resetToken) throw new UnauthorizedException(RESET_FAILED);
    return {
      resetToken,
      expiresAt,
      matchScore: evaluation.matchScore.toFixed(2),
    };
  }

  /** Canjea el token de recuperación (una sola vez) y cierra todas las sesiones. */
  async biometricResetConfirm(resetToken: string, newPassword: string) {
    const reset = await this.prisma.biometricPasswordReset.findUnique({
      where: { tokenHash: hashRefreshToken(resetToken) },
    });
    if (!reset?.expiresAt || reset.usedAt || reset.expiresAt <= new Date()) {
      throw new UnauthorizedException(RESET_EXPIRED);
    }
    // Condicionado: dos canjes simultáneos del mismo token no cambian la clave dos veces.
    const { count } = await this.prisma.biometricPasswordReset.updateMany({
      where: { id: reset.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) throw new UnauthorizedException(RESET_EXPIRED);

    await this.prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await this.logoutAll(reset.userId);
  }

  async register(dto: RegisterDto, context: SessionContext) {
    const user = await this.createUser(dto, UserRole.CUSTOMER);
    return this.issueSession(user, randomUUID(), context);
  }

  async login(dto: LoginDto, context: SessionContext) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      // Derivación desechada: responder tarda lo mismo exista o no el correo.
      await hashPassword(dto.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    if (!(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    // Después de validar la contraseña: el estado de la cuenta solo lo ve su dueño.
    if (!user.isActive) throw new ForbiddenException(DISABLED_ACCOUNT);

    await this.pruneExpired(user.id);
    return this.issueSession(user, randomUUID(), context);
  }

  /**
   * Rotación: el refresh token se canjea por uno nuevo de la misma familia y el
   * anterior queda marcado. Si alguien reusa uno ya rotado —señal de token robado—
   * se revoca la familia completa y hay que volver a iniciar sesión.
   */
  async refresh(token: string | undefined, context: SessionContext) {
    if (!token) throw new UnauthorizedException('No hay sesión que renovar');
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: hashRefreshToken(token) },
      include: { user: true },
    });
    if (!session) throw new UnauthorizedException(INVALID_SESSION);

    if (session.rotatedAt || session.revokedAt) {
      await this.revokeFamily(session.familyId);
      throw new UnauthorizedException(
        'Sesión revocada: ese token de renovación ya había sido usado',
      );
    }
    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException('La sesión expiró');
    }
    if (!session.user.isActive) throw new ForbiddenException(DISABLED_ACCOUNT);

    // Condicionado al estado: ante dos renovaciones simultáneas solo una gana, y
    // la perdedora falla sin revocar la familia (un doble clic no cierra la sesión).
    const { count } = await this.prisma.authSession.updateMany({
      where: { id: session.id, rotatedAt: null, revokedAt: null },
      data: { rotatedAt: new Date() },
    });
    if (count === 0) throw new UnauthorizedException(INVALID_SESSION);

    return this.issueSession(session.user, session.familyId, context);
  }

  /** Idempotente: sin cookie o con una ya revocada igual responde 204. */
  async logout(token: string | undefined) {
    if (!token) return;
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: hashRefreshToken(token) },
      select: { familyId: true },
    });
    if (session) await this.revokeFamily(session.familyId);
  }

  /** Cierra la sesión en todos los dispositivos. */
  async logoutAll(userId: string) {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  me(userId: string) {
    return this.prisma.user
      .findUniqueOrThrow({ where: { id: userId } })
      .then(toPublicUser);
  }

  /** Cambiar la contraseña invalida todas las sesiones y abre una nueva aquí. */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    context: SessionContext,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!(await verifyPassword(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('La contraseña actual no coincide');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(dto.newPassword) },
    });
    await this.logoutAll(userId);
    return this.issueSession(updated, randomUUID(), context);
  }

  /** Emite access token + refresh token nuevos y registra la sesión. */
  private async issueSession(
    user: User,
    familyId: string,
    context: SessionContext,
  ) {
    const refreshToken = newRefreshToken();
    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + refreshTtlSeconds() * 1000),
        userAgent: context.userAgent?.slice(0, 255),
        ipAddress: context.ipAddress,
      },
    });
    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      accessToken,
      refreshToken,
      session: {
        user: toPublicUser(user),
        accessTokenExpiresIn: accessTtlSeconds(),
      },
    };
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Selfie aprobada más reciente de la cuenta, o null si nunca verificó su rostro. */
  private async verifiedSelfie(userId: string) {
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

  /** Lista todos los usuarios para la gestión de administración. */
  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        idNumber: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });
    return users;
  }

  /**
   * Cambia el rol de otro usuario. Nadie cambia el suyo: así un administrador no
   * se quita el acceso por error ni deja el sistema sin administradores.
   */
  async updateUserRole(actorId: string | null, userId: string, role: UserRole) {
    assertNotSelf(actorId, userId, 'cambiar tu propio rol');
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    return toPublicUser(user);
  }

  /** Activa o desactiva otra cuenta; desactivarla cierra todas sus sesiones. */
  async setUserActive(
    actorId: string | null,
    userId: string,
    isActive: boolean,
  ) {
    assertNotSelf(actorId, userId, 'desactivar tu propia cuenta');
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
    if (!isActive) await this.logoutAll(userId);
    return toPublicUser(user);
  }

  /** Alta desde el panel administrativo, con el rol indicado (CUSTOMER por defecto). */
  async adminCreateUser(dto: CreateUserAdminDto) {
    return toPublicUser(
      await this.createUser(dto, dto.role ?? UserRole.CUSTOMER),
    );
  }

  private async createUser(dto: RegisterDto, role: UserRole) {
    return this.prisma.user
      .create({
        data: {
          email: dto.email,
          fullName: `${dto.firstName} ${dto.lastName}`,
          idNumber: dto.idNumber,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          address: dto.address || null,
          passwordHash: await hashPassword(dto.password),
          role,
        },
      })
      .catch((error: unknown) => {
        // P2002 = violación de índice único: el correo o la cédula ya tienen cuenta.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'Ya existe una cuenta con ese correo o esa cédula',
          );
        }
        throw error;
      });
  }

  /** ponytail: limpieza oportunista; con volumen conviene una tarea programada. */
  private async pruneExpired(userId: string) {
    await this.prisma.authSession.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });
  }
}
