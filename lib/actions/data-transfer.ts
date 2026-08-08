"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { getExpenseBalanceAdjustment, isCreditCard } from "@/lib/accounting";
import {
  createExpenseFingerprint,
  formatLocalDate,
  normalizeCsvRows,
  parseCsv,
  type NormalizedImportRow,
} from "@/lib/data-transfer/csv";
import { ExpenseImportRequestSchema } from "@/lib/data-transfer/schemas";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import type {
  DataTransferContext,
  ExpenseImportPreview,
  ExpenseImportRequest,
  ExpenseImportResult,
  ImportPreviewRow,
  ImportPreviewSummary,
} from "@/types/data-transfer";

const DEFAULT_CATEGORIES = [
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
];

interface PreparedImportRow extends NormalizedImportRow {
  fingerprint?: string;
  status: ImportPreviewRow["status"];
  message?: string;
}

interface PreparedImport {
  rows: PreparedImportRow[];
  summary: ImportPreviewSummary;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

async function prepareExpenseImport(
  userId: string,
  input: ExpenseImportRequest,
): Promise<PreparedImport> {
  const parsedCsv = parseCsv(input.csvText);
  const mappedHeaders = Object.values(input.mapping).filter(Boolean);
  const unknownHeader = mappedHeaders.find((header) => !parsedCsv.headers.includes(header));
  if (unknownHeader) throw new Error(`Mapped column not found: ${unknownHeader}`);
  if (!input.mapping.description && !input.mapping.merchant) {
    throw new Error("Map at least one description or merchant column");
  }

  const normalizedRows = normalizeCsvRows(
    parsedCsv.rows,
    input.mapping,
    input.dateFormat,
    input.amountMode,
  );
  const validDates = normalizedRows
    .map((row) => row.date)
    .filter((date): date is Date => date !== null);
  const existing = validDates.length > 0
    ? await db.expense.findMany({
        where: {
          userId,
          date: {
            gte: startOfLocalDay(new Date(Math.min(...validDates.map((date) => date.getTime())))),
            lte: endOfLocalDay(new Date(Math.max(...validDates.map((date) => date.getTime())))),
          },
        },
        select: {
          date: true,
          amount: true,
          merchant: true,
          description: true,
          importFingerprint: true,
        },
      })
    : [];
  const fingerprints = new Set(
    existing.map(
      (expense) =>
        expense.importFingerprint ||
        createExpenseFingerprint({
          date: expense.date,
          amount: expense.amount,
          merchant: expense.merchant,
          description: expense.description,
        }),
    ),
  );

  const summary: ImportPreviewSummary = {
    total: normalizedRows.length,
    ready: 0,
    duplicates: 0,
    invalid: 0,
    credits: 0,
  };
  const rows: PreparedImportRow[] = normalizedRows.map((row) => {
    if (row.error || !row.date || row.amount === null) {
      summary.invalid += 1;
      return { ...row, status: "invalid", message: row.error || "Invalid row" };
    }
    if (row.isCredit) {
      summary.credits += 1;
      return { ...row, status: "credit", message: "Credit or income row skipped" };
    }

    const fingerprint = createExpenseFingerprint({
      date: row.date,
      amount: row.amount,
      merchant: row.merchant,
      description: row.description,
    });
    if (fingerprints.has(fingerprint)) {
      summary.duplicates += 1;
      return { ...row, fingerprint, status: "duplicate", message: "Already imported" };
    }

    fingerprints.add(fingerprint);
    summary.ready += 1;
    return { ...row, fingerprint, status: "ready" };
  });

  return { rows, summary };
}

function toPreviewRow(row: PreparedImportRow): ImportPreviewRow {
  return {
    rowNumber: row.rowNumber,
    date: row.date ? formatLocalDate(row.date) : null,
    amount: row.amount,
    description: row.description,
    merchant: row.merchant,
    category: row.category,
    paymentMethod: row.paymentMethod,
    status: row.status,
    message: row.message,
  };
}

export async function getDataTransferContext(): Promise<DataTransferContext> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [accounts, userCategories] = await Promise.all([
    db.account.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
    db.userCategory.findMany({
      where: { userId },
      select: { name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return {
    accounts,
    categories: Array.from(
      new Set([...DEFAULT_CATEGORIES, ...userCategories.map(({ name }) => name)]),
    ),
  };
}

export async function previewExpenseImport(
  input: ExpenseImportRequest,
): Promise<ExpenseImportPreview> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const rateLimit = checkRateLimit(`data-import-preview:${userId}`, 30, 60_000);
  if (!rateLimit.success) {
    throw new Error(`Too many import previews. Try again in ${rateLimit.retryAfter} seconds`);
  }

  const validated = ExpenseImportRequestSchema.parse(input);
  const prepared = await prepareExpenseImport(userId, validated);
  const previewRows = prepared.rows.slice(0, 200).map(toPreviewRow);

  return {
    rows: previewRows,
    summary: prepared.summary,
    previewTruncated: prepared.rows.length > previewRows.length,
  };
}

export async function importExpensesFromCsv(
  input: ExpenseImportRequest,
): Promise<ExpenseImportResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const rateLimit = checkRateLimit(`data-import:${userId}`, 10, 60_000);
  if (!rateLimit.success) {
    throw new Error(`Too many imports. Try again in ${rateLimit.retryAfter} seconds`);
  }

  const validated = ExpenseImportRequestSchema.parse(input);
  const prepared = await prepareExpenseImport(userId, validated);
  const readyRows = prepared.rows.filter(
    (row): row is PreparedImportRow & { date: Date; amount: number; fingerprint: string } =>
      row.status === "ready" &&
      row.date !== null &&
      row.amount !== null &&
      Boolean(row.fingerprint),
  );

  if (readyRows.length === 0) {
    return {
      imported: 0,
      duplicates: prepared.summary.duplicates,
      invalid: prepared.summary.invalid,
      credits: prepared.summary.credits,
    };
  }

  const importedAt = new Date();
  const created = await db.$transaction(async (transaction) => {
    const account = validated.accountId
      ? await transaction.account.findFirst({
          where: { id: validated.accountId, userId, isActive: true },
          select: {
            id: true,
            name: true,
            type: true,
            currentBalance: true,
            creditLimit: true,
          },
        })
      : null;
    if (validated.accountId && !account) throw new Error("Account not found");

    const inserted = await transaction.expense.createManyAndReturn({
      data: readyRows.map((row) => ({
        userId,
        amount: row.amount,
        category: row.category,
        merchant: row.merchant || null,
        description: row.description || null,
        source: "STATEMENT" as const,
        paymentMethod: row.paymentMethod || account?.name || null,
        accountId: account?.id || null,
        date: row.date,
        isVerified: true,
        importFingerprint: row.fingerprint,
        metadata: {
          import: {
            fileName: validated.fileName,
            importedAt: importedAt.toISOString(),
          },
        },
      })),
      skipDuplicates: true,
      select: { amount: true },
    });

    if (account && inserted.length > 0) {
      const totalAmount = inserted.reduce((total, expense) => total + expense.amount, 0);
      const adjustment = getExpenseBalanceAdjustment(account.type, totalAmount);

      if (
        isCreditCard(account.type) &&
        account.creditLimit !== null &&
        account.currentBalance + totalAmount > account.creditLimit
      ) {
        throw new Error("Imported expenses exceed the credit card's available credit");
      }

      if (isCreditCard(account.type) && account.creditLimit !== null) {
        const updateResult = await transaction.account.updateMany({
          where: {
            id: account.id,
            userId,
            currentBalance: { lte: account.creditLimit - totalAmount },
          },
          data: { currentBalance: { increment: adjustment } },
        });
        if (updateResult.count !== 1) {
          throw new Error("Imported expenses exceed the credit card's available credit");
        }
      } else {
        await transaction.account.update({
          where: { id: account.id },
          data: { currentBalance: { increment: adjustment } },
        });
      }
      const updatedAccount = await transaction.account.findUniqueOrThrow({
        where: { id: account.id },
        select: { currentBalance: true },
      });
      await transaction.balanceHistory.create({
        data: {
          accountId: account.id,
          balance: updatedAccount.currentBalance,
          date: importedAt,
          note: `CSV import: ${inserted.length} expenses`,
        },
      });
    }

    return inserted;
  });

  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/accounts");
  revalidatePath("/import");

  return {
    imported: created.length,
    duplicates: prepared.summary.duplicates + (readyRows.length - created.length),
    invalid: prepared.summary.invalid,
    credits: prepared.summary.credits,
  };
}
