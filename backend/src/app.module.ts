import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DomainExceptionFilter } from './common/http.js';
import { PrismaModule } from './database/prisma.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BiometricsModule } from './modules/biometrics/biometrics.module.js';
import { CreditModule } from './modules/credit/credit.module.js';
import { InstitutionModule } from './modules/institution/institution.module.js';
import { InvestmentModule } from './modules/investment/investment.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    InstitutionModule,
    CreditModule,
    InvestmentModule,
    BiometricsModule,
    OnboardingModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
