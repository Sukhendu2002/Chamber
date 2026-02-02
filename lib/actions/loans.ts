"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type CreateLoanInput = {
  borrowerName: string;
  borrowerPhone?: string;
  amount: number;
  lendDate: Date;
  dueDate?: Date;
  description?: string;
};

export type AddRepaymentInput = {
  loanId: string;
  amount: number;
  date: Date;
  note?: string;
};

export async function createLoan(input: CreateLoanInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const loan = await db.loan.create({
    data: {
      userId,
      borrowerName: input.borrowerName,
      borrowerPhone: input.borrowerPhone,
      amount: input.amount,
      lendDate: input.lendDate,
      dueDate: input.dueDate,
      description: input.description,
    },
  });

  revalidatePath("/loans");
  return loan;
}

export async function getLoans(options?: {
  status?: "PENDING" | "PARTIAL" | "COMPLETED";
  borrowerName?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const where: {
    userId: string;
    status?: "PENDING" | "PARTIAL" | "COMPLETED";
    borrowerName?: { contains: string; mode: "insensitive" };
  } = { userId };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.borrowerName) {
    where.borrowerName = {
      contains: options.borrowerName,
      mode: "insensitive",
    };
  }

  const loans = await db.loan.findMany({
    where,
    include: {
      repayments: {
        orderBy: { date: "desc" },
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

  const loan = await db.loan.findFirst({
    where: { id, userId },
    include: {
      repayments: {
        orderBy: { date: "desc" },
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

  // Verify ownership
  const existing = await db.loan.findFirst({
    where: { id, userId },
  });

  if (!existing) throw new Error("Loan not found");

  const loan = await db.loan.update({
    where: { id },
    data: {
      borrowerName: input.borrowerName,
      borrowerPhone: input.borrowerPhone,
      amount: input.amount,
      lendDate: input.lendDate,
      dueDate: input.dueDate,
      description: input.description,
    },
  });

  revalidatePath("/loans");
  return loan;
}

export async function deleteLoan(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify ownership
  const existing = await db.loan.findFirst({
    where: { id, userId },
  });

  if (!existing) throw new Error("Loan not found");

  await db.loan.delete({
    where: { id },
  });

  revalidatePath("/loans");
}

export async function addRepayment(input: AddRepaymentInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify loan ownership
  const loan = await db.loan.findFirst({
    where: { id: input.loanId, userId },
  });

  if (!loan) throw new Error("Loan not found");

  // Create repayment
  const repayment = await db.repayment.create({
    data: {
      loanId: input.loanId,
      amount: input.amount,
      date: input.date,
      note: input.note,
    },
  });

  // Update loan's amountRepaid and status
  const newAmountRepaid = loan.amountRepaid + input.amount;
  let newStatus: "PENDING" | "PARTIAL" | "COMPLETED" = "PENDING";

  if (newAmountRepaid >= loan.amount) {
    newStatus = "COMPLETED";
  } else if (newAmountRepaid > 0) {
    newStatus = "PARTIAL";
  }

  await db.loan.update({
    where: { id: input.loanId },
    data: {
      amountRepaid: newAmountRepaid,
      status: newStatus,
    },
  });

  revalidatePath("/loans");
  return repayment;
}

export async function deleteRepayment(repaymentId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get repayment with loan
  const repayment = await db.repayment.findUnique({
    where: { id: repaymentId },
    include: { loan: true },
  });

  if (!repayment) throw new Error("Repayment not found");

  // Verify loan ownership
  if (repayment.loan.userId !== userId) {
    throw new Error("Unauthorized");
  }

  // Delete repayment
  await db.repayment.delete({
    where: { id: repaymentId },
  });

  // Update loan's amountRepaid and status
  const newAmountRepaid = repayment.loan.amountRepaid - repayment.amount;
  let newStatus: "PENDING" | "PARTIAL" | "COMPLETED" = "PENDING";

  if (newAmountRepaid >= repayment.loan.amount) {
    newStatus = "COMPLETED";
  } else if (newAmountRepaid > 0) {
    newStatus = "PARTIAL";
  }

  await db.loan.update({
    where: { id: repayment.loanId },
    data: {
      amountRepaid: Math.max(0, newAmountRepaid),
      status: newStatus,
    },
  });

  revalidatePath("/loans");
}

export async function addLoanReceipt(loanId: string, receiptUrl: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const loan = await db.loan.findFirst({
    where: { id: loanId, userId },
  });

  if (!loan) throw new Error("Loan not found");

  await db.loan.update({
    where: { id: loanId },
    data: {
      receiptUrls: [...loan.receiptUrls, receiptUrl],
    },
  });

  revalidatePath("/loans");
}

export async function addRepaymentReceipt(repaymentId: string, receiptUrl: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const repayment = await db.repayment.findUnique({
    where: { id: repaymentId },
    include: { loan: true },
  });

  if (!repayment) throw new Error("Repayment not found");
  if (repayment.loan.userId !== userId) throw new Error("Unauthorized");

  await db.repayment.update({
    where: { id: repaymentId },
    data: {
      receiptUrls: [...repayment.receiptUrls, receiptUrl],
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
