"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DayOfWeekStats } from "@/lib/queries/aggregates";

const FOREST = "#2F4A35";
const BURGUNDY = "#8B2C2C";

function formatNumber(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/**
 * Bar chart com 7 barras (Dom → Sáb), mostrando média de interações
 * por dia da semana de quando os posts foram publicados.
 */
export function DayOfWeekChart({
  data,
  height = 240,
  metric = "avgInteractions",
}: {
  data: DayOfWeekStats[];
  height?: number;
  metric?: "avgInteractions" | "count" | "totalInteractions";
}) {
  if (data.every((d) => d[metric] === 0)) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper/50 text-sm italic text-ink-soft"
      >
        Sem dados pra esse período
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d[metric] as number));
  const chartData = data.map((d) => ({
    day: d.label,
    value: d[metric] as number,
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(42,31,24,0.08)" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: "#5a4a3a", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "rgba(42,31,24,0.15)" }}
        />
        <YAxis
          tickFormatter={(v) => formatNumber(Number(v))}
          tick={{ fill: "#5a4a3a", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <Tooltip
          cursor={{ fill: "rgba(42,31,24,0.05)" }}
          contentStyle={{
            backgroundColor: "#F5EDD9",
            border: "1px solid rgba(42,31,24,0.15)",
            borderRadius: 12,
            fontSize: 12,
            color: "#2A1F18",
          }}
          formatter={(value, _name, props) => [
            `${formatNumber(Number(value))} interações em ${props.payload.count} ${props.payload.count === 1 ? "post" : "posts"}`,
            "",
          ]}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {chartData.map((d, i) => (
            <Cell
              key={i}
              fill={d.value === max && max > 0 ? BURGUNDY : FOREST}
              opacity={d.value === 0 ? 0.25 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
