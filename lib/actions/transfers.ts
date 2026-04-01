"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type CreateTransferInput = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note?: string;
  date?: Date;
};

export type TransferWithAccounts = {
  id: string;
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  note: string | null;
  date: Date;
  createdAt: Date;
  fromAccount: { id: string; name: string; type: string };
  toAccount: { id: string; name: string; type: string };
};

export async function createTransfer(input: CreateTransferInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (input.fromAccountId === input.toAccountId) {
    throw new Error("Source and destination accounts must be different");
  }

  if (input.amount <= 0) {
    throw new Error("Transfer amount must be greater than zero");
  }

  const transferDate = input.date ?? new Date();

  // Accounts are fetched inside the transaction to prevent TOCTOU race conditions.
  // Atomic increments are used for balance updates to avoid stale-read overwrites.
  const transfer = await db.$transaction(async (tx) => {
    const [fromAccount, toAccount] = await Promise.all([
      tx.account.findFirst({ where: { id: input.fromAccountId, userId, isActive: true } }),
      tx.account.findFirst({ where: { id: input.toAccountId, userId, isActive: true } }),
    ]);

    if (!fromAccount) throw new Error("Source account not found");
    if (!toAccount) throw new Error("Destination account not found");

    if (fromAccount.currentBalance < input.amount) {
      throw new Error("Insufficient funds");
    }

    const created = await tx.transfer.create({
      data: {
        userId,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: input.amount,
        note: input.note,
        date: transferDate,
      },
    });

    const updatedFrom = await tx.account.update({
      where: { id: input.fromAccountId },
      data: { currentBalance: { increment: -input.amount } },
    });

    await tx.balanceHistory.create({
      data: {
        accountId: input.fromAccountId,
        balance: updatedFrom.currentBalance,
        note: `Transfer to ${toAccount.name}${input.note ? ` — ${input.note}` : ""}`,
        date: transferDate,
      },
    });

    const updatedTo = await tx.account.update({
      where: { id: input.toAccountId },
      data: { currentBalance: { increment: input.amount } },
    });

    await tx.balanceHistory.create({
      data: {
        accountId: input.toAccountId,
        balance: updatedTo.currentBalance,
        note: `Transfer from ${fromAccount.name}${input.note ? ` — ${input.note}` : ""}`,
        date: transferDate,
      },
    });

    return created;
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");

  return transfer;
}

export async function getTransfers(options?: {
  accountId?: string;
  limit?: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const where: Record<string, unknown> = { userId };

  if (options?.accountId) {
    where.OR = [
      { fromAccountId: options.accountId },
      { toAccountId: options.accountId },
    ];
  }

  const transfers = await db.transfer.findMany({
    where,
    include: {
      fromAccount: { select: { id: true, name: true, type: true } },
      toAccount: { select: { id: true, name: true, type: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: options?.limit ?? 50,
  });

  return transfers as TransferWithAccounts[];
}

export async function deleteTransfer(transferId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const transfer = await db.transfer.findFirst({
    where: { id: transferId, userId },
    select: {
      id: true,
      amount: true,
      fromAccountId: true,
      toAccountId: true,
      fromAccount: { select: { name: true } },
      toAccount: { select: { name: true } },
    },
  });

  if (!transfer) throw new Error("Transfer not found");

  // Reverse the balance changes using atomic increments to avoid TOCTOU race conditions
  await db.$transaction(async (tx) => {
    await tx.transfer.delete({ where: { id: transferId } });

    const updatedFrom = await tx.account.update({
      where: { id: transfer.fromAccountId },
      data: { currentBalance: { increment: transfer.amount } },
    });

    await tx.balanceHistory.create({
      data: {
        accountId: transfer.fromAccountId,
        balance: updatedFrom.currentBalance,
        note: `Transfer reversal — to ${transfer.toAccount.name}`,
        date: new Date(),
      },
    });

    const updatedTo = await tx.account.update({
      where: { id: transfer.toAccountId },
      data: { currentBalance: { increment: -transfer.amount } },
    });

    await tx.balanceHistory.create({
      data: {
        accountId: transfer.toAccountId,
        balance: updatedTo.currentBalance,
        note: `Transfer reversal — from ${transfer.fromAccount.name}`,
        date: new Date(),
      },
    });
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}
