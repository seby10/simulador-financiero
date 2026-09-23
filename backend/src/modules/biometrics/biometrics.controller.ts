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
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminOnly, Authenticated, CurrentUser } from '../../common/auth.js';
import { STRICT } from '../../common/throttle.js';
import {
  BiometricAttemptResponse,
  BiometricsDto,
  BiometricsResponse,
} from './biometrics.dto.js';
import { BiometricsService } from './biometrics.service.js';

const uuid = new ParseUUIDPipe({ version: '4' });

@ApiTags('Biometría')
@Controller('biometrics')
export class BiometricsController {
  constructor(private readonly biometrics: BiometricsService) {}

  /**
   * Verifica prueba de vida y coincidencia facial contra la cédula cargada.
   * Si ambos puntajes superan su umbral la identidad queda verificada; aprobar
   * la inversión sigue siendo decisión de un administrador.
   */
  @Post('applications/:id/verify')
  @Authenticated()
  @Throttle(STRICT)
  @HttpCode(200)
  @ApiOkResponse({ type: BiometricsResponse })
  @ApiBadRequestResponse({
    description:
      'Faltan documentos, la captura no es JPEG/PNG o la cédula frontal no es una foto',
  })
  @ApiNotFoundResponse({
    description: 'Solicitud inexistente o de otro usuario',
  })
  @ApiConflictResponse({
    description:
      'La solicitud ya fue resuelta o la identidad ya fue verificada',
  })
  @ApiTooManyRequestsResponse({ description: 'Se agotaron los intentos' })
  verify(
    @Param('id', uuid) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: BiometricsDto,
  ) {
    return this.biometrics.verify(id, userId, dto);
  }

  /** Historial de intentos, con sus puntajes y motivos de rechazo. */
  @Get('applications/:id')
  @AdminOnly()
  @ApiOkResponse({ type: [BiometricAttemptResponse] })
  @ApiNotFoundResponse({ description: 'Solicitud inexistente' })
  history(@Param('id', uuid) id: string) {
    return this.biometrics.history(id);
  }
}
