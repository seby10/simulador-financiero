-- Las columnas de User, InstitutionConfig, CreditType e InvestmentPlan llegaron a
-- algunas bases con `prisma db push` antes de existir esta migración: IF NOT EXISTS
-- permite aplicarla igual en esas y en una base nueva.

-- CreateEnum
CREATE TYPE "BiometricStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- AlterTable
ALTER TABLE "CreditType" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "InstitutionConfig" ADD COLUMN IF NOT EXISTS "accentColor" TEXT NOT NULL DEFAULT '#10b981',
ADD COLUMN IF NOT EXISTS "cardBgColor" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS "footerBgColor" TEXT NOT NULL DEFAULT '#003b70',
ADD COLUMN IF NOT EXISTS "footerTextColor" TEXT NOT NULL DEFAULT '#e2e8f0',
ADD COLUMN IF NOT EXISTS "heroImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "heroSubtitle" TEXT NOT NULL DEFAULT 'Crecemos junto a ti. Solicita tu crédito hoy mismo y simula tus pagos de forma transparente.',
ADD COLUMN IF NOT EXISTS "heroTitle" TEXT NOT NULL DEFAULT 'El respaldo financiero que necesitas.',
ADD COLUMN IF NOT EXISTS "navbarBgColor" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS "navbarTextColor" TEXT NOT NULL DEFAULT '#1e293b',
ADD COLUMN IF NOT EXISTS "pageBgColor" TEXT NOT NULL DEFAULT '#f8fafc',
ADD COLUMN IF NOT EXISTS "primaryColor" TEXT NOT NULL DEFAULT '#003b70',
ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT NOT NULL DEFAULT '#35b8db';

-- AlterTable
ALTER TABLE "InvestmentApplication" ADD COLUMN IF NOT EXISTS "biometricStatus" "BiometricStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- AlterTable
ALTER TABLE "InvestmentPlan" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "firstName" TEXT,
ADD COLUMN IF NOT EXISTS "idNumber" VARCHAR(10),
ADD COLUMN IF NOT EXISTS "lastName" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- CreateTable
CREATE TABLE "BiometricPasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "livenessScore" DECIMAL(5,2) NOT NULL,
    "matchScore" DECIMAL(5,2) NOT NULL,
    "provider" TEXT NOT NULL,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricPasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BiometricPasswordReset_tokenHash_key" ON "BiometricPasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BiometricPasswordReset_userId_createdAt_idx" ON "BiometricPasswordReset"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InvestmentApplication_userId_idx" ON "InvestmentApplication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_idNumber_key" ON "User"("idNumber");

-- AddForeignKey
ALTER TABLE "BiometricPasswordReset" ADD CONSTRAINT "BiometricPasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentApplication" ADD CONSTRAINT "InvestmentApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: hasta ahora aprobar la biometría aprobaba la solicitud; ese puntaje
-- ahora significa "identidad verificada".
UPDATE "InvestmentApplication" SET "biometricStatus" = 'VERIFIED'
WHERE "biometricScore" IS NOT NULL;

-- Sin intento aprobado y con 3 o más fallidos (el límite por defecto): revisión manual.
UPDATE "InvestmentApplication" a SET "biometricStatus" = 'FAILED'
WHERE a."biometricScore" IS NULL
  AND (SELECT count(*) FROM "BiometricVerification" v WHERE v."applicationId" = a.id) >= 3;

-- Las solicitudes previas no guardaban el autor: se enlazan por correo.
UPDATE "InvestmentApplication" a SET "userId" = u.id
FROM "User" u
WHERE a."userId" IS NULL AND lower(a.email) = u.email;
