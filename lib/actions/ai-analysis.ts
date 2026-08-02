"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import {
  AiReportContentSchema,
  generateAiReportContent,
  resolveAiReportRange,
  summarizeAiAnalysisData,
} from "@/lib/ai-analysis";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  AI_REPORT_PERIODS,
  AI_REPORT_TYPES,
  type AiAnalysisPageData,
  type AiPeriodPreview,
  type AiReportListItem,
  type AiReportRecord,
  type AiReportRequest,
} from "@/types/ai-analysis";

const AiReportRequestSchema = z.object({
  type: z.enum(AI_REPORT_TYPES),
  period: z.enum(AI_REPORT_PERIODS),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).optional(),
});

const AiReportIdSchema = z.string().uuid();

interface StoredAiReport {
  id: string;
  type: string;
  period: string;
  year: number;
  month: number | null;
  periodStart: Date;
  periodEnd: Date;
  transactionCount: number;
  currency: string;
  reportJson: unknown;
  createdAt: Date;
}

interface StoredAiReportsResult {
  reports: StoredAiReport[];
  storageReady: boolean;
}

const AI_REPORT_STORAGE_ERROR =
  "AI Analysis is temporarily unavailable while its database setup finishes";

function isMissingAiReportTable(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "P2021";
}

function rethrowAiReportStorageError(error: unknown): never {
  if (isMissingAiReportTable(error)) {
    throw new Error(AI_REPORT_STORAGE_ERROR);
  }
  throw error;
}

async function getRecentReportsForUser(userId: string): Promise<StoredAiReportsResult> {
  try {
    const reports = await db.aiReport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    return {
      reports: reports as StoredAiReport[],
      storageReady: true,
    };
  } catch (error: unknown) {
    if (!isMissingAiReportTable(error)) throw error;
    return { reports: [], storageReady: false };
  }
}

function validateReportRequest(input: AiReportRequest): AiReportRequest {
  const validated = AiReportRequestSchema.parse(input);
  const now = new Date();

  if (validated.period === "MONTHLY" && validated.month === undefined) {
    throw new Error("Choose a month for this report");
  }

  if (validated.year > now.getFullYear()) {
    throw new Error("Future periods cannot be analyzed");
  }

  if (
    validated.period === "MONTHLY"
    && validated.year === now.getFullYear()
    && validated.month !== undefined
    && validated.month > now.getMonth() + 1
  ) {
    throw new Error("Future periods cannot be analyzed");
  }

  return validated.period === "YEARLY"
    ? { ...validated, month: undefined }
    : validated;
}

function toReportListItem(report: StoredAiReport): AiReportListItem {
  return {
    id: report.id,
    type: AiReportRequestSchema.shape.type.parse(report.type),
    period: AiReportRequestSchema.shape.period.parse(report.period),
    year: report.year,
    month: report.month,
    createdAt: report.createdAt.toISOString(),
  };
}

function toReportRecord(report: StoredAiReport): AiReportRecord | null {
  const content = AiReportContentSchema.safeParse(report.reportJson);
  if (!content.success) return null;

  return {
    ...toReportListItem(report),
    periodStart: report.periodStart.toISOString(),
    periodEnd: report.periodEnd.toISOString(),
    transactionCount: report.transactionCount,
    currency: report.currency,
    content: content.data,
  };
}

async function getPreviewForUser(
  userId: string,
  request: AiReportRequest,
): Promise<AiPeriodPreview> {
  const validated = validateReportRequest(request);
  const range = resolveAiReportRange(validated);
  const [transactionCount, settings] = await Promise.all([
    db.expense.count({
      where: {
        userId,
        date: { gte: range.start, lte: range.end },
      },
    }),
    db.userSettings.findUnique({
      where: { userId },
      select: { monthlyBudget: true, monthlyIncome: true },
    }),
  ]);

  return {
    transactionCount,
    budgetReady: (settings?.monthlyBudget || 0) > 0,
    incomeReady: (settings?.monthlyIncome || 0) > 0,
  };
}

