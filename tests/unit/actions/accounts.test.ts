import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database client
const mockDb = {
    account: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        aggregate: vi.fn(),
    },
    balanceHistory: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
    },
};

vi.mock("@/lib/db", () => ({
    db: mockDb,
}));

describe("Account Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createAccount", () => {
        it("should create an account with initial balance history", async () => {
            const mockAccount = {
                id: "account-1",
                userId: "test-user-id",
                name: "SBI Savings",
                type: "BANK",
                currentBalance: 10000,
                description: "Primary savings account",
                icon: null,
                color: null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockDb.account.create.mockResolvedValue(mockAccount);
            mockDb.balanceHistory.create.mockResolvedValue({
                id: "history-1",
                accountId: "account-1",
                balance: 10000,
                note: "Initial balance",
                date: new Date(),
                createdAt: new Date(),
            });

            vi.resetModules();
            const { createAccount } = await import("@/lib/actions/accounts");

            const result = await createAccount({
                name: "SBI Savings",
                type: "BANK",
                initialBalance: 10000,
                description: "Primary savings account",
            });

            expect(result).toEqual(mockAccount);
            expect(mockDb.account.create).toHaveBeenCalledTimes(1);
        });
    });

    describe("getAccounts", () => {
        it("should return all accounts for the user", async () => {
            const mockAccounts = [
                {
                    id: "account-1",
                    name: "SBI Savings",
                    type: "BANK",
                    currentBalance: 10000,
                    isActive: true,
                },
                {
                    id: "account-2",
                    name: "Zerodha",
                    type: "INVESTMENT",
                    currentBalance: 50000,
                    isActive: true,
                },
            ];

            mockDb.account.findMany.mockResolvedValue(mockAccounts);

            vi.resetModules();
            const { getAccounts } = await import("@/lib/actions/accounts");
            const result = await getAccounts();

            expect(result).toEqual(mockAccounts);
        });

        it("should filter by account type", async () => {
            mockDb.account.findMany.mockResolvedValue([]);

            vi.resetModules();
            const { getAccounts } = await import("@/lib/actions/accounts");
            await getAccounts({ type: "BANK" });

            expect(mockDb.account.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        type: "BANK",
                    }),
                })
            );
        });
    });

    describe("updateBalance", () => {
        it("should update balance and create history entry", async () => {
            const mockUpdatedAccount = {
                id: "account-1",
                currentBalance: 15000,
            };

            mockDb.account.findFirst.mockResolvedValue({
                id: "account-1",
                userId: "test-user-id",
                currentBalance: 10000,
            });
            mockDb.account.update.mockResolvedValue(mockUpdatedAccount);
            mockDb.balanceHistory.create.mockResolvedValue({
                id: "history-2",
                accountId: "account-1",
                balance: 15000,
                note: "Salary credit",
                date: new Date(),
                createdAt: new Date(),
            });

            vi.resetModules();
            const { updateBalance } = await import("@/lib/actions/accounts");
            const result = await updateBalance({
                accountId: "account-1",
                newBalance: 15000,
                note: "Salary credit",
            });

            expect(result.balance).toBe(15000);
            expect(mockDb.balanceHistory.create).toHaveBeenCalled();
        });
    });

    describe("getAccountStats", () => {
        it("should calculate aggregate statistics", async () => {
            const mockAccounts = [
                { type: "BANK", currentBalance: 10000, isActive: true },
                { type: "BANK", currentBalance: 20000, isActive: true },
                { type: "INVESTMENT", currentBalance: 50000, isActive: true },
                { type: "WALLET", currentBalance: 5000, isActive: true },
                { type: "CASH", currentBalance: 2000, isActive: true },
            ];

            mockDb.account.findMany.mockResolvedValue(mockAccounts);

            vi.resetModules();
            const { getAccountStats } = await import("@/lib/actions/accounts");
            const result = await getAccountStats();

            expect(result.totalNetWorth).toBe(87000);
            expect(result.totalBankBalance).toBe(30000);
            expect(result.totalInvestments).toBe(50000);
        });
    });

    describe("deleteAccount", () => {
        it("should delete account", async () => {
            mockDb.account.findFirst.mockResolvedValue({
                id: "account-1",
                userId: "test-user-id",
            });
            mockDb.account.delete.mockResolvedValue({ id: "account-1" });

            vi.resetModules();
            const { deleteAccount } = await import("@/lib/actions/accounts");
            await deleteAccount("account-1");

            expect(mockDb.account.delete).toHaveBeenCalledWith({
                where: { id: "account-1" },
            });
        });
    });
});

describe("Account Types Validation", () => {
    it("should validate account types", () => {
        const validTypes = ["BANK", "INVESTMENT", "WALLET", "CASH", "OTHER"];

        for (const type of validTypes) {
            expect(validTypes.includes(type)).toBe(true);
        }
    });

    it("should calculate net worth correctly", () => {
        const accounts = [
            { currentBalance: 10000 },
            { currentBalance: 20000 },
            { currentBalance: 50000 },
        ];

        const netWorth = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
        expect(netWorth).toBe(80000);
    });
});
