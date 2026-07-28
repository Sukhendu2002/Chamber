import { beforeEach, describe, expect, it, vi } from "vitest";

const UUIDS = {
  bank: "a1111111-1111-1111-a111-111111111111",
  card: "c3333333-3333-3333-8333-333333333333",
  transfer: "a5555555-5555-5555-8ddd-dddddddddddd",
  idempotency: "d4444444-4444-4444-9444-444444444444",
};

const sourceAccount = {
  id: UUIDS.bank,
  userId: "test-user-id",
  name: "Primary bank",
  type: "BANK",
  currentBalance: 100_000,
  isActive: true,
};

const cardAccount = {
  id: UUIDS.card,
  userId: "test-user-id",
  name: "Rewards card",
  type: "CREDIT_CARD",
  currentBalance: 10_000,
  creditLimit: 100_000,
  isActive: true,
};

const payment = {
  id: UUIDS.transfer,
  userId: "test-user-id",
  fromAccountId: UUIDS.bank,
  toAccountId: UUIDS.card,
  amount: 10_000,
  kind: "CREDIT_CARD_PAYMENT",
  idempotencyKey: UUIDS.idempotency,
  note: null,
  date: new Date("2026-07-26"),
  createdAt: new Date("2026-07-26"),
};

const txMock = {
  account: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  transfer: {
    create: vi.fn(),
  },
  balanceHistory: {
    create: vi.fn(),
  },
};

