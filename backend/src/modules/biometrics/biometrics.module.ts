import { Module, ServiceUnavailableException } from '@nestjs/common';
import { BiometricsController } from './biometrics.controller.js';
import {
  BIOMETRIC_PROVIDER,
  SimulatedBiometricProvider,
} from './biometrics.provider.js';
import { BiometricsService } from './biometrics.service.js';
import { FaceApiBiometricProvider } from './face-api.provider.js';

/** Proveedores disponibles según BIOMETRIC_PROVIDER (por defecto la comparación real). */
const PROVIDERS = {
  faceapi: FaceApiBiometricProvider,
  simulated: SimulatedBiometricProvider,
} as const;

@Module({
  controllers: [BiometricsController],
  providers: [
    BiometricsService,
    {
      provide: BIOMETRIC_PROVIDER,
      useFactory: () => {
        const name = process.env.BIOMETRIC_PROVIDER || 'faceapi';
        const Provider = PROVIDERS[name as keyof typeof PROVIDERS];
        if (!Provider) {
          throw new ServiceUnavailableException(
            `BIOMETRIC_PROVIDER debe ser ${Object.keys(PROVIDERS).join(' o ')}`,
          );
        }
        return new Provider();
      },
    },
  ],
  exports: [BiometricsService],
})
export class BiometricsModule {}