export async function getAiAnalysisPageData(): Promise<AiAnalysisPageData> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const now = new Date();
  const initialRequest: AiReportRequest = {
    type: "DEEP_ANALYSIS",
    period: "MONTHLY",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };

  const [oldestExpense, initialPreview, storedReportResult] = await Promise.all([
    db.expense.findFirst({
      where: { userId },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    getPreviewForUser(userId, initialRequest),
    getRecentReportsForUser(userId),
  ]);

  const oldestYear = oldestExpense?.date.getFullYear() || now.getFullYear();
  const availableYears: number[] = [];
  for (let year = now.getFullYear(); year >= oldestYear; year--) {
    availableYears.push(year);
  }

  const storedReports = storedReportResult.reports;
  const latestReport = storedReports
    .map(toReportRecord)
    .find((report): report is AiReportRecord => report !== null) || null;

  return {
    currentYear: now.getFullYear(),
    currentMonth: now.getMonth() + 1,
    availableYears,
    reportStorageReady: storedReportResult.storageReady,
    initialPreview,
    recentReports: storedReports.map(toReportListItem),
    latestReport,
  };
}

export async function getAiPeriodPreview(
  input: AiReportRequest,
): Promise<AiPeriodPreview> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return getPreviewForUser(userId, input);
}

export async function getAiReport(id: string): Promise<AiReportRecord> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = AiReportIdSchema.parse(id);
  let report;
  try {
    report = await db.aiReport.findFirst({
      where: { id: validatedId, userId },
    });
  } catch (error: unknown) {
    rethrowAiReportStorageError(error);
  }

  if (!report) throw new Error("Report not found");

  const parsed = toReportRecord(report as StoredAiReport);
  if (!parsed) throw new Error("This saved report is no longer readable");
  return parsed;
}

export async function generateAiReport(
  input: AiReportRequest,
): Promise<AiReportRecord> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const request = validateReportRequest(input);
  const range = resolveAiReportRange(request);

  const [settings, expenses, previousExpenses, subscriptions, goals] = await Promise.all([
    db.userSettings.findUnique({
      where: { userId },
      select: {
        currency: true,
        monthlyBudget: true,
        monthlyIncome: true,
        savingsTargetPercent: true,
      },
    }),
    db.expense.findMany({
      where: {
        userId,
        date: { gte: range.start, lte: range.end },
      },
      select: { amount: true, category: true, merchant: true, date: true },
      orderBy: { date: "asc" },
    }),
    db.expense.findMany({
      where: {
        userId,
        date: { gte: range.previousStart, lte: range.previousEnd },
      },
      select: { amount: true, category: true, merchant: true, date: true },
      orderBy: { date: "asc" },
    }),
    db.subscription.findMany({
      where: { userId, isActive: true },
      select: { name: true, amount: true, billingCycle: true },
      orderBy: { amount: "desc" },
      take: 20,
    }),
    db.goal.findMany({
      where: { userId, status: "ACTIVE" },
      select: {
        type: true,
        targetAmount: true,
        currentAmount: true,
        deadline: true,
      },
      orderBy: { deadline: { sort: "asc", nulls: "last" } },
      take: 12,
    }),
  ]);

  if (expenses.length === 0) {
    throw new Error("No expenses were found for the selected period");
  }

  const resolvedSettings = settings || {
    currency: "INR",
    monthlyBudget: 0,
    monthlyIncome: 0,
    savingsTargetPercent: 20,
  };

  if (request.type === "SAVINGS_REVIEW" && resolvedSettings.monthlyIncome <= 0) {
    throw new Error("Add your monthly income in Settings before generating a savings review");
  }

  const rateLimit = checkRateLimit(`ai-analysis:${userId}`, 6, 60 * 60 * 1000);
  if (!rateLimit.success) {
    throw new Error(`AI report limit reached. Try again in ${rateLimit.retryAfter} seconds`);
  }

  const context = summarizeAiAnalysisData({
    request,
    range,
    settings: resolvedSettings,
    expenses,
    previousExpenses,
    subscriptions,
    goals,
  });
  const generated = await generateAiReportContent(context);

  let savedReport;
  try {
    savedReport = await db.aiReport.create({
      data: {
        userId,
        type: request.type,
        period: request.period,
        year: request.year,
        month: request.period === "MONTHLY" ? request.month : null,
        periodStart: range.start,
        periodEnd: range.end,
        transactionCount: expenses.length,
        currency: resolvedSettings.currency,
        reportJson: generated.content as unknown as Prisma.InputJsonValue,
        model: generated.model,
      },
    });
  } catch (error: unknown) {
    rethrowAiReportStorageError(error);
  }

  revalidatePath("/ai-analysis");

  const report = toReportRecord(savedReport as StoredAiReport);
  if (!report) throw new Error("The generated report could not be saved");
  return report;
}
