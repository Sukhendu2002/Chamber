"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { checkAndSendSubscriptionAlerts } from "@/lib/subscription-alerts";
import { z } from "zod";
import { getUserSettings } from "@/lib/actions/settings";
import { getNowInTimezone, getStartOfMonthInTimezone, getEndOfMonthInTimezone } from "@/lib/utils";
import { getExpenseBalanceAdjustment, isCreditCard } from "@/lib/accounting";

const EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Entertainment",
  "Bills",
  "Shopping",
  "Health",
  "Education",
  "Investments",
  "Subscription",
  "Lent Money",
  "General",
] as const;

const CreateExpenseSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  category: z.enum(EXPENSE_CATEGORIES),
  merchant: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  date: z.date().optional(),
  paymentMethod: z.string().max(100).optional(),
  accountId: z.string().uuid().optional(),
  receiptUrl: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).optional(),
});

const UpdateExpenseSchema = CreateExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;

const DATE_RANGE_PRESETS = ["this_month", "last_month", "last_3_months", "last_6_months", "this_year"] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

function getDateRangeFromPreset(preset: DateRangePreset, timezone: string): { startDate: Date; endDate: Date } {
  const now = getNowInTimezone(timezone);
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "this_month":
      return { startDate: new Date(y, m, 1), endDate: new Date(y, m + 1, 0, 23, 59, 59) };
    case "last_month":
      return { startDate: new Date(y, m - 1, 1), endDate: new Date(y, m, 0, 23, 59, 59) };
    case "last_3_months":
      return { startDate: new Date(y, m - 2, 1), endDate: new Date(y, m + 1, 0, 23, 59, 59) };
    case "last_6_months":
      return { startDate: new Date(y, m - 5, 1), endDate: new Date(y, m + 1, 0, 23, 59, 59) };
    case "this_year":
      return { startDate: new Date(y, 0, 1), endDate: new Date(y, 11, 31, 23, 59, 59) };
  }
}

const GetExpensesOptionsSchema = z.object({
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  dateRange: z.enum(DATE_RANGE_PRESETS).optional(),
  category: z.string().optional(),
  excludeCategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().max(200).optional(),
}).optional();

const GetExpensesCountOptionsSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  dateRange: z.enum(DATE_RANGE_PRESETS).optional(),
  category: z.string().optional(),
  excludeCategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().max(200).optional(),
}).optional();

const IdSchema = z.string().uuid();

const DeleteExpenseSchema = z.object({
  id: z.string().uuid(),
  reverseBalance: z.boolean().default(true),
});

interface ExpenseAccount {
  id: string;
  type: string;
  currentBalance: number;
  creditLimit: number | null;
}

function assertAvailableCredit(account: ExpenseAccount, amount: number) {
  if (
    isCreditCard(account.type) &&
    account.creditLimit !== null &&
    account.currentBalance + amount > account.creditLimit
  ) {
    throw new Error("Expense exceeds the credit card's available credit");
  }
}

type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function applyExpenseToAccount(
  tx: TransactionClient,
  userId: string,
  account: ExpenseAccount,
  amount: number,
) {
  const adjustment = getExpenseBalanceAdjustment(account.type, amount);

  if (isCreditCard(account.type) && account.creditLimit !== null) {
    const updateResult = await tx.account.updateMany({
      where: {
        id: account.id,
        userId,
        isActive: true,
        currentBalance: {
          lte: account.creditLimit - amount,
        },
      },
      data: {
        currentBalance: { increment: adjustment },
      },
    });

    if (updateResult.count !== 1) {
      throw new Error("Expense exceeds the credit card's available credit");
    }

    return tx.account.findUniqueOrThrow({
      where: { id: account.id },
    });
  }

  return tx.account.update({
    where: { id: account.id },
    data: { currentBalance: { increment: adjustment } },
  });
}

