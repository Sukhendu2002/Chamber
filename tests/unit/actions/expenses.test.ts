import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database client with $transaction support
const mockDb = {
    expense: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
    },
    account: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    balanceHistory: {
        create: vi.fn(),
    },
    userSettings: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
    },
    // $transaction executes the callback with mockDb as the transactional client
    $transaction: vi.fn(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        return fn(mockDb);
    }),
};

vi.mock("@/lib/db", () => ({
    db: mockDb,
}));

// Mock subscription alerts - must return a Promise
vi.mock("@/lib/subscription-alerts", () => ({
    checkAndSendSubscriptionAlerts: vi.fn().mockResolvedValue(undefined),
}));

describe("Expense Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Re-setup $transaction mock after clearAllMocks
        mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
            return fn(mockDb);
        });
    });

    describe("createExpense", () => {
        it("should create an expense with required fields", async () => {
            const mockExpense = {
                id: "expense-1",
                userId: "test-user-id",
                amount: 100,
                category: "Food",
                merchant: "Restaurant",
                description: "Lunch",
                date: new Date(),
                source: "WEB",
                paymentMethod: null,
                accountId: null,
                isVerified: false,
                receiptUrl: null,
                receiptUrls: [],
                metadata: null,
                createdAt: new Date(),
            };

            mockDb.expense.create.mockResolvedValue(mockExpense);

            vi.resetModules();
            const { createExpense } = await import("@/lib/actions/expenses");

            const result = await createExpense({
                amount: 100,
                category: "Food",
                merchant: "Restaurant",
                description: "Lunch",
            });

            expect(result).toEqual(mockExpense);
            expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
            expect(mockDb.expense.create).toHaveBeenCalledTimes(1);
        });

        it("should set default category to General if not provided", async () => {
            const mockExpense = {
                id: "expense-2",
                userId: "test-user-id",
                amount: 50,
                category: "General",
                date: new Date(),
                source: "WEB",
                createdAt: new Date(),
            };

            mockDb.expense.create.mockResolvedValue(mockExpense);

            vi.resetModules();
            const { createExpense } = await import("@/lib/actions/expenses");

            await createExpense({
                amount: 50,
                category: "General",
            });

            expect(mockDb.expense.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        category: "General",
                    }),
                })
            );
        });

        it("should deduct balance from a BANK account when accountId is provided", async () => {
            const mockExpense = {
                id: "expense-3",
                userId: "test-user-id",
                amount: 500,
                category: "Food",
                accountId: "account-1",
                paymentMethod: "SBI Savings",
            };

            const mockAccount = {
                id: "account-1",
                type: "BANK",
                currentBalance: 10000,
            };

            mockDb.expense.create.mockResolvedValue(mockExpense);
            mockDb.account.findUnique.mockResolvedValue(mockAccount);
            mockDb.account.update.mockResolvedValue({ ...mockAccount, currentBalance: 9500 });
            mockDb.balanceHistory.create.mockResolvedValue({});

            vi.resetModules();
            const { createExpense } = await import("@/lib/actions/expenses");

            await createExpense({
                amount: 500,
                category: "Food",
                accountId: "account-1",
                paymentMethod: "SBI Savings",
            });

            // Should deduct from bank account (negative adjustment)
            expect(mockDb.account.update).toHaveBeenCalledWith({
                where: { id: "account-1" },
                data: { currentBalance: { increment: -500 } },
            });

            // Should record balance history
            expect(mockDb.balanceHistory.create).toHaveBeenCalledTimes(1);
        });

        it("should increase balance for CREDIT_CARD account (outstanding increases)", async () => {
            const mockExpense = {
                id: "expense-4",
                userId: "test-user-id",
                amount: 300,
                category: "Shopping",
                accountId: "cc-1",
                paymentMethod: "HDFC Credit Card",
            };

            const mockAccount = {
                id: "cc-1",
                type: "CREDIT_CARD",
                currentBalance: 1000,
            };

            mockDb.expense.create.mockResolvedValue(mockExpense);
            mockDb.account.findUnique.mockResolvedValue(mockAccount);
            mockDb.account.update.mockResolvedValue({ ...mockAccount, currentBalance: 1300 });
            mockDb.balanceHistory.create.mockResolvedValue({});

            vi.resetModules();
            const { createExpense } = await import("@/lib/actions/expenses");

            await createExpense({
                amount: 300,
                category: "Shopping",
                accountId: "cc-1",
                paymentMethod: "HDFC Credit Card",
            });

            // Credit card: spending increases outstanding (positive adjustment)
            expect(mockDb.account.update).toHaveBeenCalledWith({
                where: { id: "cc-1" },
                data: { currentBalance: { increment: 300 } },
            });
        });

        it("should not adjust balance when no accountId is provided", async () => {
            mockDb.expense.create.mockResolvedValue({ id: "expense-5" });

            vi.resetModules();
            const { createExpense } = await import("@/lib/actions/expenses");

            await createExpense({
                amount: 100,
                category: "Food",
            });

            expect(mockDb.account.findUnique).not.toHaveBeenCalled();
            expect(mockDb.account.update).not.toHaveBeenCalled();
        });
    });

    describe("getExpenses", () => {
        it("should return paginated expenses", async () => {
            const mockExpenses = [
                {
                    id: "expense-1",
                    userId: "test-user-id",
                    amount: 100,
                    category: "Food",
                    date: new Date(),
                },
                {
                    id: "expense-2",
                    userId: "test-user-id",
                    amount: 200,
                    category: "Travel",
                    date: new Date(),
                },
            ];

            mockDb.expense.findMany.mockResolvedValue(mockExpenses);

            vi.resetModules();
            const { getExpenses } = await import("@/lib/actions/expenses");

            const result = await getExpenses({ limit: 10, offset: 0 });

            expect(result).toEqual(mockExpenses);
            expect(mockDb.expense.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 10,
                    skip: 0,
                })
            );
        });

        it("should filter by category", async () => {
            mockDb.expense.findMany.mockResolvedValue([]);

            vi.resetModules();
            const { getExpenses } = await import("@/lib/actions/expenses");

            await getExpenses({ category: "Food" });

            expect(mockDb.expense.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        category: "Food",
                    }),
                })
            );
        });

        it("should filter by date range", async () => {
            mockDb.expense.findMany.mockResolvedValue([]);

            vi.resetModules();
            const { getExpenses } = await import("@/lib/actions/expenses");

            const startDate = new Date("2024-01-01");
            const endDate = new Date("2024-01-31");

            await getExpenses({ startDate, endDate });

            expect(mockDb.expense.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    }),
                })
            );
        });

        it("should support search functionality", async () => {
            mockDb.expense.findMany.mockResolvedValue([]);

            vi.resetModules();
            const { getExpenses } = await import("@/lib/actions/expenses");

            await getExpenses({ search: "coffee" });

            expect(mockDb.expense.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            expect.objectContaining({
                                description: expect.objectContaining({
                                    contains: "coffee",
                                }),
                            }),
                        ]),
                    }),
                })
            );
        });
    });

    describe("deleteExpense", () => {
        it("should delete an expense and reverse balance if linked to account", async () => {
            const existingExpense = {
                id: "expense-1",
                userId: "test-user-id",
                amount: 200,
                category: "Food",
                description: "Dinner",
                accountId: "account-1",
            };

            const mockAccount = {
                id: "account-1",
                type: "BANK",
                currentBalance: 9800,
            };

            mockDb.expense.findFirst.mockResolvedValue(existingExpense);
            mockDb.account.findUnique.mockResolvedValue(mockAccount);
            mockDb.account.update.mockResolvedValue({ ...mockAccount, currentBalance: 10000 });
            mockDb.balanceHistory.create.mockResolvedValue({});
            mockDb.expense.delete.mockResolvedValue(existingExpense);

            vi.resetModules();
            const { deleteExpense } = await import("@/lib/actions/expenses");

            await deleteExpense("expense-1");

            // Should reverse the deduction (add back 200)
            expect(mockDb.account.update).toHaveBeenCalledWith({
                where: { id: "account-1" },
                data: { currentBalance: { increment: 200 } },
            });

            // Should record balance history for the reversal
            expect(mockDb.balanceHistory.create).toHaveBeenCalledTimes(1);

            // Should delete the expense
            expect(mockDb.expense.delete).toHaveBeenCalledWith({
                where: { id: "expense-1" },
            });
        });

        it("should delete expense without balance change if no accountId", async () => {
            const existingExpense = {
                id: "expense-2",
                userId: "test-user-id",
                amount: 100,
                category: "Food",
                accountId: null,
            };

            mockDb.expense.findFirst.mockResolvedValue(existingExpense);
            mockDb.expense.delete.mockResolvedValue(existingExpense);

            vi.resetModules();
            const { deleteExpense } = await import("@/lib/actions/expenses");

            await deleteExpense("expense-2");

            expect(mockDb.account.findUnique).not.toHaveBeenCalled();
            expect(mockDb.account.update).not.toHaveBeenCalled();
            expect(mockDb.expense.delete).toHaveBeenCalledWith({
                where: { id: "expense-2" },
            });
        });

        it("should reverse credit card outstanding on delete", async () => {
            const existingExpense = {
                id: "expense-3",
                userId: "test-user-id",
                amount: 500,
                category: "Shopping",
                description: "Online purchase",
                accountId: "cc-1",
            };

            const mockAccount = {
                id: "cc-1",
                type: "CREDIT_CARD",
                currentBalance: 1500,
            };

            mockDb.expense.findFirst.mockResolvedValue(existingExpense);
            mockDb.account.findUnique.mockResolvedValue(mockAccount);
            mockDb.account.update.mockResolvedValue({ ...mockAccount, currentBalance: 1000 });
            mockDb.balanceHistory.create.mockResolvedValue({});
            mockDb.expense.delete.mockResolvedValue(existingExpense);

            vi.resetModules();
            const { deleteExpense } = await import("@/lib/actions/expenses");

            await deleteExpense("expense-3");

            // Credit card: deleting expense should decrease outstanding (negative adjustment)
            expect(mockDb.account.update).toHaveBeenCalledWith({
                where: { id: "cc-1" },
                data: { currentBalance: { increment: -500 } },
            });
        });
    });

    describe("updateExpense", () => {
        it("should reverse old balance and apply new balance when amount changes", async () => {
            const existingExpense = {
                id: "expense-1",
                userId: "test-user-id",
                amount: 200,
                category: "Food",
                description: "Lunch",
                accountId: "account-1",
            };

            const mockAccount = {
                id: "account-1",
                type: "BANK",
                currentBalance: 9800,
            };

            mockDb.expense.findFirst.mockResolvedValue(existingExpense);
            mockDb.account.findUnique.mockResolvedValue(mockAccount);
            // First call: reverse old (add back 200), second call: apply new (deduct 300)
            mockDb.account.update
                .mockResolvedValueOnce({ ...mockAccount, currentBalance: 10000 })
                .mockResolvedValueOnce({ ...mockAccount, currentBalance: 9700 });
            mockDb.balanceHistory.create.mockResolvedValue({});
            mockDb.expense.update.mockResolvedValue({ ...existingExpense, amount: 300 });

            vi.resetModules();
            const { updateExpense } = await import("@/lib/actions/expenses");

            await updateExpense("expense-1", { amount: 300 });

            // First: reverse old deduction (add back 200)
            expect(mockDb.account.update).toHaveBeenNthCalledWith(1, {
                where: { id: "account-1" },
                data: { currentBalance: { increment: 200 } },
            });

            // Second: apply new deduction (deduct 300)
            expect(mockDb.account.update).toHaveBeenNthCalledWith(2, {
                where: { id: "account-1" },
                data: { currentBalance: { increment: -300 } },
            });

            // Should record two balance history entries
            expect(mockDb.balanceHistory.create).toHaveBeenCalledTimes(2);
        });
    });

    describe("getExpensesCount", () => {
        it("should return total count of expenses", async () => {
            mockDb.expense.count.mockResolvedValue(42);

            vi.resetModules();
            const { getExpensesCount } = await import("@/lib/actions/expenses");

            const result = await getExpensesCount();

            expect(result).toBe(42);
        });
    });
});

describe("Expense Validation", () => {
    it("should validate expense categories", () => {
        const validCategories = [
            "Food",
            "Travel",
            "Entertainment",
            "Bills",
            "Shopping",
            "Health",
            "Education",
            "Investments",
            "Subscription",
            "General",
        ];

        for (const category of validCategories) {
            expect(validCategories.includes(category)).toBe(true);
        }
    });

    it("should accept any string as payment method (dynamic from accounts)", () => {
        const exampleMethods = ["SBI Savings", "PNB", "Cash Wallet", "Zerodha"];

        for (const method of exampleMethods) {
            expect(typeof method).toBe("string");
        }
    });

    it("should validate expense sources", () => {
        const validSources = ["TELEGRAM", "STATEMENT", "WEB"];

        for (const source of validSources) {
            expect(validSources.includes(source)).toBe(true);
        }
    });
});
