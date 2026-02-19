"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AccountInfo = {
  id: string;
  name: string;
  color: string;
};

type BalanceHistoryChartProps = {
  accounts: AccountInfo[];
  timeline: Record<string, number | string | null>[];
  currency: string;
};

const STORAGE_KEY = "chamber-balance-chart-hidden";

export function BalanceHistoryChart({ accounts, timeline, currency }: BalanceHistoryChartProps) {
  const [hiddenAccounts, setHiddenAccounts] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return new Set(JSON.parse(stored) as string[]);
      }
    } catch {
      // Storage unavailable — ignore
    }
    return new Set();
  });

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...hiddenAccounts]));
    } catch {
      // Storage full or unavailable — ignore
    }
  }, [hiddenAccounts]);

  const toggleAccount = useCallback((accountId: string) => {
    setHiddenAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }, []);

  const visibleAccounts = accounts.filter((a) => !hiddenAccounts.has(a.id));

  const formatCurrency = (value: number) => {
    if (value >= 10000000) {
      return `${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) {
      return `${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Create a name map for tooltip
  const nameMap: Record<string, string> = {};
  for (const acc of accounts) {
    nameMap[acc.id] = acc.name;
  }

  if (timeline.length === 0 || accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No balance history data available. Update your account balances to see the trend.
      </div>
    );
  }

  // Ensure all numeric values are actually numbers (not strings)
  // Keep null values as null so recharts skips them
  const processedData = timeline.map((point, index) => {
    const processed: Record<string, number | string | null> = { 
      date: String(point.date),
      index: index,
    };
    for (const acc of accounts) {
      const val = point[acc.id];
      processed[acc.id] = val === null || val === undefined ? null : Number(val);
    }
    return processed;
  });

  // Adaptive settings based on data density
  const dataPointCount = processedData.length;
  const showDots = dataPointCount <= 15;
  const dotRadius = dataPointCount <= 8 ? 4 : 3;
  const xAxisInterval = dataPointCount <= 10
    ? 0
    : dataPointCount <= 20
      ? 1
      : Math.floor(dataPointCount / 8);

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            interval={xAxisInterval}
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
            content={(props) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { active, payload, label } = props as any;
              if (!active || !payload || payload.length === 0) return null;
              return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                  <p className="text-sm font-medium mb-2">{label}</p>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {payload.map((entry: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2 w-2 rounded-full inline-block"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span style={{ color: entry.color }}>
                        {nameMap[String(entry.dataKey)] || entry.name}
                      </span>
                      <span className="font-medium">
                        {formatTooltipValue(Number(entry.value) || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          {visibleAccounts.map((account) => (
            <Line
              key={account.id}
              type="monotone"
              dataKey={account.id}
              name={account.id}
              stroke={account.color}
              strokeWidth={2}
              dot={showDots ? { fill: account.color, strokeWidth: 1, r: dotRadius } : false}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Custom interactive legend for toggling accounts */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 px-1">
        {accounts.map((account) => {
          const isHidden = hiddenAccounts.has(account.id);
          return (
            <button
              key={account.id}
              type="button"
              onClick={() => toggleAccount(account.id)}
              className="flex items-center gap-1.5 text-xs cursor-pointer select-none transition-opacity hover:opacity-80"
              style={{ opacity: isHidden ? 0.4 : 1 }}
              aria-label={`${isHidden ? "Show" : "Hide"} ${account.name}`}
            >
              <span
                className="h-2.5 w-2.5 rounded-sm inline-block border"
                style={{
                  backgroundColor: isHidden ? "transparent" : account.color,
                  borderColor: account.color,
                }}
              />
              <span
                className={isHidden ? "line-through text-muted-foreground" : ""}
              >
                {account.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
