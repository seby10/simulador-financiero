import { Global, Injectable, Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { detectFileKind, MIME_TYPES } from './http.js';

/**
 * Archivos subidos, guardados en Postgres en vez de en el disco del servidor.
 *
 * El contenedor de la API es efímero: cada despliegue arranca con el disco
 * vacío, así que un archivo escrito en él dura hasta el siguiente deploy. Para
 * las imágenes de producto sería molesto; para la selfie de referencia es grave,
 * porque es contra lo que se compara la recuperación de clave. La base ya es
 * compartida y persistente, y a esta escala (pocos MB) no necesita más.
 *
 * ponytail: si algún día hay muchos archivos o pesados, esto se cambia por S3/R2
 * sin tocar a quien lo usa: la clave `path` ya es la que usaría el bucket.
 */
@Injectable()
export class StorageService {
  constructor(private readonly prisma: PrismaService) {}

  /** Guarda (o reemplaza) el archivo de esa ruta. */
  async save(path: string, buffer: Buffer) {
    const kind = detectFileKind(buffer);
    const mimeType = kind ? MIME_TYPES[kind] : 'application/octet-stream';
    const data = new Uint8Array(buffer); // Prisma espera Uint8Array, no Buffer
    await this.prisma.storedFile.upsert({
      where: { path },
      update: { mimeType, data },
      create: { path, mimeType, data },
    });
  }

  /** Contenido del archivo, o null si no está. */
  async read(path: string): Promise<Buffer | null> {
    const file = await this.prisma.storedFile.findUnique({
      where: { path },
      select: { data: true },
    });
    return file ? Buffer.from(file.data) : null;
  }

  /** Archivo con su tipo, para servirlo tal cual. */
  find(path: string) {
    return this.prisma.storedFile.findUnique({ where: { path } });
  }

  /** Si el archivo está, sin traerse los bytes. */
  async exists(path: string) {
    const file = await this.prisma.storedFile.findUnique({
      where: { path },
      select: { path: true },
    });
    return file !== null;
  }
}

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
