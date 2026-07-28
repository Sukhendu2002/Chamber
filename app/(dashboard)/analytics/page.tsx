import { getAnalyticsData } from "@/lib/actions/expenses";
import { getUserSettings } from "@/lib/actions/settings";
import { getAISpendingInsights } from "@/lib/actions/analytics";
import { AnalyticsCharts } from "@/components/analytics-charts";

export default async function AnalyticsPage() {
  const [analytics, settings, aiInsights] = await Promise.all([
    getAnalyticsData(),
    getUserSettings(),
    getAISpendingInsights().catch(() => ["Unable to generate insights at this time."]),
  ]);

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Visualize your spending patterns and track budgets
        </p>
      </div>

      <AnalyticsCharts
        totalSpent={analytics.totalSpent}
        budget={settings.monthlyBudget}
        categoryData={analytics.categoryData}
        monthlyData={analytics.monthlyData}
        currency={settings.currency}
        dailySpending={analytics.dailySpending}
        topMerchants={analytics.topMerchants}
        averageDailySpend={analytics.averageDailySpend}
        previousMonthSpent={analytics.previousMonthSpent}
        highestSpendingDay={analytics.highestSpendingDay}
        transactionCount={analytics.transactionCount}
        aiInsights={aiInsights}
        tagData={analytics.tagData}
      />
    </div>
  );
}
