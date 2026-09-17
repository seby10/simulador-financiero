import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { AdminOnly } from '../../common/auth.js';
import { MAX_UPLOAD_BYTES } from '../../common/http.js';
import { DOCUMENT_KINDS } from '../investment/investment.dto.js';
import {
  ApplyDto,
  BiometricsDto,
  BiometricsResponse,
  InvestmentApplicationResponse,
  InvestmentApplicationWithPlanResponse,
  ListApplicationsQuery,
  UploadDocumentsDto,
} from './onboarding.dto.js';
import { OnboardingService, type DocumentFiles } from './onboarding.service.js';

const uuid = new ParseUUIDPipe({ version: '4' });

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  /** Registra una solicitud de inversión (estado PENDING_REVIEW). */
  @Post('apply')
  @ApiCreatedResponse({ type: InvestmentApplicationWithPlanResponse })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o fuera de rango de la póliza',
  })
  @ApiNotFoundResponse({ description: 'Póliza inexistente' })
  apply(@Body() dto: ApplyDto) {
    return this.onboarding.apply(dto);
  }

  /** Carga cédula (frontal/reverso) y planilla de servicio. Se puede repetir mientras esté pendiente. */
  @Post(':id/documents')
  @UseInterceptors(
    FileFieldsInterceptor(
      DOCUMENT_KINDS.map((name) => ({ name, maxCount: 1 })),
      { limits: { fileSize: MAX_UPLOAD_BYTES } },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadDocumentsDto })
  @ApiCreatedResponse({ type: InvestmentApplicationResponse })
  @ApiBadRequestResponse({
    description: 'Sin archivos, campo desconocido o tipo no permitido',
  })
  @ApiPayloadTooLargeResponse({ description: 'Archivo mayor a 5 MB' })
  @ApiConflictResponse({ description: 'La solicitud ya fue resuelta' })
  uploadDocuments(
    @Param('id', uuid) id: string,
    @UploadedFiles() files?: DocumentFiles,
  ) {
    return this.onboarding.uploadDocuments(id, files);
  }

  /** Verificación biométrica simulada (liveness + face match); aprueba la solicitud. */
  @Post(':id/biometrics')
  @HttpCode(200)
  @ApiOkResponse({ type: BiometricsResponse })
  @ApiBadRequestResponse({
    description: 'Faltan documentos o la captura no es JPEG/PNG',
  })
  @ApiConflictResponse({ description: 'La solicitud ya fue resuelta' })
  biometrics(@Param('id', uuid) id: string, @Body() dto: BiometricsDto) {
    return this.onboarding.verifyBiometrics(id, dto);
  }

  /** Lista solicitudes, opcionalmente filtradas por estado. */
  @Get('applications')
  @AdminOnly()
  @ApiOkResponse({ type: [InvestmentApplicationWithPlanResponse] })
  list(@Query() query: ListApplicationsQuery) {
    return this.onboarding.list(query.status);
  }

  /** Detalle de una solicitud. */
  @Get('applications/:id')
  @AdminOnly()
  @ApiOkResponse({ type: InvestmentApplicationWithPlanResponse })
  @ApiNotFoundResponse()
  get(@Param('id', uuid) id: string) {
    return this.onboarding.get(id);
  }

  /** Descarga un documento cargado (datos personales: solo administradores). */
  @Get('applications/:id/documents/:kind')
  @AdminOnly()
  @ApiParam({ name: 'kind', enum: DOCUMENT_KINDS })
  @ApiProduces('image/png', 'image/jpeg', 'application/pdf')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({ description: 'Solicitud o documento inexistente' })
  async document(@Param('id', uuid) id: string, @Param('kind') kind: string) {
    const { buffer, mimeType, fileName } = await this.onboarding.readDocument(
      id,
      kind,
    );
    return new StreamableFile(buffer, {
      type: mimeType,
      disposition: `inline; filename="${fileName}"`,
    });
  }
}
