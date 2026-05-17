"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

function formatNumber(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function DonutChart({
  data,
  height = 240,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-paper/50 text-sm italic text-ink-soft"
      >
        Sem dados de audiência
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((slice, i) => (
              <Cell key={i} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#F5EDD9",
              border: "1px solid rgba(42,31,24,0.15)",
              borderRadius: 12,
              fontSize: 12,
              color: "#2A1F18",
            }}
            formatter={(value, _name, props) => {
              const v = Number(value);
              const pct = ((v / total) * 100).toFixed(1);
              return [`${formatNumber(v)} (${pct}%)`, props.payload.label];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
          style={{ marginTop: 0 }}
        >
          {centerValue && (
            <div className="headline-display text-4xl text-ink">{centerValue}</div>
          )}
          {centerLabel && (
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              {centerLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DonutLegend({ data }: { data: DonutSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
      {data.map((s) => {
        const pct = ((s.value / total) * 100).toFixed(1);
        return (
          <div key={s.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-xs font-semibold text-ink">{s.label}</span>
            <span className="text-xs text-ink-soft">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
