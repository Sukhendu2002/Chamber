"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getUserSettings } from "@/lib/actions/settings";
import { getNetWorthContribution } from "@/lib/accounting";

export type ForecastData = {
  months: string[];
  projectedBalances: number[];
  optimisticBalances: number[];
  pessimisticBalances: number[];
  recurringExpenses: number[];
  goalContributions: number[];
};

export type RecurringExpense = {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: string;
  confidence: number;
  lastOccurrence: Date;
  nextPredicted: Date;
  isConfirmed: boolean;
};

export type WhatIfScenario = {
  name: string;
  projectedBalances: number[];
  savingsAtEnd: number;
  differenceFromBase: number;
};

// Internal raw inputs for forecasting
interface ForecastInputs {
  currentTotalBalance: number;
  estimatedMonthlyExpense: number;
  trendSlope: number;
  monthlyRecurringTotal: number;
  monthlyGoalContribution: number;
  monthlyIncome: number;
  horizonMonths: number;
}

// Calculate simple linear regression for trend
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// Build forecast inputs once, query DB only here
async function getForecastInputs(userId: string): Promise<ForecastInputs> {
  const settings = await getUserSettings();
  const horizonMonths = Math.min(24, Math.max(1, settings.forecastHorizonMonths || 6));

  // Get all accounts
  const accounts = await db.account.findMany({
    where: { userId, isActive: true, includeInNetWorth: true },
  });
  const currentTotalBalance = accounts.reduce(
    (sum, account) =>
      sum + getNetWorthContribution(account.type, account.currentBalance),
    0,
  );

  // Get last 6 months of expense data for trend analysis
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const expenses = await db.expense.findMany({
    where: { userId, date: { gte: sixMonthsAgo } },
    orderBy: { date: "asc" },
  });

  // Group expenses by month
  const monthlyExpenses: number[] = [];
  for (let i = 0; i < 6; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - 4 + i, 0);
    let sum = 0;
    for (const e of expenses) {
      const d = new Date(e.date);
      if (d >= monthStart && d <= monthEnd) {
        sum += e.amount;
      }
    }
    monthlyExpenses.push(sum);
  }

  // Get recurring patterns
  const recurringPatterns = await db.recurringPattern.findMany({
    where: { userId, isIgnored: false },
  });

  const confirmedRecurring = recurringPatterns.filter((r) => r.isConfirmed);
  const monthlyRecurringTotal = confirmedRecurring.reduce((sum, r) => {
    if (r.frequency === "MONTHLY") return sum + r.amount;
    if (r.frequency === "WEEKLY") return sum + r.amount * 4.33;
    if (r.frequency === "QUARTERLY") return sum + r.amount / 3;
    if (r.frequency === "YEARLY") return sum + r.amount / 12;
    return sum + r.amount;
  }, 0);

  // Calculate trend
  const trend = linearRegression(monthlyExpenses);
  const avgMonthlyExpense = monthlyExpenses.reduce((a, b) => a + b, 0) / Math.max(monthlyExpenses.length, 1);
  const estimatedMonthlyExpense = avgMonthlyExpense > 0 ? avgMonthlyExpense : monthlyRecurringTotal;

  // Get active goals
  const goals = await db.goal.findMany({
    where: { userId, status: "ACTIVE" },
  });

  const monthlyGoalContribution = goals.reduce((sum, g) => {
    if (!g.deadline) return sum;
    const monthsRemaining = Math.max(1, Math.ceil((g.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    const remaining = g.targetAmount - g.currentAmount;
    return sum + remaining / monthsRemaining;
  }, 0);

  const monthlyIncome = settings.monthlyIncome || 0;

  return {
    currentTotalBalance,
    estimatedMonthlyExpense,
    trendSlope: trend.slope,
    monthlyRecurringTotal,
    monthlyGoalContribution,
    monthlyIncome,
    horizonMonths,
  };
}

// Project balances given a spending multiplier (1.0 = baseline)
function projectBalances(
  inputs: ForecastInputs,
  spendingMultiplier: number,
): number[] {
  const {
    currentTotalBalance,
    estimatedMonthlyExpense,
    trendSlope,
    monthlyGoalContribution,
    monthlyIncome,
    horizonMonths,
  } = inputs;

  const balances: number[] = [];
  let balance = currentTotalBalance;

  for (let i = 1; i <= horizonMonths; i++) {
    const trendAdjustment = trendSlope * i;
    const projectedExpense = (estimatedMonthlyExpense + trendAdjustment * 0.3) * spendingMultiplier;
    balance += monthlyIncome;
    balance -= projectedExpense;
    balance -= monthlyGoalContribution;
    balances.push(Math.round(balance * 100) / 100);
  }

  return balances;
}

export async function getForecastData(): Promise<ForecastData> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const inputs = await getForecastInputs(userId);
  const now = new Date();

  const months: string[] = [];
  for (let i = 1; i <= inputs.horizonMonths; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }));
  }

  const projectedBalances = projectBalances(inputs, 1.0);
  const optimisticBalances = projectBalances(inputs, 0.85);
  const pessimisticBalances = projectBalances(inputs, 1.15);

  const recurringExpenses = Array(inputs.horizonMonths).fill(
    Math.round(inputs.monthlyRecurringTotal * 100) / 100
  );
  const goalContributions = Array(inputs.horizonMonths).fill(
    Math.round(inputs.monthlyGoalContribution * 100) / 100
  );

  return {
    months,
    projectedBalances,
    optimisticBalances,
    pessimisticBalances,
    recurringExpenses,
    goalContributions,
  };
}

