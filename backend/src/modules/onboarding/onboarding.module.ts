import { Module } from '@nestjs/common';
import { BiometricsModule } from '../biometrics/biometrics.module.js';
import { InvestmentModule } from '../investment/investment.module.js';
import { OnboardingController } from './onboarding.controller.js';
import { OnboardingService } from './onboarding.service.js';

@Module({
  // BiometricsModule: solo para la ruta deprecada :id/biometrics.
  imports: [InvestmentModule, BiometricsModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