// Record a balance history entry after an account balance change
async function recordBalanceHistory(
  tx: TransactionClient,
  accountId: string,
  newBalance: number,
  note: string,
  date?: Date,
) {
  await tx.balanceHistory.create({
    data: {
      accountId,
      balance: newBalance,
      note,
      date: date || new Date(),
    },
  });
}

export async function getUserTags(): Promise<string[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const tags = await db.tag.findMany({
    where: { userId },
    select: { name: true },
    orderBy: { name: "asc" },
  });

  return tags.map((t) => t.name);
}

export async function createExpense(input: CreateExpenseInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = CreateExpenseSchema.parse(input);

  const expense = await db.$transaction(async (tx) => {
    const linkedAccount = validated.accountId
      ? await tx.account.findFirst({
          where: {
            id: validated.accountId,
            userId,
            isActive: true,
          },
        })
      : null;

    if (validated.accountId && !linkedAccount) {
      throw new Error("Account not found");
    }

    if (linkedAccount) {
      assertAvailableCredit(linkedAccount, validated.amount);
    }

    const created = await tx.expense.create({
      data: {
        userId,
        amount: validated.amount,
        category: validated.category,
        merchant: validated.merchant,
        description: validated.description,
        date: validated.date || new Date(),
        source: "WEB",
        paymentMethod: validated.paymentMethod,
        accountId: validated.accountId,
        receiptUrl: validated.receiptUrl,
      },
    });

    // Adjust account balance if linked
    if (validated.accountId && linkedAccount) {
      const updatedAccount = await applyExpenseToAccount(
        tx,
        userId,
        linkedAccount,
        validated.amount,
      );
      const label = validated.description || validated.category || "Expense";
      const expenseDate = validated.date || new Date();
      await recordBalanceHistory(tx, validated.accountId, updatedAccount.currentBalance, `Expense: ${label} (₹${validated.amount})`, expenseDate);
    }

    // Link tags
    if (validated.tags && validated.tags.length > 0) {
      for (const tagName of validated.tags) {
        const trimmed = tagName.trim().toLowerCase();
        if (!trimmed) continue;
        const tag = await tx.tag.upsert({
          where: { userId_name: { userId, name: trimmed } },
          update: {},
          create: { userId, name: trimmed },
        });
        await tx.expenseTag.create({
          data: { expenseId: created.id, tagId: tag.id },
        });
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

export async function getExpenses(options?: z.infer<typeof GetExpensesOptionsSchema>) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = GetExpensesOptionsSchema.parse(options);

  const where: Record<string, unknown> = { userId };

  // Resolve date range
  let startDate = validated?.startDate;
  let endDate = validated?.endDate;
  if (validated?.dateRange) {
    const settings = await getUserSettings();
    const range = getDateRangeFromPreset(validated.dateRange, settings.timezone || "UTC");
    startDate = range.startDate;
    endDate = range.endDate;
  }
  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, Date>).gte = startDate;
    if (endDate) (where.date as Record<string, Date>).lte = endDate;
  }

  if (validated?.category) {
    where.category = validated.category;
  } else if (validated?.excludeCategory) {
    where.category = { not: validated.excludeCategory };
  }

  if (validated?.tags && validated.tags.length > 0) {
    where.tags = {
      some: {
        tag: {
          name: { in: validated.tags, mode: "insensitive" },
        },
      },
    };
  }

  if (validated?.search) {
    where.OR = [
      { description: { contains: validated.search, mode: "insensitive" } },
      { merchant: { contains: validated.search, mode: "insensitive" } },
      { category: { contains: validated.search, mode: "insensitive" } },
      { tags: { some: { tag: { name: { contains: validated.search, mode: "insensitive" } } } } },
    ];
  }

  const expenses = await db.expense.findMany({
    where,
    include: {
      tags: { include: { tag: true } },
      loan: {
        select: {
          id: true,
          borrowerName: true,
        },
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: validated?.limit,
    skip: validated?.offset,
  });

  return expenses.map((e) => ({
    ...e,
    tags: e.tags?.map((et: { tag: { name: string } }) => et.tag.name) ?? [],
  }));
}

export async function getExpensesCount(options?: z.infer<typeof GetExpensesCountOptionsSchema>) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = GetExpensesCountOptionsSchema.parse(options);

  const where: Record<string, unknown> = { userId };

  // Resolve date range
  let startDate = validated?.startDate;
  let endDate = validated?.endDate;
  if (validated?.dateRange) {
    const settings = await getUserSettings();
    const range = getDateRangeFromPreset(validated.dateRange, settings.timezone || "UTC");
    startDate = range.startDate;
    endDate = range.endDate;
  }
  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, Date>).gte = startDate;
    if (endDate) (where.date as Record<string, Date>).lte = endDate;
  }

  if (validated?.category) {
    where.category = validated.category;
  } else if (validated?.excludeCategory) {
    where.category = { not: validated.excludeCategory };
  }

  if (validated?.tags && validated.tags.length > 0) {
    where.tags = {
      some: {
        tag: {
          name: { in: validated.tags, mode: "insensitive" },
        },
      },
    };
  }

  if (validated?.search) {
    where.OR = [
      { description: { contains: validated.search, mode: "insensitive" } },
      { merchant: { contains: validated.search, mode: "insensitive" } },
      { category: { contains: validated.search, mode: "insensitive" } },
      { tags: { some: { tag: { name: { contains: validated.search, mode: "insensitive" } } } } },
    ];
  }

  const result = await db.expense.aggregate({
    where,
    _count: { id: true },
    _sum: { amount: true },
  });

  return {
    count: result._count.id,
    totalAmount: result._sum.amount || 0,
  };
}

export async function getExpenseById(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);

  const expense = await db.expense.findFirst({
    where: { id: validatedId, userId },
  });

  return expense;
}

