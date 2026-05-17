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
  date: string; // ISO date YYYY-MM-DD
  value: number | null;
};

const COLOR_MAP = {
  forest: { stroke: "#2F4A35", fill: "#2F4A35" },
  burgundy: { stroke: "#8B2C2C", fill: "#8B2C2C" },
  ink: { stroke: "#2A1F18", fill: "#2A1F18" },
} as const;

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

export function EvolutionChart({
  data,
  color = "forest",
  height = 220,
  unit = "",
}: {
  data: EvolutionDataPoint[];
  color?: keyof typeof COLOR_MAP;
  height?: number;
  unit?: string;
}) {
  const colors = COLOR_MAP[color];
  const gradId = `grad-${color}`;

  // Filtra pontos null pra não dar tela vazia
  const cleanData = data.filter((d) => d.value !== null) as Array<{
    date: string;
    value: number;
  }>;

  if (cleanData.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper/50 px-6 text-center"
      >
        <p className="text-sm italic text-ink-soft">
          Sem dados ainda. Sincronize a conta pra começar.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={cleanData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.fill} stopOpacity={0.25} />
            <stop offset="100%" stopColor={colors.fill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(42,31,24,0.08)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
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
          contentStyle={{
            backgroundColor: "#F5EDD9",
            border: "1px solid rgba(42,31,24,0.15)",
            borderRadius: 12,
            fontSize: 12,
            color: "#2A1F18",
          }}
          labelFormatter={(label) => formatTooltipDate(label as string)}
          formatter={(value) =>
            [`${formatNumber(Number(value))}${unit}`, ""] as [string, string]
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={colors.stroke}
          strokeWidth={2.5}
          fill={`url(#${gradId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
