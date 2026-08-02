import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateAiReportContent } = vi.hoisted(() => ({
  mockGenerateAiReportContent: vi.fn(),
}));

const mockDb = {
  expense: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  userSettings: {
    findUnique: vi.fn(),
  },
  subscription: {
    findMany: vi.fn(),
  },
  goal: {
    findMany: vi.fn(),
  },
  aiReport: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true, retryAfter: 0 }),
}));

vi.mock("@/lib/ai-analysis", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai-analysis")>("@/lib/ai-analysis");
  return {
    ...actual,
    generateAiReportContent: mockGenerateAiReportContent,
  };
});

const generatedContent = {
  assessment: "Spending is below the configured budget, with a small number of categories driving most activity.",
  metrics: {
    totalSpent: 10000,
    spendingExcludingInvestments: 10000,
    budget: 50000,
    income: 70000,
    estimatedSavings: 60000,
    estimatedSavingsRate: 85.7,
    savingsTargetRate: 20,
    investmentContributions: 0,
    previousPeriodSpending: 12000,
    spendingChangePercent: -16.7,
    transactionCount: 1,
  },
  findings: [
    { title: "Lower spend", detail: "Spending is lower than the prior period.", evidence: "−16.7%", tone: "positive" },
    { title: "Budget room", detail: "Most of the monthly budget remains available.", evidence: "₹40,000", tone: "neutral" },
  ],
  opportunities: [
    { title: "Keep tracking", detail: "Continue recording expenses consistently.", monthlyImpact: null, priority: "medium" },
    { title: "Review weekly", detail: "Compare spending with the budget every week.", monthlyImpact: null, priority: "low" },
  ],
  actionPlan: [
    { title: "Set a check-in", detail: "Review category totals every Sunday." },
    { title: "Keep receipts", detail: "Attach receipts to larger purchases." },
    { title: "Compare trends", detail: "Review the month again after four weeks." },
  ],
  caveats: [],
};

describe("AI analysis actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.expense.count.mockResolvedValue(4);
    mockDb.expense.findFirst.mockResolvedValue({ date: new Date(2025, 0, 1) });
    mockDb.userSettings.findUnique.mockResolvedValue({
      currency: "INR",
      monthlyBudget: 50000,
      monthlyIncome: 70000,
      savingsTargetPercent: 20,
    });
    mockDb.aiReport.findMany.mockResolvedValue([]);
    mockDb.subscription.findMany.mockResolvedValue([]);
    mockDb.goal.findMany.mockResolvedValue([]);
    mockGenerateAiReportContent.mockResolvedValue({
      content: generatedContent,
      model: "test/model",
    });
  });

  it("does not call AI while loading the page", async () => {
    const { getAiAnalysisPageData } = await import("@/lib/actions/ai-analysis");

    const result = await getAiAnalysisPageData();

    expect(result.initialPreview.transactionCount).toBe(4);
    expect(mockGenerateAiReportContent).not.toHaveBeenCalled();
    expect(mockDb.aiReport.create).not.toHaveBeenCalled();
  });

  it("generates and saves a report only after the generation action", async () => {
    const now = new Date();
    const request = {
      type: "DEEP_ANALYSIS" as const,
      period: "MONTHLY" as const,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
    const currentExpense = {
      amount: 10000,
      category: "Bills",
      merchant: "Rent",
      date: new Date(now.getFullYear(), now.getMonth(), 2),
    };
    const previousExpense = {
      amount: 12000,
      category: "Bills",
      merchant: "Rent",
      date: new Date(now.getFullYear(), now.getMonth() - 1, 2),
    };
    mockDb.expense.findMany
      .mockResolvedValueOnce([currentExpense])
      .mockResolvedValueOnce([previousExpense]);

    const saved = {
      id: "b8888888-8888-4888-9888-888888888888",
      userId: "test-user-id",
      type: request.type,
      period: request.period,
      year: request.year,
      month: request.month,
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd: now,
      transactionCount: 1,
      currency: "INR",
      reportJson: generatedContent,
      model: "test/model",
      createdAt: now,
    };
    mockDb.aiReport.create.mockResolvedValue(saved);

    const { generateAiReport } = await import("@/lib/actions/ai-analysis");
    const result = await generateAiReport(request);

    expect(mockGenerateAiReportContent).toHaveBeenCalledTimes(1);
    expect(mockDb.aiReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "test-user-id",
        type: "DEEP_ANALYSIS",
        transactionCount: 1,
      }),
    });
    expect(result.id).toBe(saved.id);
  });

  it("scopes saved report lookup to the authenticated user", async () => {
    mockDb.aiReport.findFirst.mockResolvedValue(null);
    const { getAiReport } = await import("@/lib/actions/ai-analysis");

    await expect(getAiReport("b8888888-8888-4888-9888-888888888888"))
      .rejects.toThrow("Report not found");

    expect(mockDb.aiReport.findFirst).toHaveBeenCalledWith({
      where: {
        id: "b8888888-8888-4888-9888-888888888888",
        userId: "test-user-id",
      },
    });
  });
});
