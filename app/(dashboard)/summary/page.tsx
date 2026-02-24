import { getMonthlyHistory } from "@/lib/actions/expenses";
import { getUserSettings } from "@/lib/actions/settings";
import { getAIMonthlyInsights } from "@/lib/actions/analytics";
import { MonthlySummary } from "@/components/monthly-summary";
import { MonthDetailPage } from "@/components/month-detail-page";

export default async function SummaryPage({
    searchParams,
}: {
    searchParams: Promise<{ year?: string; month?: string }>;
}) {
    const params = await searchParams;
    const year = params.year ? parseInt(params.year, 10) : undefined;
    const monthParam = params.month !== undefined ? parseInt(params.month, 10) : null;

    const [history, settings, aiInsights] = await Promise.all([
        getMonthlyHistory(year),
        getUserSettings(),
        getAIMonthlyInsights(year).catch(() => ({} as Record<number, string>)),
    ]);

    const currentYear = year || new Date().getFullYear();

    // Full-page month detail view
    if (monthParam !== null && !isNaN(monthParam)) {
        const monthData = history.months[monthParam];
        const prevMonth = monthParam > 0 ? history.months[monthParam - 1] : null;

        if (monthData) {
            return (
                <div className="p-4 md:p-6">
                    <MonthDetailPage
                        month={monthData}
                        prevMonth={prevMonth}
                        currency={settings.currency}
                        budget={settings.monthlyBudget}
                        aiInsight={aiInsights[monthParam] ?? null}
                        year={currentYear}
                    />
                </div>
            );
        }
    }

    // Default: 12-month grid
    return (
        <div className="p-4 md:p-6">
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl font-bold">Monthly Summary</h1>
                <p className="text-sm text-muted-foreground">
                    Review your spending month by month
                </p>
            </div>

            <MonthlySummary
                months={history.months}
                yearTotal={history.yearTotal}
                bestMonth={history.bestMonth}
                worstMonth={history.worstMonth}
                avgMonthlySpend={history.avgMonthlySpend}
                availableYears={history.availableYears}
                currentYear={currentYear}
                currency={settings.currency}
                budget={settings.monthlyBudget}
            />
        </div>
    );
}
