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
  accountId?: string;
  receiptUrl?: string;
};

// For credit cards, spending increases the outstanding balance.
// For all other account types, spending decreases the balance.
function getBalanceAdjustment(accountType: string, expenseAmount: number): number {
  if (accountType === "CREDIT_CARD") {
    return expenseAmount; // increase outstanding
  }
  return -expenseAmount; // decrease balance
}

// Record a balance history entry after an account balance change
async function recordBalanceHistory(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  accountId: string,
  newBalance: number,
  note: string,
) {
  await tx.balanceHistory.create({
    data: {
      accountId,
      balance: newBalance,
      note,
      date: new Date(),
    },
  });
}

export async function createExpense(input: CreateExpenseInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const expense = await db.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        userId,
        amount: input.amount,
        category: input.category,
        merchant: input.merchant,
        description: input.description,
        date: input.date || new Date(),
        source: "WEB",
        paymentMethod: input.paymentMethod,
        accountId: input.accountId,
        receiptUrl: input.receiptUrl,
      },
    });

    // Adjust account balance if linked
    if (input.accountId) {
      const account = await tx.account.findUnique({ where: { id: input.accountId } });
      if (account) {
        const adjustment = getBalanceAdjustment(account.type, input.amount);
        const updatedAccount = await tx.account.update({
          where: { id: input.accountId },
          data: { currentBalance: { increment: adjustment } },
        });
        const label = input.description || input.category || "Expense";
        await recordBalanceHistory(tx, input.accountId, updatedAccount.currentBalance, `Expense: ${label} (₹${input.amount})`);
      }
    }

    return created;
  });

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/accounts");

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

  const result = await db.$transaction(async (tx) => {
    // Get existing expense to reverse old balance effect
    const existing = await tx.expense.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Expense not found");

    // Reverse old balance effect if expense was linked to an account
    if (existing.accountId) {
      const oldAccount = await tx.account.findUnique({ where: { id: existing.accountId } });
      if (oldAccount) {
        const reversal = -getBalanceAdjustment(oldAccount.type, existing.amount);
        const updatedOld = await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: reversal } },
        });
        await recordBalanceHistory(tx, existing.accountId, updatedOld.currentBalance, `Expense updated/moved (reversed ₹${existing.amount})`);
      }
    }

    // Determine new accountId (use input if provided, keep existing if not specified)
    const newAccountId = input.accountId !== undefined ? input.accountId : existing.accountId;
    const newAmount = input.amount !== undefined ? input.amount : existing.amount;

    // Apply new balance effect
    if (newAccountId) {
      const newAccount = await tx.account.findUnique({ where: { id: newAccountId } });
      if (newAccount) {
        const adjustment = getBalanceAdjustment(newAccount.type, newAmount);
        const updatedNew = await tx.account.update({
          where: { id: newAccountId },
          data: { currentBalance: { increment: adjustment } },
        });
        const label = input.description || input.category || "Expense";
        await recordBalanceHistory(tx, newAccountId, updatedNew.currentBalance, `Expense: ${label} (₹${newAmount})`);
      }
    }

    // Update the expense
    const updated = await tx.expense.update({
      where: { id },
      data: {
        amount: input.amount,
        category: input.category,
        merchant: input.merchant,
        description: input.description,
        date: input.date,
        paymentMethod: input.paymentMethod,
        accountId: newAccountId,
        receiptUrl: input.receiptUrl,
      },
    });

    return updated;
  });

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/accounts");

  // Check and send subscription alerts (non-blocking)
  checkAndSendSubscriptionAlerts(userId).catch(console.error);

  return result;
}

export async function deleteExpense(id: string, reverseBalance: boolean = true) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.$transaction(async (tx) => {
    // Get expense to reverse balance effect
    const existing = await tx.expense.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Expense not found");

    // Reverse balance effect if linked to an account (only if requested)
    if (reverseBalance && existing.accountId) {
      const account = await tx.account.findUnique({ where: { id: existing.accountId } });
      if (account) {
        const reversal = -getBalanceAdjustment(account.type, existing.amount);
        const updatedAccount = await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: reversal } },
        });
        const label = existing.description || existing.category || "Expense";
        await recordBalanceHistory(tx, existing.accountId, updatedAccount.currentBalance, `Expense deleted: ${label} (₹${existing.amount} refunded)`);
      }
    }

    await tx.expense.delete({ where: { id } });
  });

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/accounts");
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

  // Get 5 most recent expenses overall (for recent expenses widget)
  const recentExpenses = await db.expense.findMany({
    where: { userId },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: 5,
  });

  // Get ALL expenses for current month (for calendar widget)
  // Need to fetch a wider range for calendar to work correctly with timezone differences
  const calendarStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const calendarEndDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const calendarExpenses = await db.expense.findMany({
    where: {
      userId,
      date: {
        gte: calendarStartDate,
        lte: calendarEndDate,
      },
    },
    orderBy: [
      { date: "desc" },
      { id: "desc" },
    ],
  });

  let totalSpent = 0;
  let spentExcludingInvestment = 0;
  for (const e of monthlyExpenses) {
    totalSpent += e.amount;
    if (e.category !== "Investments") {
      spentExcludingInvestment += e.amount;
    }
  }
  const transactionCount = monthlyExpenses.length;

  const categoryBreakdown: Record<string, number> = {};
  for (const e of monthlyExpenses) {
    categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
  }

  return {
    totalSpent,
    spentExcludingInvestment,
    transactionCount,
    categoryBreakdown,
    expenses: recentExpenses, // 5 most recent expenses overall
    calendarExpenses, // All expenses for calendar widget (wider date range)
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
