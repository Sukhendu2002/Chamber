"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ACCOUNT_TYPES = [
  "BANK",
  "INVESTMENT",
  "WALLET",
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "OTHER",
] as const;

const CreateAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ACCOUNT_TYPES),
  initialBalance: z.number(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
  creditLimit: z.number().positive().optional(),
});

const UpdateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(ACCOUNT_TYPES).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
});

const UpdateBalanceSchema = z.object({
  accountId: z.string().uuid(),
  newBalance: z.number(),
  note: z.string().max(200).optional(),
  date: z.date().optional(),
});

const GetAccountsOptionsSchema = z.object({
  type: z.enum(ACCOUNT_TYPES).optional(),
  includeInactive: z.boolean().optional(),
}).optional();

export type AccountTypeValue = z.infer<typeof CreateAccountSchema>["type"];
export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateBalanceInput = z.infer<typeof UpdateBalanceSchema>;

export async function createAccount(input: CreateAccountInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = CreateAccountSchema.parse(input);

  // Investment accounts are hidden from Telegram by default
  const showOnTelegram = validated.type !== "INVESTMENT";

  // Create account with initial balance
  const account = await db.account.create({
    data: {
      userId,
      name: validated.name,
      type: validated.type,
      currentBalance: validated.initialBalance,
      description: validated.description,
      icon: validated.icon,
      color: validated.color,
      creditLimit: validated.type === "CREDIT_CARD" ? validated.creditLimit : undefined,
      showOnTelegram,
    },
  });

  // Create initial balance history entry
  await db.balanceHistory.create({
    data: {
      accountId: account.id,
      balance: validated.initialBalance,
      note: "Initial balance",
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return account;
}

export async function getAccounts(options?: z.infer<typeof GetAccountsOptionsSchema>) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = GetAccountsOptionsSchema.parse(options);

  const where: {
    userId: string;
    type?: AccountTypeValue;
    isActive?: boolean;
  } = { userId };

  if (validated?.type) {
    where.type = validated.type;
  }

  if (!validated?.includeInactive) {
    where.isActive = true;
  }

  const accounts = await db.account.findMany({
    where,
    include: {
      balanceHistory: {
        orderBy: { date: "desc" },
        take: 1, // Just get latest for display
      },
    },
    orderBy: [
      { type: "asc" },
      { name: "asc" },
    ],
  });

  return accounts;
}

const IdSchema = z.string().uuid();

export async function getAccount(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);

  const account = await db.account.findFirst({
    where: { id: validatedId, userId },
    include: {
      balanceHistory: {
        orderBy: { date: "desc" },
      },
    },
  });

  return account;
}

const GetAccountWithHistorySchema = z.object({
  id: z.string().uuid(),
  months: z.number().int().positive().default(6),
});

export async function getAccountWithHistory(id: string, months: number = 6) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = GetAccountWithHistorySchema.parse({ id, months });

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - validated.months);

  const account = await db.account.findFirst({
    where: { id: validated.id, userId },
    include: {
      balanceHistory: {
        where: {
          date: { gte: startDate },
        },
        orderBy: { date: "asc" },
      },
    },
  });

  return account;
}

