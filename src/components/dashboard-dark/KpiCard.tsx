"use client";

import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

type Props = {
  label: string;
  value: string;
  trend?: { delta: number; direction: "up" | "down" } | null;
  icon: LucideIcon;
  accent: "purple" | "pink" | "blue" | "cyan";
  sparkline?: number[] | null;
  hint?: string;
};

const accentMap = {
  purple: { ring: "ring-[var(--color-neon-purple)]/40", glow: "from-[var(--color-neon-purple)]/30", stroke: "#8B5CF6" },
  pink: { ring: "ring-[var(--color-neon-pink)]/40", glow: "from-[var(--color-neon-pink)]/30", stroke: "#EC4899" },
  blue: { ring: "ring-[var(--color-neon-blue)]/40", glow: "from-[var(--color-neon-blue)]/30", stroke: "#3B82F6" },
  cyan: { ring: "ring-[var(--color-neon-cyan)]/40", glow: "from-[var(--color-neon-cyan)]/30", stroke: "#22D3EE" },
};

export function KpiCard({ label, value, trend, icon: Icon, accent, sparkline, hint }: Props) {
  const a = accentMap[accent];
  const data = (sparkline ?? []).map((v, i) => ({ i, v }));
  const isUp = trend?.direction === "up";

  return (
    <div className="dark-card dark-card-hover relative overflow-hidden p-5">
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl ${a.glow}`}
      />
      <div className="relative flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-surface-2)] ring-1 ${a.ring}`}>
          <Icon size={18} className="text-white" strokeWidth={1.8} />
        </div>
        {trend ? (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              isUp
                ? "bg-[var(--color-success-neon)]/15 text-[var(--color-success-neon)]"
                : "bg-[var(--color-danger-neon)]/15 text-[var(--color-danger-neon)]"
            }`}
          >
            {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend.delta).toFixed(1)}%
          </span>
        ) : (
          <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-white/50">—</span>
        )}
      </div>

      <p className="relative mt-5 text-[11px] uppercase tracking-[0.18em] text-white/50">
        {label}
      </p>
      <p className="relative mt-1 text-[34px] font-bold leading-tight tracking-tight text-white">
        {value}
      </p>
      {hint && <p className="relative mt-1 text-xs text-white/50">{hint}</p>}

      {data.length > 1 && (
        <div className="relative mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line type="monotone" dataKey="v" stroke={a.stroke} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