export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const patterns = await db.recurringPattern.findMany({
    where: { userId, isIgnored: false },
    orderBy: { confidence: "desc" },
  });

  return patterns.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    amount: p.amount,
    frequency: p.frequency,
    confidence: p.confidence,
    lastOccurrence: p.lastOccurrence,
    nextPredicted: p.nextPredicted,
    isConfirmed: p.isConfirmed,
  }));
}

export async function detectRecurringExpenses() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get last 6 months of expenses
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const expenses = await db.expense.findMany({
    where: { userId, date: { gte: sixMonthsAgo } },
    orderBy: { date: "desc" },
  });

  // Group by normalized name (merchant or description)
  const groups = new Map<
    string,
    { category: string; amounts: number[]; dates: Date[]; merchant: string | null }
  >();

  for (const e of expenses) {
    const name = (e.merchant || e.description || e.category).toLowerCase().trim();
    if (!name || name.length < 2) continue;

    // Normalize: strip trailing numbers only, collapse extra spaces
    const normalized = name
      .replace(/\s+\d+\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) continue;

    if (!groups.has(normalized)) {
      groups.set(normalized, { category: e.category, amounts: [], dates: [], merchant: e.merchant });
    }
    const g = groups.get(normalized)!;
    g.amounts.push(e.amount);
    g.dates.push(new Date(e.date));
  }

  // Find patterns: same name appearing 2+ times with similar amounts (within 15%)
  const detected: {
    name: string;
    category: string;
    amount: number;
    frequency: string;
    confidence: number;
    lastOccurrence: Date;
    nextPredicted: Date;
  }[] = [];

  for (const [normalized, data] of groups) {
    if (data.amounts.length < 2) continue;

    // Check amount similarity
    const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
    const maxDiff = Math.max(...data.amounts.map((a) => Math.abs(a - avgAmount)));
    const amountVariance = avgAmount > 0 ? maxDiff / avgAmount : 0;

    if (amountVariance > 0.15) continue; // Too much variance

    // Sort dates ascending
    data.dates.sort((a, b) => a.getTime() - b.getTime());

    // Calculate average gap in days
    let totalGap = 0;
    for (let i = 1; i < data.dates.length; i++) {
      totalGap += (data.dates[i].getTime() - data.dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
    }
    const avgGap = totalGap / (data.dates.length - 1);

    // Determine frequency
    let frequency = "MONTHLY";
    if (avgGap >= 25 && avgGap <= 35) frequency = "MONTHLY";
    else if (avgGap >= 6 && avgGap <= 10) frequency = "WEEKLY";
    else if (avgGap >= 85 && avgGap <= 95) frequency = "QUARTERLY";
    else if (avgGap >= 360 && avgGap <= 370) frequency = "YEARLY";
    else if (avgGap < 6) continue; // Too frequent, likely not recurring bill

    const confidence = Math.min(1, (data.amounts.length / 6) * (1 - amountVariance));
    const lastOccurrence = data.dates[data.dates.length - 1];

    // Predict next occurrence
    const nextPredicted = new Date(lastOccurrence);
    if (frequency === "MONTHLY") nextPredicted.setMonth(nextPredicted.getMonth() + 1);
    else if (frequency === "WEEKLY") nextPredicted.setDate(nextPredicted.getDate() + 7);
    else if (frequency === "QUARTERLY") nextPredicted.setMonth(nextPredicted.getMonth() + 3);
    else if (frequency === "YEARLY") nextPredicted.setFullYear(nextPredicted.getFullYear() + 1);

    detected.push({
      name: data.merchant || normalized,
      category: data.category,
      amount: Math.round(avgAmount * 100) / 100,
      frequency,
      confidence: Math.round(confidence * 100) / 100,
      lastOccurrence,
      nextPredicted,
    });
  }

  // Batch upsert detected patterns
  if (detected.length > 0) {
    await db.$transaction(
      detected.map((d) =>
        db.recurringPattern.upsert({
          where: {
            userId_name: {
              userId,
              name: d.name,
            },
          },
          update: {
            amount: d.amount,
            frequency: d.frequency,
            confidence: d.confidence,
            lastOccurrence: d.lastOccurrence,
            nextPredicted: d.nextPredicted,
          },
          create: {
            userId,
            ...d,
          },
        })
      )
    );
  }

  return detected.length;
}

