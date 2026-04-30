"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ForecastData } from "@/lib/actions/forecasting";

type ForecastChartProps = {
  data: ForecastData;
  currency: string;
};

export function ForecastChart({ data, currency }: ForecastChartProps) {
  const chartData = useMemo(() => {
    return data.months.map((month, i) => ({
      month,
      projected: data.projectedBalances[i],
      optimistic: data.optimisticBalances[i],
      pessimistic: data.pessimisticBalances[i],
      recurring: data.recurringExpenses[i],
      goals: data.goalContributions[i],
    }));
  }, [data]);

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        No forecast data available. Add expenses and accounts to see projections.
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPessimistic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            angle={-35}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            width={55}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                  <p className="text-sm font-medium mb-2">{label}</p>
                  {payload.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2 w-2 rounded-full inline-block"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="capitalize">{entry.name}</span>
                      <span className="font-medium">{formatTooltipValue(Number(entry.value))}</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Area
            type="monotone"
            dataKey="optimistic"
            name="Optimistic"
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="url(#colorOptimistic)"
          />
          <Area
            type="monotone"
            dataKey="projected"
            name="Projected"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorProjected)"
          />
          <Area
            type="monotone"
            dataKey="pessimistic"
            name="Pessimistic"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="url(#colorPessimistic)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
