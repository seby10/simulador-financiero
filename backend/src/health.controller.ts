import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrismaService } from './database/prisma.service.js';

/**
 * Sonda para el proveedor de hosting (health check de Render) y para los pings
 * que evitan que el plan gratuito se duerma. Consulta la base porque una API
 * que responde pero no alcanza Postgres no sirve de nada.
 */
@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }
}
