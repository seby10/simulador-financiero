import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  StreamableFile,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { publicFilePath } from './http.js';
import { StorageService } from './storage.js';

/** Carpetas públicas existentes; cualquier otra no se sirve. */
const FOLDERS = ['credit', 'investment'];

/**
 * Sirve las imágenes públicas de catálogo desde la base, donde antes había
 * archivos estáticos en disco. Queda fuera del prefijo /api para que las URLs
 * ya guardadas (`/uploads/credit/x.png`) sigan siendo válidas.
 */
@ApiExcludeController()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Get(':folder/:name')
  // El nombre lleva un UUID y cambia en cada subida: se puede cachear fuerte.
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async serve(@Param('folder') folder: string, @Param('name') name: string) {
    if (!FOLDERS.includes(folder)) throw new NotFoundException();
    const file = await this.storage.find(publicFilePath(folder, name));
    if (!file) throw new NotFoundException('Archivo no encontrado');
    return new StreamableFile(Buffer.from(file.data), { type: file.mimeType });
  }
}
