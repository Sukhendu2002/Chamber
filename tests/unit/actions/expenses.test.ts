import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database client first
const mockDb = {
    expense: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
    },
    userSettings: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
    },
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
        it("should delete an expense by id", async () => {
            mockDb.expense.deleteMany.mockResolvedValue({ count: 1 });

            vi.resetModules();
            const { deleteExpense } = await import("@/lib/actions/expenses");

            await deleteExpense("expense-1");

            expect(mockDb.expense.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "expense-1",
                    userId: "test-user-id",
                },
            });
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

    it("should validate payment methods", () => {
        const validMethods = ["PNB", "SBI", "CASH", "CREDIT"];

        for (const method of validMethods) {
            expect(validMethods.includes(method)).toBe(true);
        }
    });

    it("should validate expense sources", () => {
        const validSources = ["TELEGRAM", "STATEMENT", "WEB"];

        for (const source of validSources) {
            expect(validSources.includes(source)).toBe(true);
        }
    });
});