export async function updateExpense(
  id: string,
  input: Partial<CreateExpenseInput>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);
  const validated = UpdateExpenseSchema.parse(input);

  const result = await db.$transaction(async (tx) => {
    // Get existing expense to reverse old balance effect
    const existing = await tx.expense.findFirst({ where: { id: validatedId, userId } });
    if (!existing) throw new Error("Expense not found");
    if (existing.loanId || existing.repaymentId) {
      throw new Error("Loan-linked expenses must be managed from the loan");
    }

    // Reverse old balance effect if expense was linked to an account
    if (existing.accountId) {
      const oldAccount = await tx.account.findFirst({
        where: {
          id: existing.accountId,
          userId,
        },
      });
      if (oldAccount) {
        const reversal = -getExpenseBalanceAdjustment(oldAccount.type, existing.amount);
        const updatedOld = await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: reversal } },
        });
        await recordBalanceHistory(tx, existing.accountId, updatedOld.currentBalance, `Expense updated/moved (reversed ₹${existing.amount})`, existing.date);
      }
    }

    // Determine new accountId (use input if provided, keep existing if not specified)
    const newAccountId = validated.accountId !== undefined ? validated.accountId : existing.accountId;
    const newAmount = validated.amount !== undefined ? validated.amount : existing.amount;

    // Apply new balance effect
    if (newAccountId) {
      const newAccount = await tx.account.findFirst({
        where: {
          id: newAccountId,
          userId,
          isActive: true,
        },
      });
      if (!newAccount) throw new Error("Account not found");

      assertAvailableCredit(newAccount, newAmount);

      const updatedNew = await applyExpenseToAccount(
        tx,
        userId,
        newAccount,
        newAmount,
      );
      const label = validated.description || validated.category || "Expense";
      const expenseDate = validated.date || existing.date;
      await recordBalanceHistory(tx, newAccountId, updatedNew.currentBalance, `Expense: ${label} (₹${newAmount})`, expenseDate);
    }

    // Update the expense
    const updated = await tx.expense.update({
      where: { id: validatedId },
      data: {
        amount: validated.amount,
        category: validated.category,
        merchant: validated.merchant,
        description: validated.description,
        date: validated.date,
        paymentMethod: validated.paymentMethod,
        accountId: newAccountId,
        receiptUrl: validated.receiptUrl,
      },
    });

    // Handle tags if provided
    if (validated.tags !== undefined) {
      await tx.expenseTag.deleteMany({ where: { expenseId: validatedId } });
      for (const tagName of validated.tags) {
        const trimmed = tagName.trim().toLowerCase();
        if (!trimmed) continue;
        const tag = await tx.tag.upsert({
          where: { userId_name: { userId, name: trimmed } },
          update: {},
          create: { userId, name: trimmed },
        });
        await tx.expenseTag.create({
          data: { expenseId: validatedId, tagId: tag.id },
        });
      }
    }

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

  const validated = DeleteExpenseSchema.parse({ id, reverseBalance });

  await db.$transaction(async (tx) => {
    // Get expense to reverse balance effect
    const existing = await tx.expense.findFirst({ where: { id: validated.id, userId } });
    if (!existing) throw new Error("Expense not found");
    if (existing.loanId || existing.repaymentId) {
      throw new Error("Loan-linked expenses must be managed from the loan");
    }

    // Reverse balance effect if linked to an account (only if requested)
    if (validated.reverseBalance && existing.accountId) {
      const account = await tx.account.findFirst({
        where: {
          id: existing.accountId,
          userId,
        },
      });
      if (account) {
        const reversal = -getExpenseBalanceAdjustment(account.type, existing.amount);
        const updatedAccount = await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: reversal } },
        });
        const label = existing.description || existing.category || "Expense";
        await recordBalanceHistory(tx, existing.accountId, updatedAccount.currentBalance, `Expense deleted: ${label} (₹${existing.amount} refunded)`, existing.date);
      }
    }

    await tx.expense.delete({ where: { id: validated.id } });
  });

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/accounts");
}

