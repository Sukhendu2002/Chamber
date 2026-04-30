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

export async function createLoan(input: CreateLoanInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = CreateLoanSchema.parse(input);

  const loan = await db.loan.create({
    data: {
      userId,
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

  // Verify ownership
  const existing = await db.loan.findFirst({
    where: { id: validatedId, userId },
  });

  if (!existing) throw new Error("Loan not found");

  await db.loan.delete({
    where: { id: validatedId },
  });

  revalidatePath("/loans");
}

export async function addRepayment(input: AddRepaymentInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = AddRepaymentSchema.parse(input);

  // Verify loan ownership
  const loan = await db.loan.findFirst({
    where: { id: validated.loanId, userId },
  });

  if (!loan) throw new Error("Loan not found");

  // Create repayment
  const repayment = await db.repayment.create({
    data: {
      loanId: validated.loanId,
      amount: validated.amount,
      date: validated.date,
      note: validated.note,
    },
  });

  // Update loan's amountRepaid and status
  const newAmountRepaid = loan.amountRepaid + validated.amount;
  let newStatus: "PENDING" | "PARTIAL" | "COMPLETED" = "PENDING";

  if (newAmountRepaid >= loan.amount) {
    newStatus = "COMPLETED";
  } else if (newAmountRepaid > 0) {
    newStatus = "PARTIAL";
  }

  await db.loan.update({
    where: { id: validated.loanId },
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

  const validatedId = IdSchema.parse(repaymentId);

  // Get repayment with loan
  const repayment = await db.repayment.findUnique({
    where: { id: validatedId },
    include: { loan: true },
  });

  if (!repayment) throw new Error("Repayment not found");

  // Verify loan ownership
  if (repayment.loan.userId !== userId) {
    throw new Error("Unauthorized");
  }

  // Delete repayment
  await db.repayment.delete({
    where: { id: validatedId },
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
