import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiAnalysisWorkspace } from "@/components/ai-analysis-workspace";
import type { AiAnalysisPageData, AiReportRecord } from "@/types/ai-analysis";

const { mockGenerateAiReport, mockGetAiPeriodPreview, mockGetAiReport } = vi.hoisted(() => ({
  mockGenerateAiReport: vi.fn(),
  mockGetAiPeriodPreview: vi.fn(),
  mockGetAiReport: vi.fn(),
}));

vi.mock("@/lib/actions/ai-analysis", () => ({
  generateAiReport: mockGenerateAiReport,
  getAiPeriodPreview: mockGetAiPeriodPreview,
  getAiReport: mockGetAiReport,
}));

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

const pageData: AiAnalysisPageData = {
  currentYear,
  currentMonth,
  availableYears: [currentYear, currentYear - 1],
  reportStorageReady: true,
  initialPreview: {
    transactionCount: 42,
    budgetReady: true,
    incomeReady: true,
  },
  recentReports: [],
  latestReport: null,
};

const generatedReport: AiReportRecord = {
  id: "b8888888-8888-4888-9888-888888888888",
  type: "DEEP_ANALYSIS",
  period: "MONTHLY",
  year: currentYear,
  month: currentMonth,
  periodStart: new Date(currentYear, currentMonth - 1, 1).toISOString(),
  periodEnd: now.toISOString(),
  transactionCount: 42,
  currency: "INR",
  createdAt: now.toISOString(),
  content: {
    assessment: "Spending is below budget, while recurring costs remain the clearest area to review this month.",
    metrics: {
      totalSpent: 42000,
      spendingExcludingInvestments: 40000,
      budget: 50000,
      income: 70000,
      estimatedSavings: 30000,
      estimatedSavingsRate: 42.9,
      savingsTargetRate: 20,
      investmentContributions: 2000,
      previousPeriodSpending: 45000,
      spendingChangePercent: -11.1,
      transactionCount: 42,
    },
    findings: [
      { title: "Below budget", detail: "Spending remains below the configured budget.", evidence: "₹10,000 left", tone: "positive" },
      { title: "Recurring costs", detail: "Recurring costs deserve a review this month.", evidence: "3 subscriptions", tone: "neutral" },
    ],
    opportunities: [
      { title: "Review subscriptions", detail: "Check whether each active subscription still earns its cost.", monthlyImpact: null, priority: "high" },
      { title: "Keep the buffer", detail: "Preserve the remaining budget as a savings buffer.", monthlyImpact: null, priority: "medium" },
    ],
    actionPlan: [
      { title: "Audit subscriptions", detail: "Review every subscription before the next renewal." },
      { title: "Set a weekly limit", detail: "Divide the remaining budget across the month." },
      { title: "Review progress", detail: "Check the report again at the end of the month." },
    ],
    caveats: [],
  },
};

describe("AiAnalysisWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateAiReport.mockResolvedValue(generatedReport);
  });

  it("does not generate a report on mount", () => {
    render(
      <AiAnalysisWorkspace
        data={pageData}
        initialRequest={{
          type: "DEEP_ANALYSIS",
          period: "MONTHLY",
          year: currentYear,
          month: currentMonth,
        }}
        initialPreview={pageData.initialPreview}
      />,
    );

    expect(screen.getByText("No report generated yet")).toBeTruthy();
    expect(mockGenerateAiReport).not.toHaveBeenCalled();
    expect(mockGetAiPeriodPreview).not.toHaveBeenCalled();
  });

  it("generates the selected report after the button is clicked", async () => {
    render(
      <AiAnalysisWorkspace
        data={pageData}
        initialRequest={{
          type: "DEEP_ANALYSIS",
          period: "MONTHLY",
          year: currentYear,
          month: currentMonth,
        }}
        initialPreview={pageData.initialPreview}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Generate deep analysis" }));

    await waitFor(() => expect(mockGenerateAiReport).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(`${MONTH_NAME()} ${currentYear} report`)).toBeTruthy();
  });

  it("disables generation when report storage is unavailable", () => {
    render(
      <AiAnalysisWorkspace
        data={{ ...pageData, reportStorageReady: false }}
        initialRequest={{
          type: "DEEP_ANALYSIS",
          period: "MONTHLY",
          year: currentYear,
          month: currentMonth,
        }}
        initialPreview={pageData.initialPreview}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain("existing financial data is unaffected");
    expect(
      screen.getByRole("button", { name: "Generate deep analysis" }).hasAttribute("disabled"),
    ).toBe(true);
  });
});

function MONTH_NAME(): string {
  return new Date(currentYear, currentMonth - 1, 1).toLocaleDateString("en-US", { month: "long" });
}
