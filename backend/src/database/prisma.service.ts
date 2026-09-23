import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = () =>
  new PrismaPg({ connectionString: process.env.DATABASE_URL });

/** Cliente fuera de Nest (seed, scripts). */
export const createPrismaClient = () =>
  new PrismaClient({ adapter: adapter() });

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: adapter() });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
