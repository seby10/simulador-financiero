-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('FIXED_PER_INSTALLMENT', 'PERCENTAGE_REMAINING_BALANCE', 'PERCENTAGE_INITIAL_AMOUNT');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('AT_MATURITY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "InstitutionConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "institutionName" TEXT NOT NULL,
    "ruc" VARCHAR(13) NOT NULL,
    "legalRepresentative" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "logoUrl" TEXT,
    "disclaimerText" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minAmount" DECIMAL(14,2) NOT NULL,
    "maxAmount" DECIMAL(14,2) NOT NULL,
    "minTermMonths" INTEGER NOT NULL,
    "maxTermMonths" INTEGER NOT NULL,
    "annualInterestRate" DECIMAL(7,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndirectFee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "feeType" "FeeType" NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndirectFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentPlan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "minAmount" DECIMAL(14,2) NOT NULL,
    "maxAmount" DECIMAL(14,2) NOT NULL,
    "termMinDays" INTEGER NOT NULL,
    "termMaxDays" INTEGER NOT NULL,
    "tea" DECIMAL(7,4) NOT NULL,
    "allowsMonthlyPayout" BOOLEAN NOT NULL DEFAULT false,
    "requiredDocuments" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentApplication" (
    "id" TEXT NOT NULL,
    "applicantFullName" TEXT NOT NULL,
    "applicantIdNumber" VARCHAR(10) NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "sourceOfFunds" TEXT NOT NULL,
    "investmentPlanId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "termDays" INTEGER NOT NULL,
    "payoutMethod" "PayoutMethod" NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "biometricScore" DECIMAL(5,2),
    "documentUrls" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditType_name_key" ON "CreditType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "IndirectFee_name_key" ON "IndirectFee"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentPlan_name_key" ON "InvestmentPlan"("name");

-- CreateIndex
CREATE INDEX "InvestmentApplication_status_idx" ON "InvestmentApplication"("status");

-- AddForeignKey
ALTER TABLE "InvestmentApplication" ADD CONSTRAINT "InvestmentApplication_investmentPlanId_fkey" FOREIGN KEY ("investmentPlanId") REFERENCES "InvestmentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
