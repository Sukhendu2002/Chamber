"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type CreateAccountInput = {
  name: string;
  type: "BANK" | "INVESTMENT" | "WALLET" | "CASH" | "OTHER";
  initialBalance: number;
  description?: string;
  icon?: string;
  color?: string;
};

export type UpdateBalanceInput = {
  accountId: string;
  newBalance: number;
  note?: string;
  date?: Date;
};

export async function createAccount(input: CreateAccountInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Create account with initial balance
  const account = await db.account.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      currentBalance: input.initialBalance,
      description: input.description,
      icon: input.icon,
      color: input.color,
    },
  });

  // Create initial balance history entry
  await db.balanceHistory.create({
    data: {
      accountId: account.id,
      balance: input.initialBalance,
      note: "Initial balance",
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return account;
}

export async function getAccounts(options?: {
  type?: "BANK" | "INVESTMENT" | "WALLET" | "CASH" | "OTHER";
  includeInactive?: boolean;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const where: {
    userId: string;
    type?: "BANK" | "INVESTMENT" | "WALLET" | "CASH" | "OTHER";
    isActive?: boolean;
  } = { userId };

  if (options?.type) {
    where.type = options.type;
  }

  if (!options?.includeInactive) {
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

export async function getAccount(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const account = await db.account.findFirst({
    where: { id, userId },
    include: {
      balanceHistory: {
        orderBy: { date: "desc" },
      },
    },
  });

  return account;
}

export async function getAccountWithHistory(id: string, months: number = 6) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const account = await db.account.findFirst({
    where: { id, userId },
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

  // Verify ownership
  const existing = await db.account.findFirst({
    where: { id, userId },
  });

  if (!existing) throw new Error("Account not found");

  const account = await db.account.update({
    where: { id },
    data: {
      name: input.name,
      type: input.type,
      description: input.description,
      icon: input.icon,
      color: input.color,
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return account;
}

export async function updateBalance(input: UpdateBalanceInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify ownership
  const account = await db.account.findFirst({
    where: { id: input.accountId, userId },
  });

  if (!account) throw new Error("Account not found");

  // Create balance history entry
  const historyEntry = await db.balanceHistory.create({
    data: {
      accountId: input.accountId,
      balance: input.newBalance,
      note: input.note,
      date: input.date || new Date(),
    },
  });

  // Update current balance on account
  await db.account.update({
    where: { id: input.accountId },
    data: {
      currentBalance: input.newBalance,
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return historyEntry;
}

export async function deleteBalanceHistory(historyId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get history entry with account
  const history = await db.balanceHistory.findUnique({
    where: { id: historyId },
    include: { account: true },
  });

  if (!history) throw new Error("History entry not found");
  if (history.account.userId !== userId) throw new Error("Unauthorized");

  // Delete the history entry
  await db.balanceHistory.delete({
    where: { id: historyId },
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

  // Verify ownership
  const existing = await db.account.findFirst({
    where: { id, userId },
  });

  if (!existing) throw new Error("Account not found");

  // Delete account (cascade will delete history)
  await db.account.delete({
    where: { id },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function toggleAccountActive(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const account = await db.account.findFirst({
    where: { id, userId },
  });

  if (!account) throw new Error("Account not found");

  await db.account.update({
    where: { id },
    data: { isActive: !account.isActive },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function getAccountStats() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const accounts = await db.account.findMany({
    where: { userId, isActive: true },
  });

  let totalBankBalance = 0;
  let totalInvestments = 0;
  let totalWallet = 0;
  let totalCash = 0;
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
    totalOther,
    totalNetWorth: totalBankBalance + totalInvestments + totalWallet + totalCash + totalOther,
    accountCount: accounts.length,
  };
}

export async function getAllBalanceHistory(months: number = 6) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get all accounts with their history
  const accounts = await db.account.findMany({
    where: { userId, isActive: true },
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

  // Collect all unique dates from history within range
  const datesInRange = new Set<string>();
  
  // Track balance for each account at each date
  type BalanceAtDate = Record<string, number>;
  const balancesByDate: Record<string, BalanceAtDate> = {};

  // Collect ALL history entries within range with full timestamps
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
      date: new Date().toISOString().split("T")[0],
    };
    for (const account of accounts) {
      point[account.id] = account.currentBalance;
    }
    return { accounts: accountInfo, timeline: [point] };
  }

  // Track which accounts have been "seen" (had their first entry)
  const seenAccounts = new Set<string>();
  
  // Build timeline - create a data point for EACH history entry
  // Use null for accounts that haven't been created yet
  const currentBalances: Record<string, number | null> = {};
  for (const account of accounts) {
    currentBalances[account.id] = null; // null means "not yet created"
  }
  
  const timeline: Record<string, number | string | null>[] = [];

  for (let i = 0; i < allEntries.length; i++) {
    const entry = allEntries[i];
    // Mark this account as seen and update its balance
    seenAccounts.add(entry.accountId);
    currentBalances[entry.accountId] = entry.balance;

    // Format date with time and seconds for uniqueness
    const d = entry.date;
    const dateStr = `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}, ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;

    // Build data point - only include accounts that have been seen
    const point: Record<string, number | string | null> = { 
      date: dateStr,
      _index: i,
    };
    for (const account of accounts) {
      // Only include balance if account has been seen, otherwise null (won't plot)
      point[account.id] = currentBalances[account.id];
    }
    timeline.push(point);
  }

  return { accounts: accountInfo, timeline };
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
