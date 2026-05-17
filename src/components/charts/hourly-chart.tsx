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

const FOREST = "#2F4A35";

function formatNumber(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/**
 * Bar chart de 24 barras (uma por hora).
 * Destaca a hora com o pico.
 */
export function HourlyBarChart({
  data,
  height = 200,
}: {
  // {0: 142, 1: 89, ..., 23: 412}
  data: Record<string, number> | null | undefined;
  height?: number;
}) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper/50 text-sm italic text-ink-soft"
      >
        Sem dados de horário
      </div>
    );
  }

  const chartData = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}h`,
    value: data[hour] ?? data[String(hour)] ?? 0,
  }));

  const maxValue = Math.max(...chartData.map((d) => d.value));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(42,31,24,0.08)" vertical={false} />
        <XAxis
          dataKey="hour"
          tick={{ fill: "#5a4a3a", fontSize: 9 }}
          tickLine={false}
          axisLine={{ stroke: "rgba(42,31,24,0.15)" }}
          interval={1}
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
          labelFormatter={(label) => `${label}`}
          formatter={(value) => [formatNumber(Number(value)), "Seguidores online"]}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((d, i) => (
            <Cell
              key={i}
              fill={d.value === maxValue ? "#8B2C2C" : FOREST}
              opacity={d.value === maxValue ? 1 : 0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
