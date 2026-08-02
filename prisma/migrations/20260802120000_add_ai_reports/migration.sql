-- CreateEnum
CREATE TYPE "AiReportType" AS ENUM ('SPENDING_REVIEW', 'SAVINGS_REVIEW', 'DEEP_ANALYSIS');

-- CreateEnum
CREATE TYPE "AiReportPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "AiReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AiReportType" NOT NULL,
    "period" "AiReportPeriod" NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "reportJson" JSONB NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiReport_userId_createdAt_idx" ON "AiReport"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiReport_userId_year_month_idx" ON "AiReport"("userId", "year", "month");
