"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreateTransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().positive("Transfer amount must be greater than zero"),
  note: z.string().max(500).optional(),
  date: z.date().optional(),
});

const GetTransfersOptionsSchema = z.object({
  accountId: z.string().uuid().optional(),
  limit: z.number().int().positive().optional(),
}).optional();

const DeleteTransferSchema = z.string().uuid();

export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;

// For credit cards, currentBalance represents outstanding debt.
// Transferring FROM a credit card increases debt (cash advance).
// Transferring TO a credit card decreases debt (payment).
function getTransferAdjustment(
  accountType: string,
  direction: "from" | "to",
  amount: number
): number {
  if (accountType === "CREDIT_CARD") {
    // For credit cards, direction is reversed:
    // from = money leaving card = debt increases = +amount
    // to = money entering card = debt decreases = -amount
    return direction === "from" ? amount : -amount;
  }
  // Regular accounts: from decreases balance, to increases balance
  return direction === "from" ? -amount : amount;
}

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

  const validated = CreateTransferSchema.parse(input);

  if (validated.fromAccountId === validated.toAccountId) {
    throw new Error("Source and destination accounts must be different");
  }

  const transferDate = validated.date ?? new Date();

  // Accounts are fetched inside the transaction to prevent TOCTOU race conditions.
  // Atomic increments are used for balance updates to avoid stale-read overwrites.
  const transfer = await db.$transaction(async (tx) => {
    const [fromAccount, toAccount] = await Promise.all([
      tx.account.findFirst({ where: { id: validated.fromAccountId, userId, isActive: true } }),
      tx.account.findFirst({ where: { id: validated.toAccountId, userId, isActive: true } }),
    ]);

    if (!fromAccount) throw new Error("Source account not found");
    if (!toAccount) throw new Error("Destination account not found");

    // Check sufficient funds / available credit
    if (fromAccount.type === "CREDIT_CARD") {
      const availableCredit = (fromAccount.creditLimit ?? 0) - fromAccount.currentBalance;
      if (validated.amount > availableCredit) {
        throw new Error("Insufficient credit limit");
      }
    } else {
      if (fromAccount.currentBalance < validated.amount) {
        throw new Error("Insufficient funds");
      }
    }

    const created = await tx.transfer.create({
      data: {
        userId,
        fromAccountId: validated.fromAccountId,
        toAccountId: validated.toAccountId,
        amount: validated.amount,
        note: validated.note,
        date: transferDate,
      },
    });

    const fromAdjustment = getTransferAdjustment(fromAccount.type, "from", validated.amount);
    const updatedFrom = await tx.account.update({
      where: { id: validated.fromAccountId },
      data: { currentBalance: { increment: fromAdjustment } },
    });

    await tx.balanceHistory.create({
      data: {
        accountId: validated.fromAccountId,
        balance: updatedFrom.currentBalance,
        note: `Transfer to ${toAccount.name}${validated.note ? ` — ${validated.note}` : ""}`,
        date: transferDate,
      },
    });

    const toAdjustment = getTransferAdjustment(toAccount.type, "to", validated.amount);
    const updatedTo = await tx.account.update({
      where: { id: validated.toAccountId },
      data: { currentBalance: { increment: toAdjustment } },
    });

    await tx.balanceHistory.create({
      data: {
        accountId: validated.toAccountId,
        balance: updatedTo.currentBalance,
        note: `Transfer from ${fromAccount.name}${validated.note ? ` — ${validated.note}` : ""}`,
        date: transferDate,
      },
    });

    return created;
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");

  return transfer;
}

export async function getTransfers(options?: z.infer<typeof GetTransfersOptionsSchema>) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = GetTransfersOptionsSchema.parse(options);

  const where: Record<string, unknown> = { userId };

  if (validated?.accountId) {
    where.OR = [
      { fromAccountId: validated.accountId },
      { toAccountId: validated.accountId },
    ];
  }

  const transfers = await db.transfer.findMany({
    where,
    include: {
      fromAccount: { select: { id: true, name: true, type: true } },
      toAccount: { select: { id: true, name: true, type: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: validated?.limit ?? 50,
  });

  return transfers as TransferWithAccounts[];
}

export async function deleteTransfer(transferId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = DeleteTransferSchema.parse(transferId);

  const transfer = await db.transfer.findFirst({
    where: { id: validatedId, userId },
    select: {
      id: true,
      amount: true,
      fromAccountId: true,
      toAccountId: true,
      fromAccount: { select: { name: true, type: true } },
      toAccount: { select: { name: true, type: true } },
    },
  });

  if (!transfer) throw new Error("Transfer not found");

  // Reverse the balance changes using atomic increments to avoid TOCTOU race conditions
  await db.$transaction(async (tx) => {
    await tx.transfer.delete({ where: { id: validatedId } });

    // Reversal uses the opposite direction adjustment
    const fromReversal = getTransferAdjustment(transfer.fromAccount.type, "to", transfer.amount);
    const updatedFrom = await tx.account.update({
      where: { id: transfer.fromAccountId },
      data: { currentBalance: { increment: fromReversal } },
    });

    await tx.balanceHistory.create({
      data: {
        accountId: transfer.fromAccountId,
        balance: updatedFrom.currentBalance,
        note: `Transfer reversal — to ${transfer.toAccount.name}`,
        date: new Date(),
      },
    });

    const toReversal = getTransferAdjustment(transfer.toAccount.type, "from", transfer.amount);
    const updatedTo = await tx.account.update({
      where: { id: transfer.toAccountId },
      data: { currentBalance: { increment: toReversal } },
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
