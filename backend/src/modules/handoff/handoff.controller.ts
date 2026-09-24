import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Authenticated, CurrentUser } from '../../common/auth.js';
import { STRICT } from '../../common/throttle.js';
import { LiveCaptureDto } from '../biometrics/biometrics.dto.js';
import {
  CreateHandoffDto,
  CreateResetHandoffDto,
  HandoffCreatedResponse,
  HandoffMobileInfoResponse,
  HandoffPollDto,
  HandoffStatusResponse,
} from './handoff.dto.js';
import { HandoffService } from './handoff.service.js';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Continuar la verificación facial desde el celular escaneando un QR. */
@ApiTags('Biometría')
@Controller('biometrics/handoff')
export class HandoffController {
  constructor(private readonly handoff: HandoffService) {}

  /** Abre un traspaso para confirmar la identidad o verificar una solicitud propia. */
  @Post()
  @Authenticated()
  @ApiCreatedResponse({ type: HandoffCreatedResponse })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateHandoffDto) {
    return this.handoff.createForUser(userId, dto.purpose, dto.applicationId);
  }

  /** Abre un traspaso para recuperar la clave (sin sesión, con el correo). */
  @Post('password-reset')
  @Throttle(STRICT)
  @ApiCreatedResponse({ type: HandoffCreatedResponse })
  createForReset(@Body() dto: CreateResetHandoffDto) {
    return this.handoff.createForReset(dto.email);
  }

  /** La computadora consulta si el celular ya terminó. */
  @Post(':id/status')
  @HttpCode(200)
  @ApiOkResponse({ type: HandoffStatusResponse })
  @ApiNotFoundResponse({
    description: 'Traspaso inexistente o secreto incorrecto',
  })
  poll(@Param('id', uuid) id: string, @Body() dto: HandoffPollDto) {
    return this.handoff.poll(id, dto.pollToken);
  }

  /** El celular abre el QR: qué flujo es y a quién saludar. */
  @Get('mobile/:token')
  @Throttle(STRICT)
  @ApiOkResponse({ type: HandoffMobileInfoResponse })
  @ApiGoneResponse({ description: 'Código vencido o inválido' })
  mobileInfo(@Param('token') token: string) {
    return this.handoff.mobileInfo(token);
  }

  /** El celular envía la prueba de vida; el servidor ejecuta el flujo original. */
  @Post('mobile/:token/verify')
  @Throttle(STRICT)
  @HttpCode(200)
  @ApiGoneResponse({ description: 'Código vencido o inválido' })
  verify(@Param('token') token: string, @Body() dto: LiveCaptureDto) {
    return this.handoff.verifyFromMobile(token, dto);
  }
}
