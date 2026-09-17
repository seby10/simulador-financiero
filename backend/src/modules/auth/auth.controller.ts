import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  Authenticated,
  CurrentUser,
  readCookie,
  REFRESH_COOKIE,
} from '../../common/auth.js';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  SessionResponse,
  UserResponse,
} from './auth.dto.js';
import { AuthService, type SessionContext } from './auth.service.js';
import { clearSessionCookies, setSessionCookies } from './cookies.js';

const contextOf = (request: Request): SessionContext => ({
  userAgent: request.header('user-agent'),
  ipAddress: request.ip,
});

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Crea la cuenta (rol CUSTOMER) y deja la sesión abierta. */
  @Post('register')
  @ApiCreatedResponse({ type: SessionResponse })
  @ApiConflictResponse({ description: 'El correo ya está registrado' })
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
