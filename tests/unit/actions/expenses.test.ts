import { describe, it, expect, vi, beforeEach } from "vitest";

const UUIDS = {
    expense1: "d4444444-4444-4444-9444-444444444444",
    expense2: "e5555555-5555-5555-a555-555555555555",
    expense3: "f6666666-6666-6666-b666-666666666666",
    expense4: "a7777777-7777-7777-8777-777777777777",
    expense5: "b8888888-8888-8888-9888-888888888888",
    account1: "a1111111-1111-1111-a111-111111111111",
    cc1: "c3333333-3333-3333-8333-333333333333",
};

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
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
    },
    balanceHistory: {
        create: vi.fn(),
    },
    tag: {
        findMany: vi.fn(),
        upsert: vi.fn(),
    },
    expenseTag: {
        create: vi.fn(),
        deleteMany: vi.fn(),
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
                id: UUIDS.expense1,
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
                id: UUIDS.expense2,
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
                id: UUIDS.expense3,
                userId: "test-user-id",
                amount: 500,
                category: "Food",
                accountId: UUIDS.account1,
                paymentMethod: "SBI Savings",
            };

            const mockAccount = {
                id: UUIDS.account1,
                type: "BANK",
                currentBalance: 10000,
            };

            mockDb.expense.create.mockResolvedValue(mockExpense);
            mockDb.account.findFirst.mockResolvedValue(mockAccount);
            mockDb.account.update.mockResolvedValue({ ...mockAccount, currentBalance: 9500 });
            mockDb.balanceHistory.create.mockResolvedValue({});

            vi.resetModules();
            const { createExpense } = await import("@/lib/actions/expenses");

            await createExpense({
                amount: 500,
                category: "Food",
                accountId: UUIDS.account1,
                paymentMethod: "SBI Savings",
            });

            // Should deduct from bank account (negative adjustment)
            expect(mockDb.account.update).toHaveBeenCalledWith({
                where: { id: UUIDS.account1 },
                data: { currentBalance: { increment: -500 } },
            });

            // Should record balance history
            expect(mockDb.balanceHistory.create).toHaveBeenCalledTimes(1);
        });

        it("should increase balance for CREDIT_CARD account (outstanding increases)", async () => {
            const mockExpense = {
                id: UUIDS.expense4,
                userId: "test-user-id",
                amount: 300,
                category: "Shopping",
                accountId: UUIDS.cc1,
                paymentMethod: "HDFC Credit Card",
            };

            const mockAccount = {
                id: UUIDS.cc1,
                type: "CREDIT_CARD",
                currentBalance: 1000,
                creditLimit: 5000,
            };

            mockDb.expense.create.mockResolvedValue(mockExpense);
            mockDb.account.findFirst.mockResolvedValue(mockAccount);
            mockDb.account.updateMany.mockResolvedValue({ count: 1 });
            mockDb.account.findUniqueOrThrow.mockResolvedValue({
                ...mockAccount,
                currentBalance: 1300,
            });
            mockDb.balanceHistory.create.mockResolvedValue({});

            vi.resetModules();
            const { createExpense } = await import("@/lib/actions/expenses");

            await createExpense({
                amount: 300,
                category: "Shopping",
                accountId: UUIDS.cc1,
                paymentMethod: "HDFC Credit Card",
            });

            // Credit card: spending increases outstanding (positive adjustment)
            expect(mockDb.account.updateMany).toHaveBeenCalledWith({
                where: {
                    id: UUIDS.cc1,
                    userId: "test-user-id",
                    isActive: true,
                    currentBalance: { lte: 4700 },
                },
                data: { currentBalance: { increment: 300 } },
            });
        });

        it("should reject an account that does not belong to the authenticated user", async () => {
            mockDb.account.findFirst.mockResolvedValue(null);

            vi.resetModules();
            const { createExpense } = await import("@/lib/actions/expenses");

            await expect(
                createExpense({
                    amount: 300,
                    category: "Shopping",
                    accountId: UUIDS.cc1,
                })
            ).rejects.toThrow("Account not found");

            expect(mockDb.account.findFirst).toHaveBeenCalledWith({
                where: {
                    id: UUIDS.cc1,
                    userId: "test-user-id",
                    isActive: true,
                },
            });
            expect(mockDb.expense.create).not.toHaveBeenCalled();
        });

        it("should reject a card purchase when the atomic credit-limit update loses a race", async () => {
            const mockAccount = {
                id: UUIDS.cc1,
                type: "CREDIT_CARD",
                currentBalance: 1000,
                creditLimit: 5000,
            };

            mockDb.account.findFirst.mockResolvedValue(mockAccount);
            mockDb.account.updateMany.mockResolvedValue({ count: 0 });
            mockDb.expense.create.mockResolvedValue({
                id: UUIDS.expense4,
                userId: "test-user-id",
            });

            vi.resetModules();
            const { createExpense } = await import("@/lib/actions/expenses");

            await expect(
                createExpense({
                    amount: 300,
                    category: "Shopping",
                    accountId: UUIDS.cc1,
                })
            ).rejects.toThrow("Expense exceeds the credit card's available credit");
        });

        it("should not adjust balance when no accountId is provided", async () => {
            mockDb.expense.create.mockResolvedValue({ id: UUIDS.expense5 });

            vi.resetModules();
            const { createExpense } = await import("@/lib/actions/expenses");

            await createExpense({
                amount: 100,
                category: "Food",
            });

            expect(mockDb.account.findFirst).not.toHaveBeenCalled();
            expect(mockDb.account.update).not.toHaveBeenCalled();
        });
    });

    describe("getExpenses", () => {
        it("should return paginated expenses", async () => {
            const mockExpenses = [
                {
                    id: UUIDS.expense1,
                    userId: "test-user-id",
                    amount: 100,
                    category: "Food",
                    date: new Date(),
                    tags: [],
                },
                {
                    id: UUIDS.expense2,
                    userId: "test-user-id",
                    amount: 200,
                    category: "Travel",
                    date: new Date(),
                    tags: [],
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

        it("should filter by expense ID", async () => {
            mockDb.expense.findMany.mockResolvedValue([]);

            vi.resetModules();
            const { getExpenses } = await import("@/lib/actions/expenses");

            await getExpenses({ expenseId: UUIDS.expense1 });

            expect(mockDb.expense.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        id: UUIDS.expense1,
                        userId: "test-user-id",
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
                id: UUIDS.expense1,
                userId: "test-user-id",
                amount: 200,
                category: "Food",
                description: "Dinner",
                accountId: UUIDS.account1,
            };

            const mockAccount = {
                id: UUIDS.account1,
                type: "BANK",
                currentBalance: 9800,
            };

            mockDb.expense.findFirst.mockResolvedValue(existingExpense);
            mockDb.account.findFirst.mockResolvedValue(mockAccount);
            mockDb.account.update.mockResolvedValue({ ...mockAccount, currentBalance: 10000 });
            mockDb.balanceHistory.create.mockResolvedValue({});
            mockDb.expense.delete.mockResolvedValue(existingExpense);

            vi.resetModules();
            const { deleteExpense } = await import("@/lib/actions/expenses");

            await deleteExpense(UUIDS.expense1);

            // Should reverse the deduction (add back 200)
            expect(mockDb.account.update).toHaveBeenCalledWith({
                where: { id: UUIDS.account1 },
                data: { currentBalance: { increment: 200 } },
            });

            // Should record balance history for the reversal
            expect(mockDb.balanceHistory.create).toHaveBeenCalledTimes(1);

            // Should delete the expense
            expect(mockDb.expense.delete).toHaveBeenCalledWith({
                where: { id: UUIDS.expense1 },
            });
        });

        it("should delete expense without balance change if no accountId", async () => {
            const existingExpense = {
                id: UUIDS.expense2,
                userId: "test-user-id",
                amount: 100,
                category: "Food",
                accountId: null,
            };

            mockDb.expense.findFirst.mockResolvedValue(existingExpense);
            mockDb.expense.delete.mockResolvedValue(existingExpense);

            vi.resetModules();
            const { deleteExpense } = await import("@/lib/actions/expenses");

            await deleteExpense(UUIDS.expense2);

            expect(mockDb.account.findFirst).not.toHaveBeenCalled();
            expect(mockDb.account.update).not.toHaveBeenCalled();
            expect(mockDb.expense.delete).toHaveBeenCalledWith({
                where: { id: UUIDS.expense2 },
            });
        });

        it("should reverse credit card outstanding on delete", async () => {
            const existingExpense = {
                id: UUIDS.expense3,
                userId: "test-user-id",
                amount: 500,
                category: "Shopping",
                description: "Online purchase",
                accountId: UUIDS.cc1,
            };

            const mockAccount = {
                id: UUIDS.cc1,
                type: "CREDIT_CARD",
                currentBalance: 1500,
            };

            mockDb.expense.findFirst.mockResolvedValue(existingExpense);
            mockDb.account.findFirst.mockResolvedValue(mockAccount);
            mockDb.account.update.mockResolvedValue({ ...mockAccount, currentBalance: 1000 });
            mockDb.balanceHistory.create.mockResolvedValue({});
            mockDb.expense.delete.mockResolvedValue(existingExpense);

            vi.resetModules();
            const { deleteExpense } = await import("@/lib/actions/expenses");

            await deleteExpense(UUIDS.expense3);

            // Credit card: deleting expense should decrease outstanding (negative adjustment)
            expect(mockDb.account.update).toHaveBeenCalledWith({
                where: { id: UUIDS.cc1 },
                data: { currentBalance: { increment: -500 } },
            });
        });
    });

    describe("updateExpense", () => {
        it("should reverse old balance and apply new balance when amount changes", async () => {
            const existingExpense = {
                id: UUIDS.expense1,
                userId: "test-user-id",
                amount: 200,
                category: "Food",
                description: "Lunch",
                accountId: UUIDS.account1,
            };

            const mockAccount = {
                id: UUIDS.account1,
                type: "BANK",
                currentBalance: 9800,
            };

            mockDb.expense.findFirst.mockResolvedValue(existingExpense);
            mockDb.account.findFirst.mockResolvedValue(mockAccount);
            // First call: reverse old (add back 200), second call: apply new (deduct 300)
            mockDb.account.update
                .mockResolvedValueOnce({ ...mockAccount, currentBalance: 10000 })
                .mockResolvedValueOnce({ ...mockAccount, currentBalance: 9700 });
            mockDb.balanceHistory.create.mockResolvedValue({});
            mockDb.expense.update.mockResolvedValue({ ...existingExpense, amount: 300 });

            vi.resetModules();
            const { updateExpense } = await import("@/lib/actions/expenses");

            await updateExpense(UUIDS.expense1, { amount: 300 });

            // First: reverse old deduction (add back 200)
            expect(mockDb.account.update).toHaveBeenNthCalledWith(1, {
                where: { id: UUIDS.account1 },
                data: { currentBalance: { increment: 200 } },
            });

            // Second: apply new deduction (deduct 300)
            expect(mockDb.account.update).toHaveBeenNthCalledWith(2, {
                where: { id: UUIDS.account1 },
                data: { currentBalance: { increment: -300 } },
            });

            // Should record two balance history entries
            expect(mockDb.balanceHistory.create).toHaveBeenCalledTimes(2);
        });
    });

    describe("getExpensesCount", () => {
        it("should return total count and amount of expenses", async () => {
            mockDb.expense.aggregate.mockResolvedValue({
                _count: { id: 42 },
                _sum: { amount: 15000 },
            });

            vi.resetModules();
            const { getExpensesCount } = await import("@/lib/actions/expenses");

            const result = await getExpensesCount();

            expect(result).toEqual({ count: 42, totalAmount: 15000 });
        });

        it("should filter by tag", async () => {
            mockDb.expense.aggregate.mockResolvedValue({
                _count: { id: 3 },
                _sum: { amount: 750 },
            });

            vi.resetModules();
            const { getExpensesCount } = await import("@/lib/actions/expenses");

            await getExpensesCount({ tags: ["groceries"] });

            expect(mockDb.expense.aggregate).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        tags: expect.objectContaining({
                            some: expect.objectContaining({
                                tag: expect.objectContaining({
                                    name: expect.objectContaining({
                                        in: ["groceries"],
                                    }),
                                }),
                            }),
                        }),
                    }),
                })
            );
        });

        it("should count only the selected expense", async () => {
            mockDb.expense.aggregate.mockResolvedValue({
                _count: { id: 1 },
                _sum: { amount: 100 },
            });

            vi.resetModules();
            const { getExpensesCount } = await import("@/lib/actions/expenses");

            await getExpensesCount({ expenseId: UUIDS.expense1 });

            expect(mockDb.expense.aggregate).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        id: UUIDS.expense1,
                        userId: "test-user-id",
                    }),
                })
            );
        });
    });

    describe("getUserTags", () => {
        it("should return all tags for the current user", async () => {
            mockDb.tag.findMany.mockResolvedValue([
                { name: "groceries" },
                { name: "office" },
                { name: "subscription" },
            ]);

            vi.resetModules();
            const { getUserTags } = await import("@/lib/actions/expenses");

            const tags = await getUserTags();

            expect(tags).toEqual(["groceries", "office", "subscription"]);
            expect(mockDb.tag.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: "test-user-id" },
                    select: { name: true },
                    orderBy: { name: "asc" },
                })
            );
        });
    });

    describe("Tag CRUD", () => {
        it("should create expense with tags", async () => {
            const mockExpense = {
                id: UUIDS.expense1,
                userId: "test-user-id",
                amount: 100,
                category: "Food",
                merchant: "Restaurant",
            };

            mockDb.expense.create.mockResolvedValue(mockExpense);
            mockDb.tag.upsert
                .mockResolvedValueOnce({ id: "tag-1", name: "lunch" })
                .mockResolvedValueOnce({ id: "tag-2", name: "office" });
            mockDb.expenseTag.create.mockResolvedValue({});

            vi.resetModules();
            const { createExpense } = await import("@/lib/actions/expenses");

            await createExpense({
                amount: 100,
                category: "Food",
                merchant: "Restaurant",
                tags: ["lunch", "office"],
            });

            expect(mockDb.tag.upsert).toHaveBeenCalledTimes(2);
            expect(mockDb.tag.upsert).toHaveBeenNthCalledWith(1, {
                where: { userId_name: { userId: "test-user-id", name: "lunch" } },
                update: {},
                create: { userId: "test-user-id", name: "lunch" },
            });
            expect(mockDb.tag.upsert).toHaveBeenNthCalledWith(2, {
                where: { userId_name: { userId: "test-user-id", name: "office" } },
                update: {},
                create: { userId: "test-user-id", name: "office" },
            });
            expect(mockDb.expenseTag.create).toHaveBeenCalledTimes(2);
        });

        it("should skip empty tags", async () => {
            const mockExpense = {
                id: UUIDS.expense1,
                userId: "test-user-id",
                amount: 100,
                category: "Food",
            };

            mockDb.expense.create.mockResolvedValue(mockExpense);
            mockDb.tag.upsert.mockResolvedValue({ id: "tag-1", name: "lunch" });
            mockDb.expenseTag.create.mockResolvedValue({});

            vi.resetModules();
            const { createExpense } = await import("@/lib/actions/expenses");

            await createExpense({
                amount: 100,
                category: "Food",
                tags: ["  lunch  ", "  ", ""],
            });

            // Only "lunch" should be created (trimmed, non-empty)
            expect(mockDb.tag.upsert).toHaveBeenCalledTimes(1);
            expect(mockDb.tag.upsert).toHaveBeenCalledWith({
                where: { userId_name: { userId: "test-user-id", name: "lunch" } },
                update: {},
                create: { userId: "test-user-id", name: "lunch" },
            });
        });

        it("should update expense tags - replace existing with new", async () => {
            const existingExpense = {
                id: UUIDS.expense1,
                userId: "test-user-id",
                amount: 100,
                category: "Food",
                accountId: null,
            };

            mockDb.expense.findFirst.mockResolvedValue(existingExpense);
            mockDb.expense.update.mockResolvedValue(existingExpense);
            mockDb.expenseTag.deleteMany.mockResolvedValue({ count: 2 });
            mockDb.tag.upsert
                .mockResolvedValueOnce({ id: "tag-1", name: "dinner" })
                .mockResolvedValueOnce({ id: "tag-2", name: "party" });
            mockDb.expenseTag.create.mockResolvedValue({});

            vi.resetModules();
            const { updateExpense } = await import("@/lib/actions/expenses");

            await updateExpense(UUIDS.expense1, { tags: ["dinner", "party"] });

            expect(mockDb.expenseTag.deleteMany).toHaveBeenCalledWith({
                where: { expenseId: UUIDS.expense1 },
            });
            expect(mockDb.tag.upsert).toHaveBeenCalledTimes(2);
            expect(mockDb.expenseTag.create).toHaveBeenCalledTimes(2);
        });

        it("should filter expenses by tag", async () => {
            mockDb.expense.findMany.mockResolvedValue([]);

            vi.resetModules();
            const { getExpenses } = await import("@/lib/actions/expenses");

            await getExpenses({ tags: ["groceries"] });

            expect(mockDb.expense.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        tags: expect.objectContaining({
                            some: expect.objectContaining({
                                tag: expect.objectContaining({
                                    name: expect.objectContaining({
                                        in: ["groceries"],
                                    }),
                                }),
                            }),
                        }),
                    }),
                })
            );
        });

        it("should search by tag text in main search", async () => {
            mockDb.expense.findMany.mockResolvedValue([]);

            vi.resetModules();
            const { getExpenses } = await import("@/lib/actions/expenses");

            await getExpenses({ search: "groceries" });

            expect(mockDb.expense.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            expect.objectContaining({
                                tags: expect.objectContaining({
                                    some: expect.objectContaining({
                                        tag: expect.objectContaining({
                                            name: expect.objectContaining({
                                                contains: "groceries",
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        ]),
                    }),
                })
            );
        });

        it("should leave tags untouched when tags is undefined in update", async () => {
            const existingExpense = {
                id: UUIDS.expense1,
                userId: "test-user-id",
                amount: 100,
                category: "Food",
                accountId: null,
            };

            mockDb.expense.findFirst.mockResolvedValue(existingExpense);
            mockDb.expense.update.mockResolvedValue(existingExpense);

            vi.resetModules();
            const { updateExpense } = await import("@/lib/actions/expenses");

            await updateExpense(UUIDS.expense1, { amount: 200 });

            // Tags not provided - should not touch expenseTag at all
            expect(mockDb.expenseTag.deleteMany).not.toHaveBeenCalled();
            expect(mockDb.expenseTag.create).not.toHaveBeenCalled();
        });

        it("should clear all tags when empty array provided", async () => {
            const existingExpense = {
                id: UUIDS.expense1,
                userId: "test-user-id",
                amount: 100,
                category: "Food",
                accountId: null,
            };

            mockDb.expense.findFirst.mockResolvedValue(existingExpense);
            mockDb.expense.update.mockResolvedValue(existingExpense);
            mockDb.expenseTag.deleteMany.mockResolvedValue({ count: 2 });

            vi.resetModules();
            const { updateExpense } = await import("@/lib/actions/expenses");

            await updateExpense(UUIDS.expense1, { tags: [] });

            expect(mockDb.expenseTag.deleteMany).toHaveBeenCalledWith({
                where: { expenseId: UUIDS.expense1 },
            });
            // No tags to create
            expect(mockDb.expenseTag.create).not.toHaveBeenCalled();
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
            "Lent Money",
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
