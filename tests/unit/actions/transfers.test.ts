import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFromAccount = {
  id: "account-1",
  userId: "test-user-id",
  name: "SBI Savings",
  type: "BANK",
  currentBalance: 10000,
  isActive: true,
};

const mockToAccount = {
  id: "account-2",
  userId: "test-user-id",
  name: "HDFC Savings",
  type: "BANK",
  currentBalance: 5000,
  isActive: true,
};

const mockTransfer = {
  id: "transfer-1",
  userId: "test-user-id",
  fromAccountId: "account-1",
  toAccountId: "account-2",
  amount: 2000,
  note: "Monthly savings move",
  date: new Date("2026-04-01"),
  createdAt: new Date(),
};

// Minimal mock for prisma transaction
const txMock = {
  transfer: {
    create: vi.fn().mockResolvedValue(mockTransfer),
    delete: vi.fn(),
  },
  account: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  balanceHistory: {
    create: vi.fn(),
  },
};

const mockDb = {
  account: {
    findFirst: vi.fn(),
  },
  transfer: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  balanceHistory: {
    create: vi.fn(),
  },
  $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
};

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "test-user-id" })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("Transfer Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation(
      async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)
    );
    txMock.transfer.create.mockResolvedValue(mockTransfer);
    txMock.account.findFirst.mockReset();
    txMock.account.update.mockResolvedValue({ currentBalance: 0 });
    txMock.balanceHistory.create.mockResolvedValue({});
    txMock.transfer.delete.mockResolvedValue({});
  });

  describe("createTransfer", () => {
    it("should create a transfer and update both account balances", async () => {
      txMock.account.findFirst
        .mockResolvedValueOnce(mockFromAccount)
        .mockResolvedValueOnce(mockToAccount);

      vi.resetModules();
      const { createTransfer } = await import("@/lib/actions/transfers");

      const result = await createTransfer({
        fromAccountId: "account-1",
        toAccountId: "account-2",
        amount: 2000,
        note: "Monthly savings move",
      });

      expect(result).toEqual(mockTransfer);
      expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.transfer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "test-user-id",
            fromAccountId: "account-1",
            toAccountId: "account-2",
            amount: 2000,
          }),
        })
      );
      // Both accounts should be updated with atomic increments
      expect(txMock.account.update).toHaveBeenCalledTimes(2);
      expect(txMock.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "account-1" },
          data: { currentBalance: { increment: -2000 } },
        })
      );
      expect(txMock.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "account-2" },
          data: { currentBalance: { increment: 2000 } },
        })
      );
      // Balance history created for both accounts
      expect(txMock.balanceHistory.create).toHaveBeenCalledTimes(2);
    });

    it("should throw when source and destination accounts are the same", async () => {
      vi.resetModules();
      const { createTransfer } = await import("@/lib/actions/transfers");

      await expect(
        createTransfer({ fromAccountId: "account-1", toAccountId: "account-1", amount: 500 })
      ).rejects.toThrow("Source and destination accounts must be different");

      expect(mockDb.$transaction).not.toHaveBeenCalled();
    });

    it("should throw when amount is zero or negative", async () => {
      vi.resetModules();
      const { createTransfer } = await import("@/lib/actions/transfers");

      await expect(
        createTransfer({ fromAccountId: "account-1", toAccountId: "account-2", amount: 0 })
      ).rejects.toThrow("Transfer amount must be greater than zero");

      await expect(
        createTransfer({ fromAccountId: "account-1", toAccountId: "account-2", amount: -100 })
      ).rejects.toThrow("Transfer amount must be greater than zero");
    });

    it("should throw when source account is not found", async () => {
      txMock.account.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockToAccount);

      vi.resetModules();
      const { createTransfer } = await import("@/lib/actions/transfers");

      await expect(
        createTransfer({ fromAccountId: "account-1", toAccountId: "account-2", amount: 500 })
      ).rejects.toThrow("Source account not found");
    });

    it("should throw when destination account is not found", async () => {
      txMock.account.findFirst
        .mockResolvedValueOnce(mockFromAccount)
        .mockResolvedValueOnce(null);

      vi.resetModules();
      const { createTransfer } = await import("@/lib/actions/transfers");

      await expect(
        createTransfer({ fromAccountId: "account-1", toAccountId: "account-2", amount: 500 })
      ).rejects.toThrow("Destination account not found");
    });

    it("should throw when source account has insufficient funds", async () => {
      txMock.account.findFirst
        .mockResolvedValueOnce({ ...mockFromAccount, currentBalance: 100 })
        .mockResolvedValueOnce(mockToAccount);

      vi.resetModules();
      const { createTransfer } = await import("@/lib/actions/transfers");

      await expect(
        createTransfer({ fromAccountId: "account-1", toAccountId: "account-2", amount: 500 })
      ).rejects.toThrow("Insufficient funds");

      expect(txMock.transfer.create).not.toHaveBeenCalled();
    });

    it("should throw for unauthenticated user", async () => {
      vi.resetModules();
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValueOnce({ userId: null } as never);

      const { createTransfer } = await import("@/lib/actions/transfers");

      await expect(
        createTransfer({ fromAccountId: "account-1", toAccountId: "account-2", amount: 500 })
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("getTransfers", () => {
    it("should return transfers for the user", async () => {
      const mockTransfers = [
        {
          ...mockTransfer,
          fromAccount: { id: "account-1", name: "SBI Savings", type: "BANK" },
          toAccount: { id: "account-2", name: "HDFC Savings", type: "BANK" },
        },
      ];

      mockDb.transfer.findMany.mockResolvedValue(mockTransfers);

      vi.resetModules();
      const { getTransfers } = await import("@/lib/actions/transfers");
      const result = await getTransfers();

      expect(result).toEqual(mockTransfers);
      expect(mockDb.transfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "test-user-id" }),
          include: expect.objectContaining({
            fromAccount: expect.anything(),
            toAccount: expect.anything(),
          }),
        })
      );
    });

    it("should filter by accountId when provided", async () => {
      mockDb.transfer.findMany.mockResolvedValue([]);

      vi.resetModules();
      const { getTransfers } = await import("@/lib/actions/transfers");
      await getTransfers({ accountId: "account-1" });

      expect(mockDb.transfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { fromAccountId: "account-1" },
              { toAccountId: "account-1" },
            ],
          }),
        })
      );
    });
  });

  describe("deleteTransfer", () => {
    it("should delete a transfer and reverse both account balances", async () => {
      const transferWithAccounts = {
        ...mockTransfer,
        fromAccount: { ...mockFromAccount, currentBalance: 8000 },
        toAccount: { ...mockToAccount, currentBalance: 7000 },
      };

      mockDb.transfer.findFirst.mockResolvedValue(transferWithAccounts);

      vi.resetModules();
      const { deleteTransfer } = await import("@/lib/actions/transfers");
      await deleteTransfer("transfer-1");

      expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.transfer.delete).toHaveBeenCalledWith({ where: { id: "transfer-1" } });
      // From account restored with atomic increment
      expect(txMock.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "account-1" },
          data: { currentBalance: { increment: 2000 } },
        })
      );
      // To account reversed with atomic increment
      expect(txMock.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "account-2" },
          data: { currentBalance: { increment: -2000 } },
        })
      );
    });

    it("should throw when transfer is not found", async () => {
      mockDb.transfer.findFirst.mockResolvedValue(null);

      vi.resetModules();
      const { deleteTransfer } = await import("@/lib/actions/transfers");

      await expect(deleteTransfer("bad-id")).rejects.toThrow("Transfer not found");
    });
  });
});
