import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  AdminOnly,
  Authenticated,
  CurrentUser,
  readCookie,
  REFRESH_COOKIE,
} from '../../common/auth.js';
import { STRICT } from '../../common/throttle.js';
import { IdentityStatusResponse } from '../identity/identity.dto.js';
import {
  BiometricResetConfirmDto,
  BiometricResetVerifyDto,
  BiometricResetVerifyResponse,
  ChangePasswordDto,
  CreateUserAdminDto,
  LoginDto,
  RegisterDto,
  SessionResponse,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UserResponse,
} from './auth.dto.js';
import { IdentityService } from '../identity/identity.service.js';
import { AuthService, type SessionContext } from './auth.service.js';
import { clearSessionCookies, setSessionCookies } from './cookies.js';

const contextOf = (request: Request): SessionContext => ({
  userAgent: request.header('user-agent'),
  ipAddress: request.ip,
});

/** Administrador en sesión; null si entró con la cabecera x-admin-key. */
const actorOf = (request: Request) => request.user?.sub ?? null;

const uuid = new ParseUUIDPipe({ version: '4' });

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly identity: IdentityService,
  ) {}

  /** Lista todos los usuarios con su número de solicitudes (solo administradores). */
  @Get('users')
  @AdminOnly()
  @ApiOkResponse({ type: [UserResponse] })
  listUsers() {
    return this.auth.listUsers();
  }

  /** Crea un usuario desde el panel administrativo, con el rol indicado. */
  @Post('users')
  @AdminOnly()
  @ApiCreatedResponse({ type: UserResponse })
  @ApiConflictResponse({
    description: 'Ya existe una cuenta con ese correo o esa cédula',
  })
  adminCreateUser(@Body() dto: CreateUserAdminDto) {
    return this.auth.adminCreateUser(dto);
  }

  /** Cambia el rol de otro usuario (ADMIN / CUSTOMER). */
  @Patch('users/:id/role')
  @AdminOnly()
  @ApiOkResponse({ type: UserResponse })
  @ApiForbiddenResponse({ description: 'Intento de cambiar el rol propio' })
  @ApiNotFoundResponse({ description: 'Usuario inexistente' })
  updateUserRole(
    @Param('id', uuid) userId: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() request: Request,
  ) {
    return this.auth.updateUserRole(actorOf(request), userId, dto.role);
  }

  /** Activa o desactiva otra cuenta; desactivarla cierra sus sesiones. */
  @Patch('users/:id/status')
  @AdminOnly()
  @ApiOkResponse({ type: UserResponse })
  @ApiForbiddenResponse({
    description: 'Intento de desactivar la cuenta propia',
  })
  @ApiNotFoundResponse({ description: 'Usuario inexistente' })
  setUserActive(
    @Param('id', uuid) userId: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() request: Request,
  ) {
    return this.auth.setUserActive(actorOf(request), userId, dto.isActive);
  }

  /** Tras revisar el caso, devuelve los intentos de verificación facial a una cuenta bloqueada. */
  @Patch('users/:id/identity/unlock')
  @AdminOnly()
  @ApiOkResponse({ type: IdentityStatusResponse })
  @ApiConflictResponse({ description: 'La verificación no está bloqueada' })
  unlockIdentity(@Param('id', uuid) userId: string) {
    return this.identity.unlock(userId);
  }

  /**
   * Recuperación de clave por biometría: compara una captura en vivo con la selfie
   * que verificó la identidad del titular en una solicitud. Máx. 5 fallos por hora.
   */
  @Post('biometric-reset/verify')
  @Throttle(STRICT)
  @HttpCode(200)
  @ApiOkResponse({ type: BiometricResetVerifyResponse })
  @ApiBadRequestResponse({ description: 'La captura no es JPEG/PNG' })
  @ApiUnauthorizedResponse({
    description:
      'Identidad no verificada (mismo mensaje exista o no la cuenta)',
  })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos fallidos' })
  biometricResetVerify(@Body() dto: BiometricResetVerifyDto) {
    return this.auth.biometricResetVerify(dto.email, dto.selfieBase64);
  }

  /** Fija la nueva contraseña con el token de un solo uso y cierra todas las sesiones. */
  @Post('biometric-reset/confirm')
  @Throttle(STRICT)
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Contraseña actualizada' })
  @ApiUnauthorizedResponse({ description: 'Token inválido, usado o expirado' })
  async biometricResetConfirm(@Body() dto: BiometricResetConfirmDto) {
    await this.auth.biometricResetConfirm(dto.resetToken, dto.newPassword);
  }

  /** Crea la cuenta (rol CUSTOMER) y deja la sesión abierta. */
  @Post('register')
  @Throttle(STRICT)
  @ApiCreatedResponse({ type: SessionResponse })
  @ApiConflictResponse({
    description: 'Ya existe una cuenta con ese correo o esa cédula',
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { session, ...tokens } = await this.auth.register(
      dto,
      contextOf(request),
    );
    setSessionCookies(response, tokens);
    return session;
  }

  /** Inicia sesión y emite las cookies httpOnly. */
  @Post('login')
  @Throttle(STRICT)
  @HttpCode(200)
  @ApiOkResponse({ type: SessionResponse })
  @ApiUnauthorizedResponse({ description: 'Correo o contraseña incorrectos' })
  @ApiForbiddenResponse({ description: 'La cuenta está desactivada' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { session, ...tokens } = await this.auth.login(
      dto,
      contextOf(request),
    );
    setSessionCookies(response, tokens);
    return session;
  }

  /**
   * Canjea el refresh token por uno nuevo (rotación). No lleva cuerpo: el token
   * viaja en la cookie httpOnly.
   */
  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: SessionResponse })
  @ApiUnauthorizedResponse({
    description: 'Sin cookie, token inválido, expirado o ya usado',
  })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const { session, ...tokens } = await this.auth.refresh(
        readCookie(request, REFRESH_COOKIE),
        contextOf(request),
      );
      setSessionCookies(response, tokens);
      return session;
    } catch (error) {
      // Si la renovación falla, la cookie que quedó ya no sirve para nada.
      clearSessionCookies(response);
      throw error;
    }
  }

  /** Revoca la familia de tokens de este dispositivo y borra las cookies. */
  @Post('logout')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Sesión cerrada (idempotente)' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(readCookie(request, REFRESH_COOKIE));
    clearSessionCookies(response);
  }

  /** Cierra la sesión en todos los dispositivos. */
  @Post('logout-all')
  @Authenticated()
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Todas las sesiones revocadas' })
  async logoutAll(
    @CurrentUser('sub') userId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logoutAll(userId);
    clearSessionCookies(response);
  }

  /** Datos de la sesión actual. */
  @Get('me')
  @Authenticated()
  @ApiOkResponse({ type: UserResponse })
  me(@CurrentUser('sub') userId: string) {
    return this.auth.me(userId);
  }

  /** Cambia la contraseña, revoca las demás sesiones y renueva la de aquí. */
  @Post('change-password')
  @Authenticated()
  @HttpCode(200)
  @ApiOkResponse({ type: SessionResponse })
  @ApiUnauthorizedResponse({ description: 'La contraseña actual no coincide' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { session, ...tokens } = await this.auth.changePassword(
      userId,
      dto,
      contextOf(request),
    );
    setSessionCookies(response, tokens);
    return session;
  }
}
