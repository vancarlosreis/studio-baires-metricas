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

const tooltipStyle = {
  background: "#1A1A1F",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  color: "#fff",
  fontSize: 12,
  padding: "8px 12px",
};

export function DonutChartDark({
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
        className="grid place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] text-sm text-white/40"
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
            innerRadius="60%"
            outerRadius="92%"
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((slice, i) => (
              <Cell key={i} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, _name, props) => {
              const v = Number(value);
              const pct = ((v / total) * 100).toFixed(1);
              return [`${formatNumber(v)} (${pct}%)`, props.payload.label];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue && (
            <div className="text-3xl font-bold text-white">{centerValue}</div>
          )}
          {centerLabel && (
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
              {centerLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DonutLegendDark({ data }: { data: DonutSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {data.map((s) => {
        const pct = ((s.value / total) * 100).toFixed(1);
        return (
          <div key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-xs font-medium text-white">{s.label}</span>
            <span className="text-xs text-white/50">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
