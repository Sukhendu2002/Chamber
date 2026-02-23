"use server";

import { auth } from "@clerk/nextjs/server";
import { getAnalyticsData } from "@/lib/actions/expenses";
import { getUserSettings } from "@/lib/actions/settings";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const AI_MODELS = [
    "google/gemma-3-4b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
];

export async function getAISpendingInsights(): Promise<string[]> {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    if (!OPENROUTER_API_KEY) {
        return ["AI insights are not available. Configure OPENROUTER_API_KEY to enable this feature."];
    }

    try {
        const [analytics, settings] = await Promise.all([
            getAnalyticsData(),
            getUserSettings(),
        ]);

        const formatCurrency = (amount: number) =>
            new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: settings.currency,
                minimumFractionDigits: 0,
            }).format(amount);

        // Build context for AI
        const categoryBreakdown = Object.entries(analytics.categoryBreakdown)
            .map(([cat, amt]) => `${cat}: ${formatCurrency(amt)}`)
            .join(", ");

        const monthlyTrend = analytics.monthlyData
            .map((m) => `${m.month}: ${formatCurrency(m.spent)}`)
            .join(", ");

        const topMerchants = analytics.topMerchants
            .map((m) => `${m.name}: ${formatCurrency(m.amount)}`)
            .join(", ");

        const prompt = `You are a personal finance advisor. Analyze this spending data and provide exactly 4 short, actionable insights. Each insight should be 1-2 sentences max. Be specific with numbers.

Budget: ${formatCurrency(settings.monthlyBudget)}/month
This month's total: ${formatCurrency(analytics.totalSpent)}
Previous month's total: ${formatCurrency(analytics.previousMonthSpent)}
Avg daily spend: ${formatCurrency(analytics.averageDailySpend)}
Transactions this month: ${analytics.transactionCount}
Categories: ${categoryBreakdown}
Monthly trend (last 6 months): ${monthlyTrend}
Top merchants: ${topMerchants}
Highest spending day: ${analytics.highestSpendingDay.date} (${formatCurrency(analytics.highestSpendingDay.amount)})

Respond with a JSON array of exactly 4 insight strings. Example format:
["insight 1", "insight 2", "insight 3", "insight 4"]`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://chamber.app",
                "X-Title": "Chamber Expense Tracker",
            },
            body: JSON.stringify({
                model: AI_MODELS[0],
                route: "fallback",
                models: AI_MODELS,
                messages: [
                    { role: "user", content: prompt },
                ],
                temperature: 0.4,
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            console.error("OpenRouter API error:", await response.text());
            return ["Unable to generate insights at this time."];
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return ["Unable to generate insights at this time."];
        }

        // Extract JSON array from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return ["Unable to generate insights at this time."];
        }

        const insights = JSON.parse(jsonMatch[0]) as string[];
        return insights.filter((i: string) => typeof i === "string" && i.length > 0).slice(0, 5);
    } catch (error) {
        console.error("AI insights error:", error);
        return ["Unable to generate insights at this time."];
    }
}
