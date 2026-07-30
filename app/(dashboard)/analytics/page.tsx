import { getAnalyticsData } from "@/lib/actions/expenses";
import { getUserSettings } from "@/lib/actions/settings";
import { getAISpendingInsights } from "@/lib/actions/analytics";
import { AnalyticsCharts } from "@/components/analytics-charts";
import { PageHeader, PageShell } from "@/components/page-shell";

export default async function AnalyticsPage() {
  const [analytics, settings, aiInsights] = await Promise.all([
    getAnalyticsData(),
    getUserSettings(),
    getAISpendingInsights().catch(() => ["Unable to generate insights at this time."]),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        description="Visualize spending patterns and track your budget"
      />

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
    </PageShell>
  );
}
