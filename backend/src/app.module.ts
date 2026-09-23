import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DomainExceptionFilter } from './common/http.js';
import { throttlerOptions } from './common/throttle.js';
import { PrismaModule } from './database/prisma.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BiometricsModule } from './modules/biometrics/biometrics.module.js';
import { CreditModule } from './modules/credit/credit.module.js';
import { InstitutionModule } from './modules/institution/institution.module.js';
import { InvestmentModule } from './modules/investment/investment.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot(throttlerOptions),
    PrismaModule,
    AuthModule,
    InstitutionModule,
    CreditModule,
    InvestmentModule,
    BiometricsModule,
    OnboardingModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
