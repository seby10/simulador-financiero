import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminOnly } from '../../common/auth.js';
import { MAX_UPLOAD_BYTES } from '../../common/http.js';
import {
  InstitutionResponse,
  UpdateInstitutionDto,
  UploadLogoDto,
} from './institution.dto.js';
import { InstitutionService } from './institution.service.js';

@ApiTags('Institución')
@Controller('institution')
export class InstitutionController {
  constructor(private readonly service: InstitutionService) {}

  /** Configuración institucional y marca (público). */
  @Get()
  @ApiOkResponse({ type: InstitutionResponse })
  @ApiNotFoundResponse({ description: 'Seed no ejecutado' })
  get() {
    return this.service.get();
  }

  /** Reemplaza los datos institucionales. */
  @Put()
  @AdminOnly()
  @ApiOkResponse({ type: InstitutionResponse })
  update(@Body() dto: UpdateInstitutionDto) {
    return this.service.update(dto);
  }

  /** Sube el logo institucional (PNG/JPEG). */
  @Post('logo')
  @AdminOnly()
  @UseInterceptors(
    FileInterceptor('logo', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadLogoDto })
  @ApiCreatedResponse({ type: InstitutionResponse })
  @ApiBadRequestResponse({ description: 'Archivo ausente o no es PNG/JPEG' })
  @ApiPayloadTooLargeResponse({ description: 'Archivo mayor a 5 MB' })
  uploadLogo(@UploadedFile() file?: Express.Multer.File) {
    return this.service.updateLogo(file);
  }
}
