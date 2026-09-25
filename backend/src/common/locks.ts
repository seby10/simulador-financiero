import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';

/**
 * Invariantes que no caben en una sola fila —«debe quedar un administrador»,
 * «no más de N intentos»— no las protege una restricción de la base: leer y
 * luego escribir deja una ventana en la que dos peticiones simultáneas ven el
 * mismo estado y ambas pasan (write skew). `pg_advisory_xact_lock` serializa a
 * quienes comparten clave y se suelta solo al terminar la transacción, también
 * si esta falla; al ser de transacción funciona con el pooler de Neon.
 */
export const enum LockNamespace {
  /** Rol y estado de las cuentas: protege «debe quedar un administrador activo». */
  AdminRoster = 1,
  /** Intentos de verificación de identidad de una cuenta. */
  IdentityAttempts = 2,
}

/** Ejecuta `work` en una transacción que sostiene el cerrojo de `key`. */
export function withAdvisoryLock<T>(
  prisma: PrismaService,
  namespace: LockNamespace,
  key: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // hashtext() reduce la clave a los int4 que espera la función de Postgres.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${namespace}::int, hashtext(${key})::int)`;
    return work(tx);
  });
}