export async function updateAccount(
  id: string,
  input: Partial<Omit<CreateAccountInput, "initialBalance">>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);
  const validated = UpdateAccountSchema.parse(input);

  // Verify ownership
  const existing = await db.account.findFirst({
    where: { id: validatedId, userId },
  });

  if (!existing) throw new Error("Account not found");

  const account = await db.account.update({
    where: { id: validatedId },
    data: {
      name: validated.name,
      type: validated.type,
      description: validated.description,
      icon: validated.icon,
      color: validated.color,
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return account;
}

export async function updateBalance(input: UpdateBalanceInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = UpdateBalanceSchema.parse(input);

  // Verify ownership
  const account = await db.account.findFirst({
    where: { id: validated.accountId, userId },
  });

  if (!account) throw new Error("Account not found");

  // Create balance history entry
  const historyEntry = await db.balanceHistory.create({
    data: {
      accountId: validated.accountId,
      balance: validated.newBalance,
      note: validated.note,
      date: validated.date || new Date(),
    },
  });

  // Update current balance on account
  await db.account.update({
    where: { id: validated.accountId },
    data: {
      currentBalance: validated.newBalance,
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return historyEntry;
}

export async function deleteBalanceHistory(historyId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(historyId);

  // Get history entry with account
  const history = await db.balanceHistory.findUnique({
    where: { id: validatedId },
    include: { account: true },
  });

  if (!history) throw new Error("History entry not found");
  if (history.account.userId !== userId) throw new Error("Unauthorized");

  // Delete the history entry
  await db.balanceHistory.delete({
    where: { id: validatedId },
  });

  // Update account's current balance to the most recent remaining entry
  const latestHistory = await db.balanceHistory.findFirst({
    where: { accountId: history.accountId },
    orderBy: { date: "desc" },
  });

  if (latestHistory) {
    await db.account.update({
      where: { id: history.accountId },
      data: { currentBalance: latestHistory.balance },
    });
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function deleteAccount(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);

  // Verify ownership
  const existing = await db.account.findFirst({
    where: { id: validatedId, userId },
  });

  if (!existing) throw new Error("Account not found");

  // Prevent deletion if transfers exist — the linked account's balance would be left incorrect
  const transferCount = await db.transfer.count({
    where: { OR: [{ fromAccountId: id }, { toAccountId: id }] },
  });

  if (transferCount > 0) {
    throw new Error(
      `Cannot delete account with existing transfers. Please delete the ${transferCount} transfer${transferCount === 1 ? "" : "s"} first.`
    );
  }

  // Delete account (cascade will delete history)
  await db.account.delete({
    where: { id: validatedId },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function toggleShowOnTelegram(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);

  const account = await db.account.findFirst({
    where: { id: validatedId, userId },
  });

  if (!account) throw new Error("Account not found");

  await db.account.update({
    where: { id: validatedId },
    data: { showOnTelegram: !account.showOnTelegram },
  });

  revalidatePath("/accounts");
}

export async function toggleAccountActive(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);

  const account = await db.account.findFirst({
    where: { id: validatedId, userId },
  });

  if (!account) throw new Error("Account not found");

  await db.account.update({
    where: { id: validatedId },
    data: { isActive: !account.isActive },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function toggleIncludeInNetWorth(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);

  const account = await db.account.findFirst({
    where: { id: validatedId, userId },
  });

  if (!account) throw new Error("Account not found");

  await db.account.update({
    where: { id: validatedId },
    data: { includeInNetWorth: !account.includeInNetWorth },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function getAccountStats() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const accounts = await db.account.findMany({
    where: { userId, isActive: true, includeInNetWorth: true },
  });

  let totalBankBalance = 0;
  let totalInvestments = 0;
  let totalWallet = 0;
  let totalCash = 0;
  let totalCards = 0;
  let totalOther = 0;

  for (const account of accounts) {
    switch (account.type) {
      case "BANK":
        totalBankBalance += account.currentBalance;
        break;
      case "INVESTMENT":
        totalInvestments += account.currentBalance;
        break;
      case "WALLET":
        totalWallet += account.currentBalance;
        break;
      case "CASH":
        totalCash += account.currentBalance;
        break;
      case "CREDIT_CARD":
      case "DEBIT_CARD":
        totalCards += account.currentBalance;
        break;
      case "OTHER":
        totalOther += account.currentBalance;
        break;
    }
  }

  return {
    totalBankBalance,
    totalInvestments,
    totalWallet,
    totalCash,
    totalCards,
    totalOther,
    totalNetWorth: totalBankBalance + totalInvestments + totalWallet + totalCash + totalOther, // Cards excluded from net worth
    accountCount: accounts.length,
  };
}

const GetAllBalanceHistorySchema = z.object({
  months: z.number().int().positive().default(6),
});

export async function getAllBalanceHistory(months: number = 6) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = GetAllBalanceHistorySchema.parse({ months });

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - validated.months);

  // Get all accounts with their history (exclude cards from balance trend chart)
  const accounts = await db.account.findMany({
    where: {
      userId,
      isActive: true,
      type: { notIn: ["CREDIT_CARD", "DEBIT_CARD"] },
    },
    include: {
      balanceHistory: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (accounts.length === 0) {
    return { accounts: [], timeline: [] };
  }

  // Build account info for the chart
  const accountInfo: { id: string; name: string; color: string }[] = [];
  for (let i = 0; i < accounts.length; i++) {
    const a = accounts[i];
    accountInfo.push({
      id: a.id,
      name: a.name,
      color: a.color || getDefaultColor(i),
    });
  }

  // Collect ALL history entries within range, grouped by day
  // For each day, keep only the LAST balance entry per account
  type HistoryEntry = { timestamp: number; date: Date; accountId: string; balance: number };
  const allEntries: HistoryEntry[] = [];

  for (const account of accounts) {
    for (const h of account.balanceHistory) {
      if (h.date >= startDate) {
        allEntries.push({
          timestamp: h.date.getTime(),
          date: h.date,
          accountId: account.id,
          balance: h.balance,
        });
      }
    }
  }

  // Sort by timestamp
  allEntries.sort((a, b) => a.timestamp - b.timestamp);

  if (allEntries.length === 0) {
    // No history in range, return current state
    const point: Record<string, number | string> = {
      date: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    };
    for (const account of accounts) {
      point[account.id] = account.currentBalance;
    }
    return { accounts: accountInfo, timeline: [point] };
  }

  // Track which accounts have been "seen" (had their first entry)
  const seenAccounts = new Set<string>();
  
  // Aggregate entries by day — keep last balance per account per day
  // dayKey -> { accountId -> lastBalance }
  const dayMap = new Map<string, { dateObj: Date; balances: Map<string, number> }>();
  const dayOrder: string[] = [];

  for (const entry of allEntries) {
    seenAccounts.add(entry.accountId);
    const d = entry.date;
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { dateObj: d, balances: new Map() });
      dayOrder.push(dayKey);
    }
    // Overwrite with latest balance for this account on this day
    dayMap.get(dayKey)!.balances.set(entry.accountId, entry.balance);
  }

  // Build timeline with one point per day, carrying forward balances
  const currentBalances: Record<string, number | null> = {};
  for (const account of accounts) {
    currentBalances[account.id] = null; // null means "not yet created"
  }

  const timeline: Record<string, number | string | null>[] = [];

  for (const dayKey of dayOrder) {
    const dayData = dayMap.get(dayKey)!;
    
    // Update balances for accounts that had entries on this day
    for (const [accountId, balance] of dayData.balances) {
      currentBalances[accountId] = balance;
    }

    // Format date as "Feb 1", "Mar 15" etc.
    const dateStr = dayData.dateObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

    const point: Record<string, number | string | null> = { date: dateStr };
    for (const account of accounts) {
      point[account.id] = currentBalances[account.id];
    }
    timeline.push(point);
  }

  return { accounts: accountInfo, timeline };
}

// Get active accounts by userId directly (no auth check - for internal use like Telegram webhook)
export async function getAccountsByUserId(userId: string) {
  const accounts = await db.account.findMany({
    where: { userId, isActive: true, showOnTelegram: true },
    orderBy: [
      { type: "asc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  return accounts;
}

function getDefaultColor(index: number): string {
  const colors = [
    "#3b82f6", // blue
    "#22c55e", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
  ];
  return colors[index % colors.length];
}
