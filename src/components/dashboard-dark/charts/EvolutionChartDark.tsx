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

export type EvolutionDataPoint = {
  date: string;
  value: number | null;
};

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatTooltipDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toString();
}

const tooltipStyle = {
  background: "#1A1A1F",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  color: "#fff",
  fontSize: 12,
  padding: "8px 12px",
};

export function EvolutionChartDark({
  data,
  height = 240,
  unit = "",
}: {
  data: EvolutionDataPoint[];
  height?: number;
  unit?: string;
}) {
  const cleanData = data.filter((d) => d.value !== null) as Array<{
    date: string;
    value: number;
  }>;

  if (cleanData.length === 0) {
    return (
      <div
        style={{ height }}
        className="grid place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 text-center text-sm text-white/40"
      >
        Sem dados ainda. Sincronize a conta pra começar.
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={cleanData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-evolution-dark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => formatNumber(Number(v))}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ stroke: "rgba(255,255,255,0.15)" }}
            labelFormatter={(label) => formatTooltipDate(label as string)}
            formatter={(value) =>
              [`${formatNumber(Number(value))}${unit}`, ""] as [string, string]
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#A78BFA"
            strokeWidth={2.4}
            fill="url(#grad-evolution-dark)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
