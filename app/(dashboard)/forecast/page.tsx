import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForecastChart } from "@/components/forecast-chart";
import { GoalsList } from "@/components/goals-list";
import { RecurringExpenses } from "@/components/recurring-expenses";
import { WhatIfScenarios } from "@/components/what-if-scenarios";
import { getForecastData, getRecurringExpenses, getUpcomingRecurringAlerts } from "@/lib/actions/forecasting";
import { getGoals, getGoalSummary } from "@/lib/actions/goals";
import { getUserSettings } from "@/lib/actions/settings";
import { IconCrystalBall, IconTrendingUp, IconRepeat, IconTarget, IconBrain } from "@tabler/icons-react";
import { PageHeader, PageShell } from "@/components/page-shell";

export default async function ForecastPage() {
  const [settings, forecast, goals, goalSummary, recurring, alerts] = await Promise.all([
    getUserSettings(),
    getForecastData(),
    getGoals(),
    getGoalSummary(),
    getRecurringExpenses(),
    getUpcomingRecurringAlerts(),
  ]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <PageShell>
      <PageHeader
        title="Forecast & Planning"
        description="Predict your financial future and plan your goals"
        icon={IconCrystalBall}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <IconTrendingUp className="h-4 w-4" />
              <span className="text-xs">Projected End</span>
            </div>
            <div className="text-xl font-bold">
              {formatCurrency(forecast.projectedBalances[forecast.projectedBalances.length - 1] || 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <IconRepeat className="h-4 w-4" />
              <span className="text-xs">Recurring/Month</span>
            </div>
            <div className="text-xl font-bold">
              {formatCurrency(forecast.recurringExpenses[0] || 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <IconTarget className="h-4 w-4" />
              <span className="text-xs">Goals</span>
            </div>
            <div className="text-xl font-bold">
              {goalSummary.activeGoals} active
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <IconBrain className="h-4 w-4" />
              <span className="text-xs">Horizon</span>
            </div>
            <div className="text-xl font-bold">
              {settings.forecastHorizonMonths} months
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Forecast Chart - takes full width on mobile, 2 cols on lg */}
        <Card className="border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IconTrendingUp className="h-4 w-4" />
              Balance Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ForecastChart data={forecast} currency={settings.currency} />
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Projected</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span>Optimistic</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span>Pessimistic</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IconTarget className="h-4 w-4" />
              Budget Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GoalsList
              goals={goals}
              currency={settings.currency}
              summary={{
                overallProgress: goalSummary.overallProgress,
                activeGoals: goalSummary.activeGoals,
                atRiskCount: goalSummary.atRiskCount,
              }}
            />
          </CardContent>
        </Card>

        {/* Recurring Expenses */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IconRepeat className="h-4 w-4" />
              Recurring Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecurringExpenses patterns={recurring} currency={settings.currency} />
          </CardContent>
        </Card>

        {/* What-If Scenarios */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IconBrain className="h-4 w-4" />
              Scenario Planning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WhatIfScenarios currency={settings.currency} />
          </CardContent>
        </Card>

        {/* Upcoming Alerts */}
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IconCrystalBall className="h-4 w-4" />
              Upcoming Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.map((alert, idx) => (
                  <div
                    key={`${alert.name}-${alert.amount}-${idx}`}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{alert.name}</p>
                      <p className="text-xs text-muted-foreground">{alert.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(alert.amount)}</p>
                      <p className={`text-xs ${alert.daysUntil <= 1 ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                        {alert.daysUntil === 0
                          ? "Due today"
                          : alert.daysUntil === 1
                            ? "Due tomorrow"
                            : `In ${alert.daysUntil} days`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <IconCrystalBall className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming alerts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recurring expenses due in the next 7 days will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
