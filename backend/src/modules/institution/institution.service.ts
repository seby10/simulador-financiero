import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertFileKind } from '../../common/http.js';
import { PrismaService } from '../../database/prisma.service.js';
import { UpdateInstitutionDto } from './institution.dto.js';

const SINGLETON_ID = 1;

/** Imágenes de marca que se pueden subir desde el panel. */
export type AssetKind = 'logo' | 'hero';

const URL_FIELD = { logo: 'logoUrl', hero: 'heroImageUrl' } as const;
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg' };

@Injectable()
export class InstitutionService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const config = await this.prisma.institutionConfig.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (!config) {
      throw new NotFoundException(
        'Configuración institucional no registrada (ejecute npm run db:seed)',
      );
    }
    return config;
  }

  update(dto: UpdateInstitutionDto) {
    return this.prisma.institutionConfig.upsert({
      where: { id: SINGLETON_ID },
      update: dto,
      create: { id: SINGLETON_ID, ...dto },
    });
  }

  /**
   * Guarda la imagen en la base (no en el disco del servidor que la recibió):
   * con una BD compartida, todas las instancias la sirven igual. La URL lleva
   * la fecha de subida para que el navegador no muestre la versión anterior.
   */
  async updateAsset(kind: AssetKind, file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException(`Adjunte el archivo en el campo "${kind}"`);
    }
    await this.get();
    const type = assertFileKind(file.buffer, ['png', 'jpg'], kind);
    const data = new Uint8Array(file.buffer); // Prisma espera Uint8Array, no Buffer
    const asset = await this.prisma.institutionAsset.upsert({
      where: { kind },
      update: { mimeType: MIME[type], data },
      create: { kind, mimeType: MIME[type], data },
    });
    return this.prisma.institutionConfig.update({
      where: { id: SINGLETON_ID },
      data: {
        [URL_FIELD[kind]]: `/api/institution/${kind}?v=${asset.updatedAt.getTime()}`,
      },
    });
  }

  async asset(kind: AssetKind) {
    const asset = await this.prisma.institutionAsset.findUnique({
      where: { kind },
    });
    if (!asset) throw new NotFoundException('Imagen no cargada');
    return asset;
  }
}
