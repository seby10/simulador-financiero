import { ConflictException } from '@nestjs/common';
import { vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { BiometricsService } from '../biometrics/biometrics.service.js';
import type { IdentityService } from '../identity/identity.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService: siempre queda un administrador activo', () => {
  const adminId = '11111111-1111-4111-8111-111111111111';

  const setup = (otherActiveAdmins: number) => {
    const updated = {
      id: adminId,
      role: UserRole.CUSTOMER,
      isActive: false,
    };
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ role: UserRole.ADMIN, isActive: true }),
        count: vi.fn().mockResolvedValue(otherActiveAdmins),
        update: vi.fn().mockResolvedValue(updated),
      },
      authSession: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      {} as BiometricsService,
      {} as IdentityService,
    );
    return { prisma, service };
  };

  // La cabecera x-admin-key llega sin actor: la protección no depende de él.
  it('no deja quitar el rol al último administrador', async () => {
    const { prisma, service } = setup(0);
    await expect(
      service.updateUserRole(null, adminId, UserRole.CUSTOMER),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('no deja desactivar al último administrador', async () => {
    const { prisma, service } = setup(0);
    await expect(
      service.setUserActive(null, adminId, false),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('lo permite si queda otro administrador activo', async () => {
    const { prisma, service } = setup(1);
    await service.updateUserRole(null, adminId, UserRole.CUSTOMER);
    await service.setUserActive(null, adminId, false);
    expect(prisma.user.update).toHaveBeenCalledTimes(2);
  });
});
