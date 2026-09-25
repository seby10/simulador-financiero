-- CreateTable
CREATE TABLE "BiometricVerification" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "livenessScore" DECIMAL(5,2) NOT NULL,
    "matchScore" DECIMAL(5,2) NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiometricVerification_applicationId_idx" ON "BiometricVerification"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricVerification_applicationId_attempt_key" ON "BiometricVerification"("applicationId", "attempt");

-- AddForeignKey
ALTER TABLE "BiometricVerification" ADD CONSTRAINT "BiometricVerification_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "InvestmentApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
