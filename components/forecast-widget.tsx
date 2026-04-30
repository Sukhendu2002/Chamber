"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconAlertTriangle,
  IconChartLine,
} from "@tabler/icons-react";
import { ForecastData } from "@/lib/actions/forecasting";
import Link from "next/link";

type RecurringAlert = {
  name: string;
  amount: number;
  daysUntil: number;
  category: string;
};

type ForecastWidgetProps = {
  forecast: ForecastData;
  currency: string;
  alerts: RecurringAlert[];
};

export function ForecastWidget({ forecast, currency, alerts }: ForecastWidgetProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const trend = useMemo(() => {
    if (forecast.projectedBalances.length === 0) return "neutral";
    const first = forecast.projectedBalances[0];
    const last = forecast.projectedBalances[forecast.projectedBalances.length - 1];
    if (last > first * 1.05) return "up";
    if (last < first * 0.95) return "down";
    return "neutral";
  }, [forecast]);

  const endBalance = forecast.projectedBalances[forecast.projectedBalances.length - 1] || 0;
  const isNegative = endBalance < 0;

  return (
    <Card className="border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <IconChartLine className="h-4 w-4" />
          Financial Forecast
        </CardTitle>
        <Link href="/forecast" className="text-xs text-blue-500 hover:underline">
          View Details
        </Link>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${isNegative ? "bg-red-100 text-red-600" : trend === "up" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
            {isNegative ? (
              <IconAlertTriangle className="h-5 w-5" />
            ) : trend === "up" ? (
              <IconTrendingUp className="h-5 w-5" />
            ) : (
              <IconTrendingDown className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-2xl font-bold">
              {formatCurrency(endBalance)}
            </p>
            <p className="text-xs text-muted-foreground">
              Projected in {forecast.months.length} months
            </p>
          </div>
        </div>

        {/* Mini sparkline */}
        {forecast.projectedBalances.length > 0 && (
          <div className="flex items-end gap-0.5 h-10 mb-4">
            {forecast.projectedBalances.map((balance, i) => {
              const min = Math.min(...forecast.projectedBalances, ...forecast.optimisticBalances, ...forecast.pessimisticBalances);
              const max = Math.max(...forecast.projectedBalances, ...forecast.optimisticBalances, ...forecast.pessimisticBalances);
              const range = max - min || 1;
              const height = Math.max(15, ((balance - min) / range) * 100);
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${isNegative ? "bg-red-400" : "bg-primary"}`}
                  style={{ height: `${height}%`, opacity: 0.3 + (i / forecast.projectedBalances.length) * 0.7 }}
                />
              );
            })}
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
            <div className="space-y-1.5">
              {alerts.slice(0, 3).map((alert, idx) => (
                <div key={`${alert.name}-${alert.amount}-${idx}`} className="flex items-center justify-between text-xs">
                  <span className="truncate">{alert.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{formatCurrency(alert.amount)}</span>
                    <Badge variant={alert.daysUntil <= 1 ? "destructive" : "secondary"} className="text-[10px] h-4">
                      {alert.daysUntil === 0 ? "Today" : `${alert.daysUntil}d`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {alerts.length === 0 && !isNegative && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No upcoming recurring expenses in the next 7 days
          </p>
        )}

        {isNegative && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-md px-3 py-2 mt-2">
            <IconAlertTriangle className="h-4 w-4 shrink-0" />
            <span>Projected balance goes negative. Consider reducing expenses.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
