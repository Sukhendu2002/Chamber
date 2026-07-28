import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = {
    userCategory: {
        count: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
    },
    expense: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
    },
    tag: {
        findMany: vi.fn(),
        upsert: vi.fn(),
    },
    expenseTag: {
        create: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        return fn(mockDb);
    }),
};

const EXPENSE_IDS = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444",
    "55555555-5555-4555-8555-555555555555",
];

const DEFAULT_CATEGORY_RECORDS = [
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
].map((name) => ({ name }));

vi.mock("@/lib/db", () => ({
    db: mockDb,
}));

vi.mock("@/lib/subscription-alerts", () => ({
    checkAndSendSubscriptionAlerts: vi.fn().mockResolvedValue(undefined),
}));

describe("Category Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
            return fn(mockDb);
        });
        mockDb.userCategory.count.mockResolvedValue(1);
        mockDb.userCategory.findMany.mockResolvedValue(DEFAULT_CATEGORY_RECORDS);
    });

    describe("default category seeding", () => {
        it("should seed default categories when none exist", async () => {
            mockDb.userCategory.count.mockResolvedValue(0);
            mockDb.userCategory.createMany.mockResolvedValue({ count: 11 });

            vi.resetModules();
            const { getUserCategories } = await import("@/lib/actions/categories");

            await getUserCategories();

            expect(mockDb.userCategory.count).toHaveBeenCalledWith({
                where: { userId: "test-user-id" },
            });
            expect(mockDb.userCategory.createMany).toHaveBeenCalledWith(
                expect.objectContaining({ skipDuplicates: true }),
            );
        });

        it("should not seed when categories already exist", async () => {
            mockDb.userCategory.count.mockResolvedValue(3);

            vi.resetModules();
            const { getUserCategories } = await import("@/lib/actions/categories");

            await getUserCategories();

            expect(mockDb.userCategory.createMany).not.toHaveBeenCalled();
        });
    });

    describe("getUserCategories", () => {
        it("should return categories for the user", async () => {
            const mockCategories = [
                { id: "cat-1", name: "Food", icon: "🍔", color: "#0088FE" },
                { id: "cat-2", name: "Travel", icon: "✈️", color: "#00C49F" },
            ];
            mockDb.userCategory.count.mockResolvedValue(2);
            mockDb.userCategory.findMany.mockResolvedValue(mockCategories);

            vi.resetModules();
            const { getUserCategories } = await import("@/lib/actions/categories");

            const result = await getUserCategories();

            expect(result).toEqual(mockCategories);
            expect(mockDb.userCategory.findMany).toHaveBeenCalledWith({
                where: { userId: "test-user-id" },
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            });
        });
    });

    describe("createCategory", () => {
        it("should create a new category", async () => {
            const newCat = { id: "cat-3", userId: "test-user-id", name: "Pets", icon: "🐱", color: "#FF5722", sortOrder: 10 };
            mockDb.userCategory.findUnique.mockResolvedValue(null);
            mockDb.userCategory.create.mockResolvedValue(newCat);

            vi.resetModules();
            const { createCategory } = await import("@/lib/actions/categories");

            const result = await createCategory({ name: "Pets", icon: "🐱", color: "#FF5722" });

            expect(result).toEqual(newCat);
            expect(mockDb.userCategory.create).toHaveBeenCalledWith({
                data: { userId: "test-user-id", name: "Pets", icon: "🐱", color: "#FF5722" },
            });
        });

        it("should reject duplicate category names", async () => {
            mockDb.userCategory.findUnique.mockResolvedValue({ id: "cat-1", name: "Pets" });

            vi.resetModules();
            const { createCategory } = await import("@/lib/actions/categories");

            await expect(createCategory({ name: "Pets" })).rejects.toThrow("already exists");
        });
    });

    describe("updateCategory", () => {
        it("should update a category", async () => {
            const existing = { id: "cat-1", userId: "test-user-id", name: "Pets", icon: "🐱", color: "#FF5722" };
            const updated = { ...existing, name: "Animals", icon: "🐶" };

            mockDb.userCategory.findFirst.mockResolvedValue(existing);
            mockDb.userCategory.findUnique.mockResolvedValue(null);
            mockDb.userCategory.update.mockResolvedValue(updated);

            vi.resetModules();
            const { updateCategory } = await import("@/lib/actions/categories");

            const result = await updateCategory("cat-1", { name: "Animals", icon: "🐶" });

            expect(result.name).toBe("Animals");
            expect(result.icon).toBe("🐶");
            expect(mockDb.userCategory.update).toHaveBeenCalledWith({
                where: { id: "cat-1" },
                data: { name: "Animals", icon: "🐶" },
            });
            expect(mockDb.expense.updateMany).toHaveBeenCalledWith({
                where: { userId: "test-user-id", category: "Pets" },
                data: { category: "Animals" },
            });
        });

        it("should reject renaming to an existing name", async () => {
            const existing = { id: "cat-1", userId: "test-user-id", name: "Pets" };
            mockDb.userCategory.findFirst.mockResolvedValue(existing);
            mockDb.userCategory.findUnique.mockResolvedValue({ id: "cat-2", name: "Animals" });

            vi.resetModules();
            const { updateCategory } = await import("@/lib/actions/categories");

            await expect(updateCategory("cat-1", { name: "Animals" })).rejects.toThrow("already exists");
        });

        it("should preserve names used by built-in workflows", async () => {
            mockDb.userCategory.findFirst.mockResolvedValue({
                id: "cat-food",
                userId: "test-user-id",
                name: "Food",
            });

            vi.resetModules();
            const { updateCategory } = await import("@/lib/actions/categories");

            await expect(
                updateCategory("cat-food", { name: "Dining" }),
            ).rejects.toThrow("Default category names cannot be changed");
            expect(mockDb.userCategory.update).not.toHaveBeenCalled();
        });
    });

    describe("deleteCategory", () => {
        it("should delete a category and reassign expenses", async () => {
            mockDb.userCategory.findFirst
                .mockResolvedValueOnce({ id: "cat-1", userId: "test-user-id", name: "Pets" })
                .mockResolvedValueOnce({ id: "cat-general", userId: "test-user-id", name: "General" });

            vi.resetModules();
            const { deleteCategory } = await import("@/lib/actions/categories");

            await deleteCategory("cat-1", "General");

            expect(mockDb.$transaction).toHaveBeenCalled();
            expect(mockDb.userCategory.delete).toHaveBeenCalledWith({
                where: { id: "cat-1" },
            });
            expect(mockDb.userCategory.deleteMany).not.toHaveBeenCalled();
        });
    });

    describe("smartCategorize", () => {
        it("should return General for empty input", async () => {
            vi.resetModules();
            const { smartCategorize } = await import("@/lib/actions/categories");

            const result = await smartCategorize(null, null);
            expect(result).toEqual({ category: "General", confidence: "low" });
        });

        it("should detect Food from merchant name", async () => {
            vi.resetModules();
            const { smartCategorize } = await import("@/lib/actions/categories");

            const result = await smartCategorize("Pizza Hut", "Dinner");
            expect(result.category).toBe("Food");
            expect(result.confidence).toBe("high");
        });

        it("should detect Travel from cab service", async () => {
            vi.resetModules();
            const { smartCategorize } = await import("@/lib/actions/categories");

            const result = await smartCategorize("Uber", "Airport ride");
            expect(result.category).toBe("Travel");
            expect(result.confidence).toBe("high");
        });

        it("should detect Shopping from ecommerce", async () => {
            vi.resetModules();
            const { smartCategorize } = await import("@/lib/actions/categories");

            const result = await smartCategorize("Amazon", "Electronics");
            expect(result.category).toBe("Shopping");
            expect(result.confidence).toBe("high");
        });

        it("should detect Entertainment from streaming", async () => {
            vi.resetModules();
            const { smartCategorize } = await import("@/lib/actions/categories");

            const result = await smartCategorize("Netflix", "Monthly subscription");
            expect(result.category).toBe("Entertainment");
            expect(result.confidence).toBe("high");
        });
    });

    describe("bulkTagExpenses", () => {
        it("should add tags to multiple expenses", async () => {
            mockDb.$transaction.mockImplementation(async (fn) => fn(mockDb));
            mockDb.expense.findMany.mockResolvedValue([
                { id: EXPENSE_IDS[0] },
                { id: EXPENSE_IDS[1] },
            ]);
            mockDb.tag.upsert
                .mockResolvedValue({ id: "tag-new", name: "groceries" });
            mockDb.expenseTag.upsert.mockResolvedValue({});

            vi.resetModules();
            const { bulkTagExpenses } = await import("@/lib/actions/categories");

            const result = await bulkTagExpenses(EXPENSE_IDS.slice(0, 2), ["groceries"]);

            expect(result.tagged).toBe(2);
            expect(result.tags).toBe(1);
            expect(mockDb.tag.upsert).toHaveBeenCalled();
            expect(mockDb.expenseTag.upsert).toHaveBeenCalledTimes(2);
        });
    });

    describe("bulkCategorizeExpenses", () => {
        it("should categorize multiple expenses", async () => {
            mockDb.expense.updateMany.mockResolvedValue({ count: 5 });
            mockDb.userCategory.findFirst.mockResolvedValue({
                id: "cat-food",
                userId: "test-user-id",
                name: "Food",
            });

            vi.resetModules();
            const { bulkCategorizeExpenses } = await import("@/lib/actions/categories");

            const result = await bulkCategorizeExpenses(EXPENSE_IDS, "Food");

            expect(result.updated).toBe(5);
            expect(mockDb.expense.updateMany).toHaveBeenCalledWith({
                where: {
                    id: { in: EXPENSE_IDS },
                    userId: "test-user-id",
                    loanId: null,
                    repaymentId: null,
                },
                data: { category: "Food" },
            });
        });

        it("should reject a category that is not owned by the user", async () => {
            mockDb.userCategory.findFirst.mockResolvedValue(null);

            vi.resetModules();
            const { bulkCategorizeExpenses } = await import("@/lib/actions/categories");

            await expect(
                bulkCategorizeExpenses(EXPENSE_IDS.slice(0, 1), "Private"),
            ).rejects.toThrow("Category not found");
            expect(mockDb.expense.updateMany).not.toHaveBeenCalled();
        });
    });
});
