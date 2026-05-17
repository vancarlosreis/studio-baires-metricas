"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Bar chart de audiência por idade. Pode ser monocolor (só age) ou
 * vir com dados de gênero (M/F/U) se quisermos breakdown duplo.
 * No primeiro release uso só age — gênero é separado num donut.
 */

export type AgeBucket = {
  age: string;
  value: number;
};

const COLORS = {
  forest: "#2F4A35",
  burgundy: "#8B2C2C",
  ink: "#2A1F18",
};

function formatNumber(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function AgeBarChart({
  data,
  color = "forest",
  height = 240,
}: {
  data: AgeBucket[];
  color?: keyof typeof COLORS;
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper/50 text-sm italic text-ink-soft"
      >
        Sem dados de idade
      </div>
    );
  }

  const fill = COLORS[color];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(42,31,24,0.08)" vertical={false} />
        <XAxis
          dataKey="age"
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
          formatter={(value) => [formatNumber(Number(value)), "Pessoas"]}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Bar chart agrupado (várias séries lado a lado por categoria)
export type GroupedBarData = {
  age: string;
  Masculino: number;
  Feminino: number;
  Outros: number;
};

export function AgeGenderGroupedChart({
  data,
  height = 280,
}: {
  data: GroupedBarData[];
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper/50 text-sm italic text-ink-soft"
      >
        Sem dados de audiência por idade × gênero
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(42,31,24,0.08)" vertical={false} />
        <XAxis
          dataKey="age"
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
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
          iconType="circle"
        />
        <Bar dataKey="Feminino" fill={COLORS.burgundy} radius={[6, 6, 0, 0]} />
        <Bar dataKey="Masculino" fill={COLORS.forest} radius={[6, 6, 0, 0]} />
        <Bar dataKey="Outros" fill="#A8B3A2" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
