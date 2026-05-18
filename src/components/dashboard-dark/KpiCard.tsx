"use client";

import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Eye,
  Activity,
  TrendingUp,
  Heart,
  Link as LinkIcon,
  type LucideIcon,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export type KpiIconName =
  | "users"
  | "eye"
  | "activity"
  | "trending-up"
  | "heart"
  | "link";

const ICONS: Record<KpiIconName, LucideIcon> = {
  users: Users,
  eye: Eye,
  activity: Activity,
  "trending-up": TrendingUp,
  heart: Heart,
  link: LinkIcon,
};

type Props = {
  label: string;
  value: string;
  trend?: { delta: number; direction: "up" | "down" } | null;
  icon: KpiIconName;
  accent: "purple" | "pink" | "blue" | "cyan";
  sparkline?: number[] | null;
  hint?: string;
  /**
   * Quando informado, mostra uma barrinha embaixo do valor com a divisão
   * orgânico vs pago. Total deve ser >= paid (paid é subconjunto do total).
   */
  paid?: {
    /** Valor pago (subconjunto do total exibido em `value`) */
    value: number;
    /** Total numérico — usado pra calcular % */
    total: number;
    /** Label do número pago — ex: "pago" ou "ads" */
    label?: string;
  } | null;
};

const accentMap = {
  purple: { ring: "ring-neon-purple/40", glow: "from-neon-purple/30", stroke: "#8B5CF6" },
  pink: { ring: "ring-neon-pink/40", glow: "from-neon-pink/30", stroke: "#EC4899" },
  blue: { ring: "ring-neon-blue/40", glow: "from-neon-blue/30", stroke: "#3B82F6" },
  cyan: { ring: "ring-neon-cyan/40", glow: "from-neon-cyan/30", stroke: "#22D3EE" },
};

export function KpiCard({ label, value, trend, icon, accent, sparkline, hint, paid }: Props) {
  const Icon = ICONS[icon];
  const a = accentMap[accent];
  const data = (sparkline ?? []).map((v, i) => ({ i, v }));
  const isUp = trend?.direction === "up";

  return (
    <div className="dark-card dark-card-hover relative overflow-hidden p-5">
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl ${a.glow}`}
      />
      <div className="relative flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl bg-surface-2 ring-1 ${a.ring}`}>
          <Icon size={18} className="text-white" strokeWidth={1.8} />
        </div>
        {trend ? (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              isUp
                ? "bg-success-neon/15 text-success-neon"
                : "bg-danger-neon/15 text-danger-neon"
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

      {paid && paid.total > 0 && (
        <div className="relative mt-3">
          {(() => {
            const paidPct = Math.min(100, (paid.value / paid.total) * 100);
            const organicPct = 100 - paidPct;
            return (
              <>
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                  <span className="text-white/60">
                    Orgânico{" "}
                    <span className="text-white">{organicPct.toFixed(0)}%</span>
                  </span>
                  <span className="text-white/60">
                    {paid.label ?? "Pago"}{" "}
                    <span className="text-neon-pink">
                      {paidPct.toFixed(0)}%
                    </span>
                  </span>
                </div>
                <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full bg-neon-blue"
                    style={{ width: `${organicPct}%` }}
                  />
                  <div
                    className="h-full bg-neon-pink"
                    style={{ width: `${paidPct}%` }}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}

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
