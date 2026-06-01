"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const LOAN_STATUSES = ["PENDING", "PARTIAL", "COMPLETED"] as const;

const CreateLoanSchema = z.object({
  borrowerName: z.string().min(1).max(200),
  borrowerPhone: z.string().max(20).optional(),
  amount: z.number().positive("Amount must be greater than 0"),
  lendDate: z.date(),
  dueDate: z.date().optional(),
  description: z.string().max(500).optional(),
  accountId: z.string().uuid().optional(),
});

const UpdateLoanSchema = CreateLoanSchema.partial();

const AddRepaymentSchema = z.object({
  loanId: z.string().uuid(),
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.date(),
  note: z.string().max(500).optional(),
});

const GetLoansOptionsSchema = z.object({
  status: z.enum(LOAN_STATUSES).optional(),
  borrowerName: z.string().max(200).optional(),
}).optional();

const IdSchema = z.string().uuid();

export type CreateLoanInput = z.infer<typeof CreateLoanSchema>;
export type AddRepaymentInput = z.infer<typeof AddRepaymentSchema>;

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

// For credit cards, spending increases the outstanding balance.
// For all other account types, spending decreases the balance.
// Negative amounts (e.g., refunds) reverse the effect naturally.
function getBalanceAdjustment(accountType: string, amount: number): number {
  if (accountType === "CREDIT_CARD") {
    return amount;
  }
  return -amount;
}

async function recordBalanceHistory(
  tx: TxClient,
  accountId: string,
  newBalance: number,
  note: string,
  date: Date
) {
  await tx.balanceHistory.create({
    data: {
      accountId,
      balance: newBalance,
      note,
      date,
    },
  });
}

export async function createLoan(input: CreateLoanInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = CreateLoanSchema.parse(input);

  const loan = await db.$transaction(async (tx) => {
    const created = await tx.loan.create({
      data: {
        userId,
        borrowerName: validated.borrowerName,
        borrowerPhone: validated.borrowerPhone,
        amount: validated.amount,
        lendDate: validated.lendDate,
        dueDate: validated.dueDate,
        description: validated.description,
        accountId: validated.accountId,
      },
    });

    if (validated.accountId) {
      const account = await tx.account.findUnique({ where: { id: validated.accountId } });
      if (account) {
        await tx.expense.create({
          data: {
            userId,
            amount: validated.amount,
            category: "Lent Money",
            description: `Lent to ${validated.borrowerName}${validated.description ? ` — ${validated.description}` : ""}`,
            date: validated.lendDate,
            accountId: validated.accountId,
            loanId: created.id,
            paymentMethod: account.name,
          },
        });

        const adjustment = getBalanceAdjustment(account.type, validated.amount);
        const updatedAccount = await tx.account.update({
          where: { id: validated.accountId },
          data: { currentBalance: { increment: adjustment } },
        });
        await recordBalanceHistory(
          tx,
          validated.accountId,
          updatedAccount.currentBalance,
          `Loan given to ${validated.borrowerName} (₹${validated.amount})`,
          validated.lendDate
        );
      }
    }

    return created;
  });

  revalidatePath("/loans");
  revalidatePath("/expenses");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return loan;
}

export async function getLoans(options?: z.infer<typeof GetLoansOptionsSchema>) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = GetLoansOptionsSchema.parse(options);

  const where: {
    userId: string;
    status?: "PENDING" | "PARTIAL" | "COMPLETED";
    borrowerName?: { contains: string; mode: "insensitive" };
  } = { userId };

  if (validated?.status) {
    where.status = validated.status;
  }

  if (validated?.borrowerName) {
    where.borrowerName = {
      contains: validated.borrowerName,
      mode: "insensitive",
    };
  }

  const loans = await db.loan.findMany({
    where,
    include: {
      repayments: {
        orderBy: { date: "desc" },
      },
      account: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: [
      { status: "asc" }, // PENDING first, then PARTIAL, then COMPLETED
      { lendDate: "desc" },
    ],
  });

  return loans;
}

