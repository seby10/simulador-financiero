-- CreateEnum
CREATE TYPE "LivenessPurpose" AS ENUM ('IDENTITY', 'PASSWORD_RESET', 'APPLICATION');

-- CreateTable
CREATE TABLE "LivenessSession" (
    "id" TEXT NOT NULL,
    "purpose" "LivenessPurpose" NOT NULL,
    "challenges" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LivenessSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LivenessSession_expiresAt_idx" ON "LivenessSession"("expiresAt");

