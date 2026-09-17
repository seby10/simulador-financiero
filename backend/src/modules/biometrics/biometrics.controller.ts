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
import { AdminOnly } from '../../common/auth.js';
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
   * Aprueba la solicitud solo si ambos puntajes superan su umbral.
   */
  @Post('applications/:id/verify')
  @HttpCode(200)
  @ApiOkResponse({ type: BiometricsResponse })
  @ApiBadRequestResponse({
    description: 'Faltan documentos o la captura no es JPEG/PNG',
  })
  @ApiNotFoundResponse({ description: 'Solicitud inexistente' })
  @ApiConflictResponse({ description: 'La solicitud ya fue resuelta' })
  @ApiTooManyRequestsResponse({ description: 'Se agotaron los intentos' })
  verify(@Param('id', uuid) id: string, @Body() dto: BiometricsDto) {
    return this.biometrics.verify(id, dto);
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
