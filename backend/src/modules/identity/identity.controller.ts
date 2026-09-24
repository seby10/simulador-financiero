import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Authenticated, CurrentUser } from '../../common/auth.js';
import { MAX_UPLOAD_BYTES } from '../../common/http.js';
import { STRICT } from '../../common/throttle.js';
import {
  IdentityStatusResponse,
  IdentityVerifyResponse,
  UploadIdentityDocumentDto,
  VerifyIdentityDto,
} from './identity.dto.js';
import { IdentityService } from './identity.service.js';

/** Confirmación de identidad de la propia cuenta (registro). */
@ApiTags('Identidad')
@Controller('identity')
@Authenticated()
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  /** Estado de la verificación: el frontend lo usa para pedir "Acción necesaria". */
  @Get()
  @ApiOkResponse({ type: IdentityStatusResponse })
  status(@CurrentUser('sub') userId: string) {
    return this.identity.status(userId);
  }

  /** Carga (o reemplaza) la foto del lado frontal de la cédula. */
  @Post('document')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('idFront', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadIdentityDocumentDto })
  @ApiOkResponse({ type: IdentityStatusResponse })
  @ApiBadRequestResponse({ description: 'Archivo ausente o no es JPEG/PNG' })
  @ApiPayloadTooLargeResponse({ description: 'Archivo mayor a 5 MB' })
  @ApiConflictResponse({ description: 'La identidad ya está verificada' })
  uploadDocument(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.identity.uploadDocument(userId, file);
  }

  /**
   * Compara una selfie en vivo con la cédula cargada. Si coincide, la cuenta
   * queda verificada; al agotar los intentos se bloquea para revisión manual.
   */
  @Post('verify')
  @Throttle(STRICT)
  @HttpCode(200)
  @ApiOkResponse({ type: IdentityVerifyResponse })
  @ApiBadRequestResponse({
    description:
      'Sin consentimiento, sin cédula cargada, o captura sin un rostro válido',
  })
  @ApiConflictResponse({ description: 'La identidad ya está verificada' })
  @ApiTooManyRequestsResponse({ description: 'Se agotaron los intentos' })
  verify(@CurrentUser('sub') userId: string, @Body() dto: VerifyIdentityDto) {
    return this.identity.verify(userId, dto.selfieBase64);
  }
}
