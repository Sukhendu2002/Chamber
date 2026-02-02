"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

type AccountInfo = {
  id: string;
  name: string;
  color: string;
};

type BalanceHistoryChartProps = {
  accounts: AccountInfo[];
  timeline: Record<string, number | string>[];
  currency: string;
};

export function BalanceHistoryChart({ accounts, timeline, currency }: BalanceHistoryChartProps) {
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

  // Date is already formatted from server, just return as-is
  const formatDate = (dateStr: string) => {
    return dateStr;
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
      // Keep null as null, convert numbers
      processed[acc.id] = val === null || val === undefined ? null : Number(val);
    }
    return processed;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={formatCurrency}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          width={60}
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
                    <span style={{ color: entry.color }}>{nameMap[String(entry.dataKey)] || entry.name}</span>
                    <span className="font-medium" style={{ color: entry.color }}>
                      : {formatTooltipValue(Number(entry.value) || 0)}
                    </span>
                  </div>
                ))}
              </div>
            );
          }}
        />
        <Legend 
          formatter={(value) => nameMap[value] || value}
          wrapperStyle={{ fontSize: "12px" }}
        />
        {accounts.map((account) => (
          <Line
            key={account.id}
            type="monotone"
            dataKey={account.id}
            name={account.id}
            stroke={account.color}
            strokeWidth={2}
            dot={{ fill: account.color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
