import { Module } from '@nestjs/common';
import { BiometricsController } from './biometrics.controller.js';
import {
  BIOMETRIC_PROVIDER,
  SimulatedBiometricProvider,
} from './biometrics.provider.js';
import { BiometricsService } from './biometrics.service.js';

@Module({
  controllers: [BiometricsController],
  providers: [
    BiometricsService,
    // Para enchufar un proveedor real, cambiar useClass por su implementación.
    { provide: BIOMETRIC_PROVIDER, useClass: SimulatedBiometricProvider },
  ],
  exports: [BiometricsService],
})
export class BiometricsModule {}
