"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SpendingTrendPoint {
  date: string;
  label: string;
  value: number;
}

interface SpendingTrendChartProps {
  data: SpendingTrendPoint[];
  currency: string;
}

export function SpendingTrendChart({ data, currency }: SpendingTrendChartProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);

  const formatCompactCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(amount);

  const highest = data.reduce(
    (largest, point) => (point.value > largest.value ? point : largest),
    data[0] ?? { date: "", label: "", value: 0 },
  );

  return (
    <div>
      <p className="sr-only">
        Daily spending for the selected month. Highest spend was{" "}
        {formatCurrency(highest.value)} on {highest.date || "a day with no recorded spending"}.
      </p>
      <div className="h-52 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id="dashboard-spending-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              minTickGap={20}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCompactCurrency}
              width={68}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "Spent"]}
              labelFormatter={(label) => String(label)}
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              contentStyle={{
                border: "1px solid var(--border)",
                borderRadius: "4px",
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                boxShadow: "0 6px 18px rgb(0 0 0 / 0.12)",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name="Spent"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#dashboard-spending-area)"
              activeDot={{ r: 5, strokeWidth: 2 }}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