const mockDb = {
  transfer: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(
    async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
  ),
};

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user-id" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Credit card payment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.transfer.findFirst.mockReset();
    mockDb.$transaction.mockReset();
    txMock.account.findFirst.mockReset();
    txMock.account.updateMany.mockReset();
    txMock.account.findUniqueOrThrow.mockReset();
    txMock.transfer.create.mockReset();
    txMock.balanceHistory.create.mockReset();
    mockDb.transfer.findFirst.mockResolvedValue(null);
    mockDb.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
    );
    txMock.account.findFirst
      .mockResolvedValueOnce(sourceAccount)
      .mockResolvedValueOnce(cardAccount);
    txMock.account.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    txMock.account.findUniqueOrThrow
      .mockResolvedValueOnce({ currentBalance: 90_000 })
      .mockResolvedValueOnce({ currentBalance: 0 });
    txMock.transfer.create.mockResolvedValue(payment);
    txMock.balanceHistory.create.mockResolvedValue({});
  });

  it("moves cash to the card liability without creating another expense", async () => {
    vi.resetModules();
    const { payCreditCardBill } = await import("@/lib/actions/credit-cards");

    const result = await payCreditCardBill({
      sourceAccountId: UUIDS.bank,
      cardAccountId: UUIDS.card,
      amount: 10_000,
      idempotencyKey: UUIDS.idempotency,
    });

    expect(result).toEqual(payment);
    expect(txMock.transfer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "test-user-id",
        fromAccountId: UUIDS.bank,
        toAccountId: UUIDS.card,
        amount: 10_000,
        kind: "CREDIT_CARD_PAYMENT",
        idempotencyKey: UUIDS.idempotency,
      }),
    });
    expect(txMock.account.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: UUIDS.bank,
        userId: "test-user-id",
        isActive: true,
        currentBalance: { gte: 10_000 },
      },
      data: {
        currentBalance: { decrement: 10_000 },
      },
    });
    expect(txMock.account.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: UUIDS.card,
        userId: "test-user-id",
        isActive: true,
        type: "CREDIT_CARD",
        currentBalance: { gte: 10_000 },
      },
      data: {
        currentBalance: { decrement: 10_000 },
      },
    });
    expect(txMock.balanceHistory.create).toHaveBeenCalledTimes(2);
  });

  it("returns an existing matching payment for an idempotent retry", async () => {
    mockDb.transfer.findFirst.mockResolvedValue(payment);

    vi.resetModules();
    const { payCreditCardBill } = await import("@/lib/actions/credit-cards");

    const result = await payCreditCardBill({
      sourceAccountId: UUIDS.bank,
      cardAccountId: UUIDS.card,
      amount: 10_000,
      idempotencyKey: UUIDS.idempotency,
    });

    expect(result).toEqual(payment);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("rejects reusing an idempotency key for a different payment", async () => {
    mockDb.transfer.findFirst.mockResolvedValue({
      ...payment,
      amount: 5_000,
    });

    vi.resetModules();
    const { payCreditCardBill } = await import("@/lib/actions/credit-cards");

    await expect(
      payCreditCardBill({
        sourceAccountId: UUIDS.bank,
        cardAccountId: UUIDS.card,
        amount: 10_000,
        idempotencyKey: UUIDS.idempotency,
      }),
    ).rejects.toThrow("Idempotency key has already been used for another transfer");
  });

  it("rejects a payment above the current outstanding by default", async () => {
    vi.resetModules();
    const { payCreditCardBill } = await import("@/lib/actions/credit-cards");

    await expect(
      payCreditCardBill({
        sourceAccountId: UUIDS.bank,
        cardAccountId: UUIDS.card,
        amount: 10_001,
        idempotencyKey: UUIDS.idempotency,
      }),
    ).rejects.toThrow("Payment exceeds the current outstanding balance");

    expect(txMock.transfer.create).not.toHaveBeenCalled();
  });

  it("allows an explicitly confirmed overpayment and creates card credit", async () => {
    txMock.account.findUniqueOrThrow
      .mockReset()
      .mockResolvedValueOnce({ currentBalance: 89_000 })
      .mockResolvedValueOnce({ currentBalance: -1_000 });

    vi.resetModules();
    const { payCreditCardBill } = await import("@/lib/actions/credit-cards");

    await payCreditCardBill({
      sourceAccountId: UUIDS.bank,
      cardAccountId: UUIDS.card,
      amount: 11_000,
      idempotencyKey: UUIDS.idempotency,
      allowOverpayment: true,
    });

    expect(txMock.account.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: UUIDS.card,
        userId: "test-user-id",
        isActive: true,
        type: "CREDIT_CARD",
      },
      data: {
        currentBalance: { decrement: 11_000 },
      },
    });
  });

  it("rejects insufficient source funds atomically", async () => {
    txMock.account.updateMany.mockReset().mockResolvedValueOnce({ count: 0 });

    vi.resetModules();
    const { payCreditCardBill } = await import("@/lib/actions/credit-cards");

    await expect(
      payCreditCardBill({
        sourceAccountId: UUIDS.bank,
        cardAccountId: UUIDS.card,
        amount: 10_000,
        idempotencyKey: UUIDS.idempotency,
      }),
    ).rejects.toThrow("Insufficient funds in payment source account");
  });

  it("rejects a concurrent payment after the outstanding changes", async () => {
    txMock.account.updateMany
      .mockReset()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    vi.resetModules();
    const { payCreditCardBill } = await import("@/lib/actions/credit-cards");

    await expect(
      payCreditCardBill({
        sourceAccountId: UUIDS.bank,
        cardAccountId: UUIDS.card,
        amount: 10_000,
        idempotencyKey: UUIDS.idempotency,
      }),
    ).rejects.toThrow(
      "Credit card outstanding changed; review the payment amount and try again",
    );
  });

  it("rejects accounts outside the authenticated user's active accounts", async () => {
    txMock.account.findFirst.mockReset().mockResolvedValue(null);

    vi.resetModules();
    const { payCreditCardBill } = await import("@/lib/actions/credit-cards");

    await expect(
      payCreditCardBill({
        sourceAccountId: UUIDS.bank,
        cardAccountId: UUIDS.card,
        amount: 10_000,
        idempotencyKey: UUIDS.idempotency,
      }),
    ).rejects.toThrow("Payment source account not found");

    expect(txMock.transfer.create).not.toHaveBeenCalled();
  });
});
