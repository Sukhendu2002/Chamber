"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isCreditCardPaymentSource } from "@/lib/accounting";
import { db } from "@/lib/db";

const PayCreditCardBillSchema = z.object({
  sourceAccountId: z.string().uuid(),
  cardAccountId: z.string().uuid(),
  amount: z.number().positive("Payment amount must be greater than zero"),
  date: z.date().optional(),
  note: z.string().max(500).optional(),
  idempotencyKey: z.string().uuid(),
  allowOverpayment: z.boolean().default(false),
});

export type PayCreditCardBillInput = z.input<typeof PayCreditCardBillSchema>;

interface ExistingPayment {
  kind: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
}

function assertMatchingPayment(
  payment: ExistingPayment,
  input: z.output<typeof PayCreditCardBillSchema>,
) {
  const matches =
    payment.kind === "CREDIT_CARD_PAYMENT" &&
    payment.fromAccountId === input.sourceAccountId &&
    payment.toAccountId === input.cardAccountId &&
    payment.amount === input.amount;

  if (!matches) {
    throw new Error("Idempotency key has already been used for another transfer");
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  return error.code === "P2002";
}

function revalidateCreditCardViews() {
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/forecast");
}

export async function payCreditCardBill(input: PayCreditCardBillInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = PayCreditCardBillSchema.parse(input);

  if (validated.sourceAccountId === validated.cardAccountId) {
    throw new Error("Payment source and credit card must be different accounts");
  }

  const paymentDate = validated.date ?? new Date();

  const existingPayment = await db.transfer.findFirst({
    where: {
      userId,
      idempotencyKey: validated.idempotencyKey,
    },
  });

  if (existingPayment) {
    assertMatchingPayment(existingPayment, validated);
    return existingPayment;
  }

  try {
    const payment = await db.$transaction(async (tx) => {
      const [sourceAccount, cardAccount] = await Promise.all([
        tx.account.findFirst({
          where: {
            id: validated.sourceAccountId,
            userId,
            isActive: true,
          },
        }),
        tx.account.findFirst({
          where: {
            id: validated.cardAccountId,
            userId,
            isActive: true,
          },
        }),
      ]);

      if (!sourceAccount) throw new Error("Payment source account not found");
      if (!cardAccount) throw new Error("Credit card account not found");

      if (!isCreditCardPaymentSource(sourceAccount.type)) {
        throw new Error("Selected account cannot be used to pay a credit card");
      }

      if (cardAccount.type !== "CREDIT_CARD") {
        throw new Error("Destination account must be a credit card");
      }

      if (!validated.allowOverpayment && cardAccount.currentBalance <= 0) {
        throw new Error("This credit card has no outstanding balance");
      }

      if (!validated.allowOverpayment && validated.amount > cardAccount.currentBalance) {
        throw new Error("Payment exceeds the current outstanding balance");
      }

      const created = await tx.transfer.create({
        data: {
          userId,
          fromAccountId: sourceAccount.id,
          toAccountId: cardAccount.id,
          amount: validated.amount,
          kind: "CREDIT_CARD_PAYMENT",
          idempotencyKey: validated.idempotencyKey,
          note: validated.note,
          date: paymentDate,
        },
      });

      const sourceUpdate = await tx.account.updateMany({
        where: {
          id: sourceAccount.id,
          userId,
          isActive: true,
          currentBalance: { gte: validated.amount },
        },
        data: {
          currentBalance: { decrement: validated.amount },
        },
      });

      if (sourceUpdate.count !== 1) {
        throw new Error("Insufficient funds in payment source account");
      }

      const cardUpdate = validated.allowOverpayment
        ? await tx.account.updateMany({
            where: {
              id: cardAccount.id,
              userId,
              isActive: true,
              type: "CREDIT_CARD",
            },
            data: {
              currentBalance: { decrement: validated.amount },
            },
          })
        : await tx.account.updateMany({
            where: {
              id: cardAccount.id,
              userId,
              isActive: true,
              type: "CREDIT_CARD",
              currentBalance: { gte: validated.amount },
            },
            data: {
              currentBalance: { decrement: validated.amount },
            },
          });

      if (cardUpdate.count !== 1) {
        throw new Error("Credit card outstanding changed; review the payment amount and try again");
      }

      const [updatedSource, updatedCard] = await Promise.all([
        tx.account.findUniqueOrThrow({
          where: { id: sourceAccount.id },
          select: { currentBalance: true },
        }),
        tx.account.findUniqueOrThrow({
          where: { id: cardAccount.id },
          select: { currentBalance: true },
        }),
      ]);

      const paymentNote = validated.note
        ? `Credit card payment — ${cardAccount.name}: ${validated.note}`
        : `Credit card payment — ${cardAccount.name}`;

      await Promise.all([
        tx.balanceHistory.create({
          data: {
            accountId: sourceAccount.id,
            balance: updatedSource.currentBalance,
            note: paymentNote,
            date: paymentDate,
          },
        }),
        tx.balanceHistory.create({
          data: {
            accountId: cardAccount.id,
            balance: updatedCard.currentBalance,
            note: `Payment from ${sourceAccount.name}`,
            date: paymentDate,
          },
        }),
      ]);

      return created;
    });

    revalidateCreditCardViews();
    return payment;
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const duplicate = await db.transfer.findFirst({
      where: {
        userId,
        idempotencyKey: validated.idempotencyKey,
      },
    });

    if (!duplicate) throw error;

    assertMatchingPayment(duplicate, validated);
    revalidateCreditCardViews();
    return duplicate;
  }
}
