"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { checkAndSendSubscriptionAlerts } from "@/lib/subscription-alerts";

export type CreateExpenseInput = {
  amount: number;
  category: string;
  merchant?: string;
  description?: string;
  date?: Date;
  paymentMethod?: string;
  receiptUrl?: string;
};

export async function createExpense(input: CreateExpenseInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const expense = await db.expense.create({
    data: {
      userId,
      amount: input.amount,
      category: input.category,
      merchant: input.merchant,
      description: input.description,
      date: input.date || new Date(),
      source: "WEB",
      paymentMethod: input.paymentMethod as "PNB" | "SBI" | "CASH" | "CREDIT" | undefined,
      receiptUrl: input.receiptUrl,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/expenses");

  // Check and send subscription alerts (non-blocking)
  checkAndSendSubscriptionAlerts(userId).catch(console.error);

  return expense;
}

export async function getExpenses(options?: {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  category?: string;
  search?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const where: Record<string, unknown> = { userId };

  if (options?.startDate || options?.endDate) {
    where.date = {};
    if (options.startDate) (where.date as Record<string, Date>).gte = options.startDate;
    if (options.endDate) (where.date as Record<string, Date>).lte = options.endDate;
  }

  if (options?.category) {
    where.category = options.category;
  }

  if (options?.search) {
    where.OR = [
      { description: { contains: options.search, mode: "insensitive" } },
      { merchant: { contains: options.search, mode: "insensitive" } },
      { category: { contains: options.search, mode: "insensitive" } },
    ];
  }

  const expenses = await db.expense.findMany({
    where,
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: options?.limit,
    skip: options?.offset,
  });

  return expenses;
}

export async function getExpensesCount(options?: {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  search?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const where: Record<string, unknown> = { userId };

  if (options?.startDate || options?.endDate) {
    where.date = {};
    if (options.startDate) (where.date as Record<string, Date>).gte = options.startDate;
    if (options.endDate) (where.date as Record<string, Date>).lte = options.endDate;
  }

  if (options?.category) {
    where.category = options.category;
  }

  if (options?.search) {
    where.OR = [
      { description: { contains: options.search, mode: "insensitive" } },
      { merchant: { contains: options.search, mode: "insensitive" } },
      { category: { contains: options.search, mode: "insensitive" } },
    ];
  }

  const count = await db.expense.count({ where });
  return count;
}

export async function getExpenseById(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const expense = await db.expense.findFirst({
    where: { id, userId },
  });

  return expense;
}

export async function updateExpense(
  id: string,
  input: Partial<CreateExpenseInput>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const expense = await db.expense.updateMany({
    where: { id, userId },
    data: {
      ...input,
      paymentMethod: input.paymentMethod as "PNB" | "SBI" | "CASH" | "CREDIT" | undefined,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/expenses");

  // Check and send subscription alerts (non-blocking)
  checkAndSendSubscriptionAlerts(userId).catch(console.error);

  return expense;
}

export async function deleteExpense(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.expense.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
}

export async function getMonthlyStats() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get expenses for current month (for stats)
  const monthlyExpenses = await db.expense.findMany({
    where: {
      userId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
  });

  // Get 5 most recent expenses overall (same query as expense list)
  const recentExpenses = await db.expense.findMany({
    where: { userId },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: 5,
  });

  let totalSpent = 0;
  for (const e of monthlyExpenses) {
    totalSpent += e.amount;
  }
  const transactionCount = monthlyExpenses.length;

  const categoryBreakdown: Record<string, number> = {};
  for (const e of monthlyExpenses) {
    categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
  }

  return {
    totalSpent,
    transactionCount,
    categoryBreakdown,
    expenses: recentExpenses, // 5 most recent expenses overall
  };
}

export async function getAnalyticsData() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const now = new Date();
  
  // Get expenses for the last 6 months
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  
  const expenses = await db.expense.findMany({
    where: {
      userId,
      date: {
        gte: sixMonthsAgo,
      },
    },
    orderBy: { date: "asc" },
  });

  // Current month stats
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthExpenses: typeof expenses = [];
  for (const exp of expenses) {
    if (new Date(exp.date) >= startOfMonth) {
      currentMonthExpenses.push(exp);
    }
  }
  let analyticsTotalSpent = 0;
  for (const exp of currentMonthExpenses) {
    analyticsTotalSpent += exp.amount;
  }

  // Category breakdown for current month
  const analyticsCategoryBreakdown: Record<string, number> = {};
  for (const exp of currentMonthExpenses) {
    analyticsCategoryBreakdown[exp.category] = (analyticsCategoryBreakdown[exp.category] || 0) + exp.amount;
  }

  // Monthly spending trend (last 6 months)
  const monthlyData: { month: string; spent: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthName = monthDate.toLocaleDateString("en-US", { month: "short" });
    
    const monthExpenses: typeof expenses = [];
    for (const exp of expenses) {
      const expenseDate = new Date(exp.date);
      if (expenseDate >= monthDate && expenseDate <= monthEnd) {
        monthExpenses.push(exp);
      }
    }
    
    let spent = 0;
    for (const exp of monthExpenses) {
      spent += exp.amount;
    }
    monthlyData.push({ month: monthName, spent });
  }

  // Category data for pie chart
  const categoryColors: Record<string, string> = {
    Food: "#0088FE",
    Travel: "#00C49F",
    Entertainment: "#FFBB28",
    Bills: "#FF8042",
    Shopping: "#8884D8",
    Health: "#FF6B6B",
    Education: "#4ECDC4",
    General: "#95A5A6",
  };

  const categoryData = Object.entries(analyticsCategoryBreakdown).map(([name, value]) => ({
    name,
    value,
    color: categoryColors[name] || "#95A5A6",
  }));

  return {
    totalSpent: analyticsTotalSpent,
    categoryBreakdown: analyticsCategoryBreakdown,
    categoryData,
    monthlyData,
  };
}
