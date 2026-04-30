"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { DashboardWidgets, DEFAULT_DASHBOARD_WIDGETS } from "@/types/dashboard";

const DashboardWidgetsSchema = z.object({
  showStats: z.boolean().optional(),
  showNetWorth: z.boolean().optional(),
  showBalanceTrend: z.boolean().optional(),
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
});

// Free exchange rate API (no API key needed for basic usage)
async function getExchangeRate(from: string, to: string): Promise<number> {
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const data = await response.json();
    return data.rates[to] || 1;
  } catch (error) {
    console.error("Failed to fetch exchange rate:", error);
    return 1; // Fallback to 1:1 if API fails
  }
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
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = UpdateUserSettingsSchema.parse(input);

  const currentSettings = await db.userSettings.findUnique({
    where: { userId },
  });

  const oldCurrency = currentSettings?.currency || "INR";
  const newCurrency = validated.currency;

  // If currency is changing, convert all expenses
  if (newCurrency && newCurrency !== oldCurrency) {
    const exchangeRate = await getExchangeRate(oldCurrency, newCurrency);

    // Get all user's expenses
    const expenses = await db.expense.findMany({
      where: { userId },
    });

    // Update each expense with converted amount
    for (const expense of expenses) {
      const convertedAmount = Math.round(expense.amount * exchangeRate * 100) / 100;
      await db.expense.update({
        where: { id: expense.id },
        data: {
          amount: convertedAmount,
          metadata: {
            ...((expense.metadata as object) || {}),
            originalAmount: expense.amount,
            originalCurrency: oldCurrency,
            exchangeRate,
            convertedAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  const settings = await db.userSettings.upsert({
    where: { userId },
    update: validated,
    create: {
      userId,
      monthlyBudget: validated.monthlyBudget || 0,
      currency: validated.currency || "INR",
      timezone: validated.timezone || "Asia/Kolkata",
      forecastHorizonMonths: validated.forecastHorizonMonths || 6,
      savingsTargetPercent: validated.savingsTargetPercent || 20,
    },
  });

  revalidateTag("user-settings", "max"); // Invalidate cached settings with SWR behavior
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
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

export async function exportExpensesCSV() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const expenses = await db.expense.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  const subscriptions = await db.subscription.findMany({
    where: { userId },
    orderBy: { nextBillingDate: "asc" },
  });

  // Create CSV for expenses
  const expenseHeaders = ["Date", "Description", "Merchant", "Category", "Amount", "Payment Method", "Source", "Receipt URLs"];
  const expenseRows: string[][] = [];
  for (const e of expenses) {
    // Combine legacy receiptUrl and new receiptUrls array
    const receipts: string[] = [...(e.receiptUrls || [])];
    if (e.receiptUrl && !receipts.includes(e.receiptUrl)) {
      receipts.unshift(e.receiptUrl);
    }
    // Generate full URLs for receipts (they need to be accessed via the API)
    const receiptLinks = receipts.map((_: string, idx: number) => `/api/receipt/${e.id}?index=${idx}`).join("; ");

    expenseRows.push([
      new Date(e.date).toISOString().split("T")[0],
      e.description || "",
      e.merchant || "",
      e.category,
      e.amount.toString(),
      e.paymentMethod || "",
      e.source,
      receiptLinks,
    ]);
  }

  const expenseCSV = [
    expenseHeaders.join(","),
    ...expenseRows.map((row: string[]) => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  // Create CSV for subscriptions
  const subHeaders = ["Name", "Amount", "Billing Cycle", "Next Billing Date", "Payment Method", "Active", "Alert Days Before"];
  const subRows: string[][] = [];
  for (const s of subscriptions) {
    subRows.push([
      s.name,
      s.amount.toString(),
      s.billingCycle,
      new Date(s.nextBillingDate).toISOString().split("T")[0],
      s.paymentMethod || "",
      s.isActive ? "Yes" : "No",
      s.alertDaysBefore.toString(),
    ]);
  }

  const subscriptionCSV = [
    subHeaders.join(","),
    ...subRows.map((row: string[]) => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return {
    expenses: expenseCSV,
    subscriptions: subscriptionCSV,
  };
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
      telegramChatId: null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/subscriptions");
  revalidatePath("/loans");
  revalidatePath("/accounts");
  revalidatePath("/settings");
}
