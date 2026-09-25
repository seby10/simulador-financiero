import { Module } from '@nestjs/common';
import { BiometricsModule } from '../biometrics/biometrics.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [BiometricsModule, IdentityModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
