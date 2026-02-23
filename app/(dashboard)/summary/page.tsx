import { getMonthlyHistory } from "@/lib/actions/expenses";
import { getUserSettings } from "@/lib/actions/settings";
import { getAIMonthlyInsights } from "@/lib/actions/analytics";
import { MonthlySummary } from "@/components/monthly-summary";

export default async function SummaryPage({
    searchParams,
}: {
    searchParams: Promise<{ year?: string }>;
}) {
    const params = await searchParams;
    const year = params.year ? parseInt(params.year, 10) : undefined;

    const [history, settings, aiInsights] = await Promise.all([
        getMonthlyHistory(year),
        getUserSettings(),
        getAIMonthlyInsights(year).catch(() => ({})),
    ]);

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
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
                currentYear={year || new Date().getFullYear()}
                currency={settings.currency}
                budget={settings.monthlyBudget}
                aiInsights={aiInsights}
            />
        </div>
    );
}
