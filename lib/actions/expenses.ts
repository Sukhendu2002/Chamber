"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type CreateExpenseInput = {
  amount: number;
  category: string;
  merchant?: string;
  description?: string;
  date?: Date;
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
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  return expense;
}

export async function getExpenses(options?: {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  category?: string;
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

  const expenses = await db.expense.findMany({
    where,
    orderBy: { date: "desc" },
    take: options?.limit,
    skip: options?.offset,
  });

  return expenses;
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
    data: input,
  });

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
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

  const expenses = await db.expense.findMany({
    where: {
      userId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  const totalSpent = expenses.reduce((sum: number, e) => sum + e.amount, 0);
  const transactionCount = expenses.length;

  const categoryBreakdown = expenses.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    },
    {}
  );

  return {
    totalSpent,
    transactionCount,
    categoryBreakdown,
    expenses: expenses.slice(0, 5),
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
  const currentMonthExpenses = expenses.filter(
    (e) => new Date(e.date) >= startOfMonth
  );
  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown for current month
  const categoryBreakdown = currentMonthExpenses.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    },
    {}
  );

  // Monthly spending trend (last 6 months)
  const monthlyData: { month: string; spent: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthName = monthDate.toLocaleDateString("en-US", { month: "short" });
    
    const monthExpenses = expenses.filter((e) => {
      const expenseDate = new Date(e.date);
      return expenseDate >= monthDate && expenseDate <= monthEnd;
    });
    
    const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
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

  const categoryData = Object.entries(categoryBreakdown).map(([name, value]) => ({
    name,
    value,
    color: categoryColors[name] || "#95A5A6",
  }));

  return {
    totalSpent,
    categoryBreakdown,
    categoryData,
    monthlyData,
  };
}