export async function getMonthlyStats() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get user's timezone setting
  const settings = await getUserSettings();
  const userTimezone = settings.timezone || "UTC";

  // Use user's timezone for date calculations
  const now = getNowInTimezone(userTimezone);
  const startOfMonth = getStartOfMonthInTimezone(userTimezone);
  const endOfMonth = getEndOfMonthInTimezone(userTimezone);

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

  // Get user's timezone setting
  const settings = await getUserSettings();
  const userTimezone = settings.timezone || "UTC";

  // Use user's timezone for date calculations
  const now = getNowInTimezone(userTimezone);

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
  const startOfMonth = getStartOfMonthInTimezone(userTimezone);
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

  // Daily spending for current month (area chart)
  const dailySpendingMap: Record<string, number> = {};
  for (const exp of currentMonthExpenses) {
    const day = new Date(exp.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dailySpendingMap[day] = (dailySpendingMap[day] || 0) + exp.amount;
  }
  const dailySpending = Object.entries(dailySpendingMap).map(([date, amount]) => ({
    date,
    amount,
  }));

  // Top 5 merchants by total spend this month
  const merchantMap: Record<string, number> = {};
  for (const exp of currentMonthExpenses) {
    const merchant = exp.merchant || exp.description || exp.category;
    if (merchant) {
      merchantMap[merchant] = (merchantMap[merchant] || 0) + exp.amount;
    }
  }
  const topMerchants = Object.entries(merchantMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Average daily spend for current month
  const daysElapsed = Math.max(1, now.getDate());
  const averageDailySpend = analyticsTotalSpent / daysElapsed;

  // Previous month total for MoM comparison
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  let previousMonthSpent = 0;
  for (const exp of expenses) {
    const d = new Date(exp.date);
    if (d >= prevMonthStart && d <= prevMonthEnd) {
      previousMonthSpent += exp.amount;
    }
  }

  // Highest spending day this month
  let highestSpendingDay = { date: "", amount: 0 };
  for (const [date, amount] of Object.entries(dailySpendingMap)) {
    if (amount > highestSpendingDay.amount) {
      highestSpendingDay = { date, amount };
    }
  }

  // Transaction count this month
  const transactionCount = currentMonthExpenses.length;

  return {
    totalSpent: analyticsTotalSpent,
    categoryBreakdown: analyticsCategoryBreakdown,
    categoryData,
    monthlyData,
    dailySpending,
    topMerchants,
    averageDailySpend,
    previousMonthSpent,
    highestSpendingDay,
    transactionCount,
  };
}

export type MonthSummary = {
  month: number; // 0-indexed (0 = January)
  monthName: string;
  year: number;
  totalSpent: number;
  transactionCount: number;
  topCategory: string | null;
  avgPerTransaction: number;
  categoryBreakdown: Record<string, number>;
  hasData: boolean;
};

export async function getMonthlyHistory(year?: number): Promise<{
  months: MonthSummary[];
  yearTotal: number;
  bestMonth: MonthSummary | null;
  worstMonth: MonthSummary | null;
  avgMonthlySpend: number;
  availableYears: number[];
}> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const now = new Date();
  const targetYear = year || now.getFullYear();

  // Fetch all expenses for the target year
  const startOfYear = new Date(targetYear, 0, 1);
  const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

  const expenses = await db.expense.findMany({
    where: {
      userId,
      date: { gte: startOfYear, lte: endOfYear },
    },
    select: {
      date: true,
      amount: true,
      category: true,
    },
    orderBy: { date: "asc" },
  });

  // Also get min year for year selector
  const oldestExpense = await db.expense.findFirst({
    where: { userId },
    orderBy: { date: "asc" },
    select: { date: true },
  });

  const oldestYear = oldestExpense ? new Date(oldestExpense.date).getFullYear() : now.getFullYear();
  const availableYears: number[] = [];
  for (let y = now.getFullYear(); y >= oldestYear; y--) {
    availableYears.push(y);
  }

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Group by month
  const monthData: MonthSummary[] = MONTH_NAMES.map((monthName, idx) => ({
    month: idx,
    monthName,
    year: targetYear,
    totalSpent: 0,
    transactionCount: 0,
    topCategory: null,
    avgPerTransaction: 0,
    categoryBreakdown: {},
    hasData: false,
  }));

  for (const exp of expenses) {
    const m = new Date(exp.date).getMonth();
    const ms = monthData[m];
    ms.totalSpent += exp.amount;
    ms.transactionCount += 1;
    ms.categoryBreakdown[exp.category] = (ms.categoryBreakdown[exp.category] || 0) + exp.amount;
    ms.hasData = true;
  }

  // Compute derived fields per month
  for (const ms of monthData) {
    if (ms.hasData) {
      ms.avgPerTransaction = ms.totalSpent / ms.transactionCount;
      const topCat = Object.entries(ms.categoryBreakdown).sort((a, b) => b[1] - a[1])[0];
      ms.topCategory = topCat ? topCat[0] : null;
    }
  }

  const monthsWithData = monthData.filter((m) => m.hasData);
  const yearTotal = monthsWithData.reduce((sum, m) => sum + m.totalSpent, 0);
  const avgMonthlySpend = monthsWithData.length > 0 ? yearTotal / monthsWithData.length : 0;

  const bestMonth = monthsWithData.length > 0
    ? monthsWithData.reduce((min, m) => m.totalSpent < min.totalSpent ? m : min)
    : null;
  const worstMonth = monthsWithData.length > 0
    ? monthsWithData.reduce((max, m) => m.totalSpent > max.totalSpent ? m : max)
    : null;

  return {
    months: monthData,
    yearTotal,
    bestMonth,
    worstMonth,
    avgMonthlySpend,
    availableYears,
  };
}
