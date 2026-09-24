-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('PENDING', 'VERIFIED', 'LOCKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "biometricConsentAt" TIMESTAMP(3),
ADD COLUMN     "identityScore" DECIMAL(5,2),
ADD COLUMN     "identityStatus" "IdentityStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "identityUnlockedAt" TIMESTAMP(3),
ADD COLUMN     "identityVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "IdentityVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "livenessScore" DECIMAL(5,2) NOT NULL,
    "matchScore" DECIMAL(5,2) NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdentityVerification_userId_createdAt_idx" ON "IdentityVerification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: el personal administrativo no pasa por la verificación biométrica.
UPDATE "User" SET "identityStatus" = 'VERIFIED', "identityVerifiedAt" = now()
WHERE role = 'ADMIN';

-- Clientes que ya verificaron su rostro en una solicitud: esa selfie sirve de
-- referencia hasta que se enrolen de nuevo.
UPDATE "User" u SET "identityStatus" = 'VERIFIED',
       "identityVerifiedAt" = a."updatedAt",
       "identityScore" = a."biometricScore"
FROM (
  SELECT DISTINCT ON ("userId") "userId", "updatedAt", "biometricScore"
  FROM "InvestmentApplication"
  WHERE "biometricStatus" = 'VERIFIED' AND "userId" IS NOT NULL
  ORDER BY "userId", "updatedAt" DESC
) a
WHERE u.id = a."userId" AND u."identityStatus" = 'PENDING';
