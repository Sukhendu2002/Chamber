import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  generateAiReportContent,
  resolveAiReportRange,
  summarizeAiAnalysisData,
} from "@/lib/ai-analysis";

describe("AI analysis", () => {
  const originalApiKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-api-key";
  });

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalApiKey;
    vi.unstubAllGlobals();
  });

  it("uses an equivalent previous month-to-date comparison", () => {
    const now = new Date(2026, 7, 31, 12, 0, 0);
    const range = resolveAiReportRange({
      type: "DEEP_ANALYSIS",
      period: "MONTHLY",
      year: 2026,
      month: 8,
    }, now);

    expect(range.start).toEqual(new Date(2026, 7, 1));
    expect(range.end).toEqual(now);
    expect(range.previousStart).toEqual(new Date(2026, 6, 1));
    expect(range.previousEnd.getDate()).toBe(31);
    expect(range.monthCount).toBe(1);
  });

  it("calculates spending and savings metrics without treating investments as spending", () => {
    const request = {
      type: "DEEP_ANALYSIS" as const,
      period: "MONTHLY" as const,
      year: 2026,
      month: 8,
    };
    const range = resolveAiReportRange(request, new Date(2026, 7, 20));
    const context = summarizeAiAnalysisData({
      request,
      range,
      settings: {
        currency: "INR",
        monthlyBudget: 40000,
        monthlyIncome: 60000,
        savingsTargetPercent: 20,
      },
      expenses: [
        { amount: 20000, category: "Bills", merchant: "Rent", date: new Date(2026, 7, 2) },
        { amount: 5000, category: "Investments", merchant: "Index Fund", date: new Date(2026, 7, 5) },
        { amount: 10000, category: "Food", merchant: "Grocer", date: new Date(2026, 7, 8) },
      ],
      previousExpenses: [
        { amount: 40000, category: "Bills", merchant: "Rent", date: new Date(2026, 6, 2) },
      ],
      subscriptions: [],
      goals: [],
    });

    expect(context.metrics.totalSpent).toBe(35000);
    expect(context.metrics.spendingExcludingInvestments).toBe(30000);
    expect(context.metrics.investmentContributions).toBe(5000);
    expect(context.metrics.estimatedSavings).toBe(30000);
    expect(context.metrics.estimatedSavingsRate).toBe(50);
    expect(context.metrics.spendingChangePercent).toBe(-25);
  });

  it("parses a structured AI response and preserves deterministic metrics", async () => {
    const request = {
      type: "SPENDING_REVIEW" as const,
      period: "MONTHLY" as const,
      year: 2026,
      month: 8,
    };
    const range = resolveAiReportRange(request, new Date(2026, 7, 20));
    const context = summarizeAiAnalysisData({
      request,
      range,
      settings: {
        currency: "INR",
        monthlyBudget: 50000,
        monthlyIncome: 70000,
        savingsTargetPercent: 20,
      },
      expenses: [
        { amount: 12000, category: "Food", merchant: "Cafe", date: new Date(2026, 7, 2) },
      ],
      previousExpenses: [],
      subscriptions: [],
      goals: [],
    });
    const narrative = {
      assessment: "Food is the only recorded category, so the current dataset needs broader coverage before drawing strong conclusions.",
      findings: [
        {
          title: "Category concentration",
          detail: "All recorded spending is currently in the Food category.",
          evidence: "Food: 100%",
          tone: "warning",
        },
        {
          title: "Budget position",
          detail: "Recorded spending remains below the configured monthly budget.",
          evidence: "₹12,000 of ₹50,000",
          tone: "positive",
        },
      ],
      opportunities: [
        {
          title: "Review food spending",
          detail: "Set a weekly food limit and compare actual spending against it.",
          monthlyImpact: null,
          priority: "high",
        },
        {
          title: "Improve data coverage",
          detail: "Record every category consistently before making larger changes.",
          monthlyImpact: null,
          priority: "medium",
        },
      ],
      actionPlan: [
        { title: "Set a limit", detail: "Choose a weekly Food target for the next four weeks." },
        { title: "Track daily", detail: "Record each purchase on the day it occurs." },
        { title: "Review weekly", detail: "Compare actual spending with the target every Sunday." },
      ],
      caveats: ["Only one transaction is available for this period."],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: "test/model",
        choices: [{ message: { content: JSON.stringify(narrative) } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateAiReportContent(context);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.model).toBe("test/model");
    expect(result.content.metrics).toEqual(context.metrics);
    expect(result.content.actionPlan).toHaveLength(3);
  });
});
