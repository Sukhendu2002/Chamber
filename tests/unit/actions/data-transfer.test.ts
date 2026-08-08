import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    account: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    expense: {
      createManyAndReturn: vi.fn(),
    },
    balanceHistory: {
      create: vi.fn(),
    },
  };

  return {
    transaction,
    db: {
      account: {
        findMany: vi.fn(),
      },
      userCategory: {
        findMany: vi.fn(),
      },
      expense: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    },
  };
});

vi.mock("@/lib/db", () => ({ db: mocks.db }));

const REQUEST = {
  csvText: [
    "Date,Description,Amount,Type",
    "2026-08-01,Coffee Shop,120,DR",
    "2026-08-02,Salary,50000,CR",
    "bad-date,Groceries,750,DR",
  ].join("\n"),
  fileName: "statement.csv",
  mapping: {
    date: "Date",
    amount: "Amount",
    description: "Description",
    type: "Type",
  },
  dateFormat: "ymd" as const,
  amountMode: "all" as const,
};

describe("data transfer actions", () => {
  beforeEach(() => {
    mocks.db.expense.findMany.mockResolvedValue([]);
    mocks.db.account.findMany.mockResolvedValue([]);
    mocks.db.userCategory.findMany.mockResolvedValue([]);
    mocks.transaction.account.findFirst.mockResolvedValue(null);
    mocks.transaction.account.findUniqueOrThrow.mockResolvedValue({ currentBalance: 0 });
    mocks.transaction.expense.createManyAndReturn.mockResolvedValue([{ amount: 120 }]);
  });

  it("returns a dry-run summary without writing data", async () => {
    const { previewExpenseImport } = await import("@/lib/actions/data-transfer");
    const preview = await previewExpenseImport(REQUEST);

    expect(preview.summary).toEqual({
      total: 3,
      ready: 1,
      duplicates: 0,
      invalid: 1,
      credits: 1,
    });
    expect(preview.rows.map(({ status }) => status)).toEqual([
      "ready",
      "credit",
      "invalid",
    ]);
    expect(mocks.transaction.expense.createManyAndReturn).not.toHaveBeenCalled();
  });

  it("detects duplicates using existing expense data", async () => {
    mocks.db.expense.findMany.mockResolvedValue([
      {
        date: new Date("2026-08-01T00:00:00Z"),
        amount: 120,
        merchant: null,
        description: "Coffee Shop",
        importFingerprint: null,
      },
    ]);
    const { previewExpenseImport } = await import("@/lib/actions/data-transfer");
    const preview = await previewExpenseImport(REQUEST);

    expect(preview.summary.ready).toBe(0);
    expect(preview.summary.duplicates).toBe(1);
    expect(preview.rows[0].status).toBe("duplicate");
  });

  it("imports only valid expense rows with a stable fingerprint", async () => {
    const { importExpensesFromCsv } = await import("@/lib/actions/data-transfer");
    const result = await importExpensesFromCsv(REQUEST);

    expect(result).toEqual({ imported: 1, duplicates: 0, invalid: 1, credits: 1 });
    expect(mocks.transaction.expense.createManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: [
          expect.objectContaining({
            amount: 120,
            source: "STATEMENT",
            isVerified: true,
            importFingerprint: "2026-08-01|12000|coffee shop",
          }),
        ],
      }),
    );
  });

  it("loads active accounts and combines default and custom categories", async () => {
    mocks.db.account.findMany.mockResolvedValue([
      { id: "a1111111-1111-4111-8111-111111111111", name: "Checking", type: "BANK" },
    ]);
    mocks.db.userCategory.findMany.mockResolvedValue([{ name: "Pets" }]);
    const { getDataTransferContext } = await import("@/lib/actions/data-transfer");
    const context = await getDataTransferContext();

    expect(context.accounts[0].name).toBe("Checking");
    expect(context.categories).toContain("General");
    expect(context.categories).toContain("Pets");
  });
});
