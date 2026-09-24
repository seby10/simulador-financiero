-- CreateTable
CREATE TABLE "BiometricHandoff" (
    "id" TEXT NOT NULL,
    "purpose" "LivenessPurpose" NOT NULL,
    "mobileTokenHash" TEXT NOT NULL,
    "pollTokenHash" TEXT NOT NULL,
    "userId" TEXT,
    "applicationId" TEXT,
    "email" TEXT,
    "result" JSONB,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BiometricHandoff_mobileTokenHash_key" ON "BiometricHandoff"("mobileTokenHash");

-- CreateIndex
CREATE INDEX "BiometricHandoff_expiresAt_idx" ON "BiometricHandoff"("expiresAt");

