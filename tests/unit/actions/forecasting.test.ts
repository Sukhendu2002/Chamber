import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database client
const mockDb = {
  account: {
    findMany: vi.fn(),
  },
  expense: {
    findMany: vi.fn(),
  },
  recurringPattern: {
    findMany: vi.fn(),
  },
  goal: {
    findMany: vi.fn(),
  },
  userSettings: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user-id" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: () => unknown) => fn),
}));

vi.mock("@/lib/actions/settings", () => ({
  getUserSettings: vi.fn().mockResolvedValue({
    monthlyIncome: 50000,
    salaryDay: 1,
    forecastHorizonMonths: 6,
    currency: "INR",
    timezone: "Asia/Kolkata",
  }),
}));

describe("Forecasting", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDb.account.findMany.mockResolvedValue([
      { currentBalance: 100000, isActive: true, includeInNetWorth: true },
    ]);
    mockDb.expense.findMany.mockResolvedValue([]);
    mockDb.recurringPattern.findMany.mockResolvedValue([]);
    mockDb.goal.findMany.mockResolvedValue([]);
    mockDb.userSettings.findUnique.mockResolvedValue({
      monthlyIncome: 50000,
      salaryDay: 1,
      forecastHorizonMonths: 6,
    });
  });

  describe("getForecastData", () => {
    it("should include monthly income in forecast projections", async () => {
      const { getForecastData } = await import("@/lib/actions/forecasting");
      const result = await getForecastData();

      // With 100k balance, 50k monthly income, and no expenses,
      // balance should increase by 50k each month
      expect(result.projectedBalances[0]).toBe(150000);
      expect(result.projectedBalances[5]).toBe(400000);
    });

    it("should factor income into optimistic and pessimistic scenarios", async () => {
      const { getForecastData } = await import("@/lib/actions/forecasting");
      const result = await getForecastData();

      // With no expenses, optimistic and pessimistic should equal projected
      expect(result.optimisticBalances[0]).toBe(result.projectedBalances[0]);
      expect(result.pessimisticBalances[0]).toBe(result.projectedBalances[0]);
    });

    it("should offset expenses against income when expenses exist", async () => {
      // Create 6 months of expenses at 30k/month
      const now = new Date();
      const expenses = [];
      for (let i = 0; i < 6; i++) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        expenses.push({
          amount: 30000,
          date: monthStart,
          category: "Bills",
          merchant: "Rent",
          description: "Monthly rent",
        });
      }
      mockDb.expense.findMany.mockResolvedValue(expenses);

      const { getForecastData } = await import("@/lib/actions/forecasting");
      const result = await getForecastData();

      // With 50k income and 30k expenses, net +20k/month
      // Starting at 100k: 100k + 50k - 30k = 120k after month 1
      expect(result.projectedBalances[0]).toBe(120000);
    });
  });
});
