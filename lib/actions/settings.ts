"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { isValidAiModelId } from "@/lib/openrouter-models";
import { DashboardWidgets, DEFAULT_DASHBOARD_WIDGETS } from "@/types/dashboard";

const DashboardWidgetsSchema = z.object({
  showStats: z.boolean().optional(),
  showNetWorth: z.boolean().optional(),
  showBalanceTrend: z.boolean().optional(),
  showForecast: z.boolean().optional(),
  showCalendar: z.boolean().optional(),
  showCategories: z.boolean().optional(),
  showRecent: z.boolean().optional(),
}).optional();

const UpdateUserSettingsSchema = z.object({
  monthlyBudget: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().optional(),
  dashboardWidgets: DashboardWidgetsSchema,
  forecastHorizonMonths: z.number().int().positive().optional(),
  savingsTargetPercent: z.number().nonnegative().max(100).optional(),
  monthlyIncome: z.number().nonnegative().optional(),
  salaryDay: z.number().int().min(1).max(28).optional(),
  aiAnalysisModel: z.string().refine(isValidAiModelId).nullable().optional(),
});

// Free exchange rate API (no API key needed for basic usage)
// Throws on failure to prevent silent data corruption.
async function getExchangeRate(from: string, to: string): Promise<number> {
  const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
  if (!response.ok) {
    throw new Error(`Exchange rate API returned ${response.status}`);
  }
  const data = await response.json();
  if (!data.rates?.[to]) {
    throw new Error(`No rate for ${from} → ${to}`);
  }
  return data.rates[to];
}

// Cached settings fetch
const getCachedSettings = unstable_cache(
  async (userId: string) => {
    let settings = await db.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await db.userSettings.create({
        data: {
          userId,
          monthlyBudget: 0,
          currency: "INR",
          timezone: "Asia/Kolkata",
          dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,
          forecastHorizonMonths: 6,
          savingsTargetPercent: 20,
          monthlyIncome: 0,
          salaryDay: 1,
        },
      });
    }

    // Ensure dashboardWidgets has all keys (for backwards compatibility)
    const dashboardWidgets = {
      ...DEFAULT_DASHBOARD_WIDGETS,
      ...((settings.dashboardWidgets as DashboardWidgets) || {}),
    };

    return {
      ...settings,
      dashboardWidgets,
    };
  },
  ["user-settings"],
  { revalidate: 60, tags: ["user-settings"] } // Cache for 60 seconds
);

export async function getUserSettings() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return getCachedSettings(userId);
}

export async function updateUserSettings(input: {
  monthlyBudget?: number;
  currency?: string;
  timezone?: string;
  dashboardWidgets?: DashboardWidgets;
  forecastHorizonMonths?: number;
  savingsTargetPercent?: number;
  monthlyIncome?: number;
  salaryDay?: number;
  aiAnalysisModel?: string | null;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = UpdateUserSettingsSchema.parse(input);

  const currentSettings = await db.userSettings.findUnique({
    where: { userId },
  });

  const oldCurrency = currentSettings?.currency || "INR";
  const newCurrency = validated.currency;
  let exchangeRate: number | null = null;

  // If currency is changing, convert all expenses
  if (newCurrency && newCurrency !== oldCurrency) {
    try {
      exchangeRate = await getExchangeRate(oldCurrency, newCurrency);
    } catch (error) {
      console.error("Currency conversion failed:", error);
      throw new Error(
        `Failed to convert from ${oldCurrency} to ${newCurrency}. ` +
        "Exchange rate API is unavailable. Please try again later."
      );
    }

  }

  const settings = await db.$transaction(async (tx) => {
    if (exchangeRate !== null) {
      const expenses = await tx.expense.findMany({
        where: { userId },
      });
      const convertedAt = new Date().toISOString();

      for (const expense of expenses) {
        const convertedAmount = Math.round(expense.amount * exchangeRate * 100) / 100;
        await tx.expense.update({
          where: { id: expense.id },
          data: {
            amount: convertedAmount,
            metadata: {
              ...((expense.metadata as object) || {}),
              originalAmount: expense.amount,
              originalCurrency: oldCurrency,
              exchangeRate,
              convertedAt,
            },
          },
        });
      }
    }

    return tx.userSettings.upsert({
      where: { userId },
      update: validated,
      create: {
        userId,
        monthlyBudget: validated.monthlyBudget || 0,
        currency: validated.currency || "INR",
        timezone: validated.timezone || "Asia/Kolkata",
        forecastHorizonMonths: validated.forecastHorizonMonths || 6,
        savingsTargetPercent: validated.savingsTargetPercent || 20,
        monthlyIncome: validated.monthlyIncome || 0,
        salaryDay: validated.salaryDay || 1,
        aiAnalysisModel: validated.aiAnalysisModel || null,
      },
    });
  });

  revalidateTag("user-settings", "max"); // Invalidate cached settings with SWR behavior
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/ai-analysis");
  return settings;
}

export async function generateLinkingCode() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any existing codes for this user
  await db.linkingCode.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });

  // Create new code
  const linkingCode = await db.linkingCode.create({
    data: {
      userId,
      code,
      expiresAt,
    },
  });

  return linkingCode;
}

export async function getTelegramStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const settings = await db.userSettings.findUnique({
    where: { userId },
  });

  return {
    isLinked: !!settings?.telegramChatId,
    chatId: settings?.telegramChatId,
  };
}

export async function unlinkTelegram() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.userSettings.update({
    where: { userId },
    data: { telegramChatId: null },
  });

  revalidatePath("/telegram");
}

export async function deleteAllUserData() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Delete all user's expenses
  await db.expense.deleteMany({
    where: { userId },
  });

  // Delete all user's subscriptions
  await db.subscription.deleteMany({
    where: { userId },
  });

  // Delete all user's loans (cascade will delete repayments)
  await db.loan.deleteMany({
    where: { userId },
  });

  // Delete all user's accounts (cascade will delete balance history)
  await db.account.deleteMany({
    where: { userId },
  });

  // Delete all user's linking codes
  await db.linkingCode.deleteMany({
    where: { userId },
  });

  // Delete all user's goals and recurring patterns
  await db.goal.deleteMany({ where: { userId } });
  await db.recurringPattern.deleteMany({ where: { userId } });

  // Reset user settings (keep the record but reset values)
  await db.userSettings.update({
    where: { userId },
    data: {
      monthlyBudget: 0,
      monthlyIncome: 0,
      salaryDay: 1,
      telegramChatId: null,
      aiAnalysisModel: null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/subscriptions");
  revalidatePath("/loans");
  revalidatePath("/accounts");
  revalidatePath("/settings");
}
