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
import {
  AdminOnly,
  Authenticated,
  CurrentUser,
  VerifiedIdentity,
} from '../../common/auth.js';
import { MAX_UPLOAD_BYTES } from '../../common/http.js';
import { SELFIE_DOCUMENT } from '../biometrics/biometrics.service.js';
import { DOCUMENT_KINDS } from '../investment/investment.dto.js';
import {
  ApplyDto,
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

  /** Solicitudes de la cuenta autenticada, con su estado y el de la biometría. */
  @Get('my-applications')
  @Authenticated()
  @ApiOkResponse({ type: [InvestmentApplicationWithPlanResponse] })
  myApplications(@CurrentUser('sub') userId: string) {
    return this.onboarding.listMine(userId);
  }

  /** Registra una solicitud de inversión de la cuenta autenticada (PENDING_REVIEW). */
  @Post('apply')
  @VerifiedIdentity()
  @ApiCreatedResponse({ type: InvestmentApplicationWithPlanResponse })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos, fuera de rango de la póliza o cédula distinta a la de la cuenta',
  })
  @ApiNotFoundResponse({ description: 'Póliza inexistente' })
  apply(@Body() dto: ApplyDto, @CurrentUser('sub') userId: string) {
    return this.onboarding.apply(dto, userId);
  }

  /**
   * Carga cédula (frontal/reverso) y planilla de servicio. La cédula frontal debe
   * ser JPEG/PNG porque es la referencia facial. Se puede repetir hasta verificar.
   */
  @Post(':id/documents')
  @VerifiedIdentity()
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
  @ApiNotFoundResponse({
    description: 'Solicitud inexistente o de otro usuario',
  })
  @ApiPayloadTooLargeResponse({ description: 'Archivo mayor a 5 MB' })
  @ApiConflictResponse({
    description: 'La solicitud ya fue resuelta o la identidad ya fue evaluada',
  })
  uploadDocuments(
    @Param('id', uuid) id: string,
    @CurrentUser('sub') userId: string,
    @UploadedFiles() files?: DocumentFiles,
  ) {
    return this.onboarding.uploadDocuments(id, userId, files);
  }

  /** Lista solicitudes, opcionalmente filtradas por estado. */
  @Get('applications')
  @AdminOnly()
  @ApiOkResponse({ type: [InvestmentApplicationWithPlanResponse] })
  list(@Query() query: ListApplicationsQuery) {
    return this.onboarding.list(query.status);
  }

  /** Aprueba una solicitud pendiente con la identidad ya resuelta. */
  @Post('applications/:id/approve')
  @AdminOnly()
  @HttpCode(200)
  @ApiOkResponse({ type: InvestmentApplicationWithPlanResponse })
  @ApiConflictResponse({
    description: 'La solicitud ya fue resuelta o la biometría sigue pendiente',
  })
  @ApiNotFoundResponse()
  approve(@Param('id', uuid) id: string) {
    return this.onboarding.approve(id);
  }

  /** Rechaza una solicitud pendiente. */
  @Post('applications/:id/reject')
  @AdminOnly()
  @HttpCode(200)
  @ApiOkResponse({ type: InvestmentApplicationWithPlanResponse })
  @ApiConflictResponse({ description: 'La solicitud ya fue resuelta' })
  @ApiNotFoundResponse()
  reject(@Param('id', uuid) id: string) {
    return this.onboarding.reject(id);
  }

  /** Detalle de una solicitud. */
  @Get('applications/:id')
  @AdminOnly()
  @ApiOkResponse({ type: InvestmentApplicationWithPlanResponse })
  @ApiNotFoundResponse()
  get(@Param('id', uuid) id: string) {
    return this.onboarding.get(id);
  }

  /** Descarga un documento cargado o la selfie verificada (solo administradores). */
  @Get('applications/:id/documents/:kind')
  @AdminOnly()
  @ApiParam({ name: 'kind', enum: [...DOCUMENT_KINDS, SELFIE_DOCUMENT] })
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
