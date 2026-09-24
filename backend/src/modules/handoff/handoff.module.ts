import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BiometricsModule } from '../biometrics/biometrics.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { HandoffController } from './handoff.controller.js';
import { HandoffService } from './handoff.service.js';

@Module({
  imports: [AuthModule, BiometricsModule, IdentityModule],
  controllers: [HandoffController],
  providers: [HandoffService],
})
export class HandoffModule {}