export async function getLoan(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);

  const loan = await db.loan.findFirst({
    where: { id: validatedId, userId },
    include: {
      repayments: {
        orderBy: { date: "desc" },
      },
      account: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  return loan;
}

export async function updateLoan(
  id: string,
  input: Partial<CreateLoanInput>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);
  const validated = UpdateLoanSchema.parse(input);

  // Verify ownership
  const existing = await db.loan.findFirst({
    where: { id: validatedId, userId },
  });

  if (!existing) throw new Error("Loan not found");

  const loan = await db.loan.update({
    where: { id: validatedId },
    data: {
      borrowerName: validated.borrowerName,
      borrowerPhone: validated.borrowerPhone,
      amount: validated.amount,
      lendDate: validated.lendDate,
      dueDate: validated.dueDate,
      description: validated.description,
    },
  });

  revalidatePath("/loans");
  return loan;
}

export async function deleteLoan(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(id);

  await db.$transaction(async (tx) => {
    const existing = await db.loan.findFirst({ where: { id: validatedId, userId } });
    if (!existing) throw new Error("Loan not found");

    const linkedExpenses = await tx.expense.findMany({
      where: { loanId: validatedId, userId },
    });

    for (const expense of linkedExpenses) {
      if (expense.accountId) {
        const account = await tx.account.findUnique({ where: { id: expense.accountId } });
        if (account) {
          const reversal = -getBalanceAdjustment(account.type, expense.amount);
          const updatedAccount = await tx.account.update({
            where: { id: expense.accountId },
            data: { currentBalance: { increment: reversal } },
          });
          await recordBalanceHistory(
            tx,
            expense.accountId,
            updatedAccount.currentBalance,
            `Loan to ${existing.borrowerName} reversed (₹${expense.amount})`,
            expense.date
          );
        }
      }
    }

    await tx.expense.deleteMany({ where: { loanId: validatedId } });

    await tx.loan.delete({
      where: { id: validatedId },
    });
  });

  revalidatePath("/loans");
  revalidatePath("/expenses");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function addRepayment(input: AddRepaymentInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = AddRepaymentSchema.parse(input);

  const repayment = await db.$transaction(async (tx) => {
    const loan = await tx.loan.findFirst({ where: { id: validated.loanId, userId } });
    if (!loan) throw new Error("Loan not found");

    const created = await tx.repayment.create({
      data: {
        loanId: validated.loanId,
        amount: validated.amount,
        date: validated.date,
        note: validated.note,
      },
    });

    const newAmountRepaid = loan.amountRepaid + validated.amount;
    let newStatus: "PENDING" | "PARTIAL" | "COMPLETED" = "PENDING";

    if (newAmountRepaid >= loan.amount) {
      newStatus = "COMPLETED";
    } else if (newAmountRepaid > 0) {
      newStatus = "PARTIAL";
    }

    await tx.loan.update({
      where: { id: validated.loanId },
      data: {
        amountRepaid: newAmountRepaid,
        status: newStatus,
      },
    });

    if (loan.accountId) {
      const account = await tx.account.findUnique({ where: { id: loan.accountId } });
      if (account) {
        await tx.expense.create({
          data: {
            userId,
            amount: -validated.amount,
            category: "Lent Money",
            description: `Repayment from ${loan.borrowerName}${validated.note ? ` — ${validated.note}` : ""}`,
            date: validated.date,
            accountId: loan.accountId,
            loanId: loan.id,
            repaymentId: created.id,
            paymentMethod: account.name,
          },
        });

        const adjustment = getBalanceAdjustment(account.type, -validated.amount);
        const updatedAccount = await tx.account.update({
          where: { id: loan.accountId },
          data: { currentBalance: { increment: adjustment } },
        });
        await recordBalanceHistory(
          tx,
          loan.accountId,
          updatedAccount.currentBalance,
          `Loan repayment from ${loan.borrowerName} (₹${validated.amount})`,
          validated.date
        );
      }
    }

    return created;
  });

  revalidatePath("/loans");
  revalidatePath("/expenses");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return repayment;
}

export async function deleteRepayment(repaymentId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedId = IdSchema.parse(repaymentId);

  await db.$transaction(async (tx) => {
    const repayment = await tx.repayment.findUnique({
      where: { id: validatedId },
      include: { loan: true },
    });

    if (!repayment) throw new Error("Repayment not found");
    if (repayment.loan.userId !== userId) throw new Error("Unauthorized");

    const refundExpense = await tx.expense.findFirst({ where: { repaymentId: validatedId } });
    if (refundExpense?.accountId) {
      const account = await tx.account.findUnique({ where: { id: refundExpense.accountId } });
      if (account) {
        const reversal = -getBalanceAdjustment(account.type, refundExpense.amount);
        const updatedAccount = await tx.account.update({
          where: { id: refundExpense.accountId },
          data: { currentBalance: { increment: reversal } },
        });
        await recordBalanceHistory(
          tx,
          refundExpense.accountId,
          updatedAccount.currentBalance,
          `Loan repayment reversed from ${repayment.loan.borrowerName} (₹${repayment.amount})`,
          refundExpense.date
        );
      }
    }
    if (refundExpense) {
      await tx.expense.delete({ where: { id: refundExpense.id } });
    }

    await tx.repayment.delete({ where: { id: validatedId } });

    const newAmountRepaid = Math.max(0, repayment.loan.amountRepaid - repayment.amount);
    let newStatus: "PENDING" | "PARTIAL" | "COMPLETED" = "PENDING";

    if (newAmountRepaid >= repayment.loan.amount) {
      newStatus = "COMPLETED";
    } else if (newAmountRepaid > 0) {
      newStatus = "PARTIAL";
    }

    await tx.loan.update({
      where: { id: repayment.loanId },
      data: {
        amountRepaid: newAmountRepaid,
        status: newStatus,
      },
    });
  });

  revalidatePath("/loans");
  revalidatePath("/expenses");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

const AddReceiptSchema = z.object({
  id: z.string().uuid(),
  receiptUrl: z.string().max(500),
});

export async function addLoanReceipt(loanId: string, receiptUrl: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = AddReceiptSchema.parse({ id: loanId, receiptUrl });

  const loan = await db.loan.findFirst({
    where: { id: validated.id, userId },
  });

  if (!loan) throw new Error("Loan not found");

  await db.loan.update({
    where: { id: validated.id },
    data: {
      receiptUrls: [...loan.receiptUrls, validated.receiptUrl],
    },
  });

  revalidatePath("/loans");
}

export async function addRepaymentReceipt(repaymentId: string, receiptUrl: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = AddReceiptSchema.parse({ id: repaymentId, receiptUrl });

  const repayment = await db.repayment.findUnique({
    where: { id: validated.id },
    include: { loan: true },
  });

  if (!repayment) throw new Error("Repayment not found");
  if (repayment.loan.userId !== userId) throw new Error("Unauthorized");

  await db.repayment.update({
    where: { id: validated.id },
    data: {
      receiptUrls: [...repayment.receiptUrls, validated.receiptUrl],
    },
  });

  revalidatePath("/loans");
}

export async function getLoanStats() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const loans = await db.loan.findMany({
    where: { userId },
  });

  let totalLent = 0;
  let totalRepaid = 0;
  let pendingCount = 0;
  let completedCount = 0;

  for (const loan of loans) {
    totalLent += loan.amount;
    totalRepaid += loan.amountRepaid;
    if (loan.status === "COMPLETED") {
      completedCount++;
    } else {
      pendingCount++;
    }
  }

  return {
    totalLent,
    totalRepaid,
    totalOutstanding: totalLent - totalRepaid,
    pendingCount,
    completedCount,
    totalLoans: loans.length,
  };
}
