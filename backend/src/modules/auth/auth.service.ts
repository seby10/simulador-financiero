import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  accessTtlSeconds,
  hashRefreshToken,
  newRefreshToken,
  refreshTtlSeconds,
  signAccessToken,
} from '../../common/tokens.js';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma, type User } from '../../generated/prisma/client.js';
import { ChangePasswordDto, LoginDto, RegisterDto } from './auth.dto.js';
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

const PUBLIC_FIELDS = [
  'id',
  'email',
  'fullName',
  'role',
  'isActive',
  'createdAt',
] as const;

/** Nunca devolver `passwordHash` ni `updatedAt` al cliente. */
const toPublicUser = (user: User) =>
  Object.fromEntries(
    PUBLIC_FIELDS.map((field) => [field, user[field]]),
  ) as Pick<User, (typeof PUBLIC_FIELDS)[number]>;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto, context: SessionContext) {
    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.user
      .create({
        data: { email: dto.email, fullName: dto.fullName, passwordHash },
      })
      .catch((error: unknown) => {
        // P2002 = violación de índice único; el único que hay aquí es el correo.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('El correo ya está registrado');
        }
        throw error;
      });
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

  /** ponytail: limpieza oportunista; con volumen conviene una tarea programada. */
  private async pruneExpired(userId: string) {
    await this.prisma.authSession.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });
  }
}