export async function setRecurringPatternConfirmed(id: string, isConfirmed: boolean) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const pattern = await db.recurringPattern.findFirst({
    where: { id, userId },
  });

  if (!pattern) throw new Error("Pattern not found");

  await db.recurringPattern.update({
    where: { id },
    data: { isConfirmed },
  });

  return { success: true };
}

export async function ignoreRecurringPattern(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const pattern = await db.recurringPattern.findFirst({
    where: { id, userId },
  });

  if (!pattern) throw new Error("Pattern not found");

  await db.recurringPattern.update({
    where: { id },
    data: { isIgnored: true },
  });

  return { success: true };
}

export async function getWhatIfScenarios(): Promise<WhatIfScenario[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const inputs = await getForecastInputs(userId);
  if (inputs.horizonMonths === 0) return [];

  const baseProjected = projectBalances(inputs, 1.0);
  const baseEnd = baseProjected[baseProjected.length - 1];

  const scenarios: WhatIfScenario[] = [];

  // Scenario 1: Reduce total spending by 10%
  const reduce10 = projectBalances(inputs, 0.9);
  scenarios.push({
    name: "Reduce spending by 10%",
    projectedBalances: reduce10,
    savingsAtEnd: reduce10[reduce10.length - 1] - baseEnd,
    differenceFromBase: reduce10[reduce10.length - 1] - baseEnd,
  });

  // Scenario 2: Reduce total spending by 20%
  const reduce20 = projectBalances(inputs, 0.8);
  scenarios.push({
    name: "Reduce spending by 20%",
    projectedBalances: reduce20,
    savingsAtEnd: reduce20[reduce20.length - 1] - baseEnd,
    differenceFromBase: reduce20[reduce20.length - 1] - baseEnd,
  });

  // Scenario 3: Cut discretionary (non-recurring) spending by 50%
  // Discretionary = total estimated - recurring portion
  const discretionaryRatio =
    inputs.estimatedMonthlyExpense > 0
      ? Math.max(0, (inputs.estimatedMonthlyExpense - inputs.monthlyRecurringTotal) / inputs.estimatedMonthlyExpense)
      : 0;
  // Effective multiplier: recurring stays, discretionary is halved
  const cutDiscMultiplier = 1.0 - discretionaryRatio * 0.5;
  const cutDiscretionary = projectBalances(inputs, cutDiscMultiplier);
  scenarios.push({
    name: "Cut discretionary spending by 50%",
    projectedBalances: cutDiscretionary,
    savingsAtEnd: cutDiscretionary[cutDiscretionary.length - 1] - baseEnd,
    differenceFromBase: cutDiscretionary[cutDiscretionary.length - 1] - baseEnd,
  });

  return scenarios;
}

export async function getUpcomingRecurringAlerts(): Promise<
  { name: string; amount: number; daysUntil: number; category: string }[]
> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const now = new Date();
  const patterns = await db.recurringPattern.findMany({
    where: { userId, isIgnored: false },
  });

  const alerts: { name: string; amount: number; daysUntil: number; category: string }[] = [];

  for (const p of patterns) {
    const daysUntil = Math.ceil((p.nextPredicted.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil >= -7 && daysUntil <= 7) {
      alerts.push({
        name: p.name,
        amount: p.amount,
        daysUntil,
        category: p.category,
      });
    }
  }

  return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
}
