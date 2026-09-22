import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { assertFileKind, PUBLIC_UPLOADS, saveFile } from '../../common/http.js';
import { PrismaService } from '../../database/prisma.service.js';
import { UpdateInstitutionDto } from './institution.dto.js';

const SINGLETON_ID = 1;

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

  async updateLogo(file: Express.Multer.File | undefined) {
    if (!file)
      throw new BadRequestException('Adjunte el archivo en el campo "logo"');
    await this.get();
    const kind = assertFileKind(file.buffer, ['png', 'jpg'], 'logo');
    const name = `logo-${randomUUID()}.${kind}`;
    await saveFile(join(PUBLIC_UPLOADS, 'institution', name), file.buffer);
    // ponytail: logos anteriores quedan en disco; limpiar si el espacio importa.
    return this.prisma.institutionConfig.update({
      where: { id: SINGLETON_ID },
      data: { logoUrl: `/uploads/institution/${name}` },
    });
  }

  async updateHero(file: Express.Multer.File | undefined) {
    if (!file)
      throw new BadRequestException('Adjunte el archivo en el campo "hero"');
    await this.get();
    const kind = assertFileKind(file.buffer, ['png', 'jpg'], 'hero');
    const name = `hero-${randomUUID()}.${kind}`;
    await saveFile(join(PUBLIC_UPLOADS, 'institution', name), file.buffer);
    return this.prisma.institutionConfig.update({
      where: { id: SINGLETON_ID },
      data: { heroImageUrl: `/uploads/institution/${name}` },
    });
  }
}
