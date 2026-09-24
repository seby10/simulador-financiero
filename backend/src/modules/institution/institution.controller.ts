import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Put,
  StreamableFile,
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
  ApiProduces,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminOnly } from '../../common/auth.js';
import { MAX_UPLOAD_BYTES } from '../../common/http.js';
import {
  InstitutionResponse,
  UpdateInstitutionDto,
  UploadLogoDto,
  UploadHeroDto,
} from './institution.dto.js';
import { type AssetKind, InstitutionService } from './institution.service.js';

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
    return this.service.updateAsset('logo', file);
  }

  /** Sube la imagen de fondo del Landing Page (PNG/JPEG). */
  @Post('hero')
  @AdminOnly()
  @UseInterceptors(
    FileInterceptor('hero', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadHeroDto })
  @ApiCreatedResponse({ type: InstitutionResponse })
  @ApiBadRequestResponse({ description: 'Archivo ausente o no es PNG/JPEG' })
  @ApiPayloadTooLargeResponse({ description: 'Archivo mayor a 5 MB' })
  uploadHero(@UploadedFile() file?: Express.Multer.File) {
    return this.service.updateAsset('hero', file);
  }

  /** Logo institucional (público). */
  @Get('logo')
  @ApiProduces('image/png', 'image/jpeg')
  @ApiNotFoundResponse({ description: 'Logo no cargado' })
  @Header('Cache-Control', 'public, max-age=86400')
  logo() {
    return this.serve('logo');
  }

  /** Imagen de portada del Landing Page (público). */
  @Get('hero')
  @ApiProduces('image/png', 'image/jpeg')
  @ApiNotFoundResponse({ description: 'Imagen no cargada' })
  @Header('Cache-Control', 'public, max-age=86400')
  hero() {
    return this.serve('hero');
  }

  // La URL cambia (?v=) con cada subida, así que se puede cachear sin miedo.
  private async serve(kind: AssetKind) {
    const asset = await this.service.asset(kind);
    return new StreamableFile(asset.data, { type: asset.mimeType });
  }
}
