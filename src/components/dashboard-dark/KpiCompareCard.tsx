import { ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import { formatDateBR } from "@/lib/period";

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

function formatPct(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1).replace(".", ",")}%`;
}

function formatDelta(n: number | null | undefined): string {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("pt-BR").format(n)}`;
}

type Props = {
  label: string;
  value: number | null | undefined;
  previous: number | null | undefined;
  start?: Date;
  end?: Date;
  invertDelta?: boolean;
  /** Quando false, esconde toda a área de comparação (pill, anterior). Default true. */
  compare?: boolean;
  /** Breakdown orgânico vs pago (paid é subconjunto do total `value`). */
  paid?: {
    value: number;
    total: number;
    label?: string;
  } | null;
};

export function KpiCompareCard({
  label,
  value,
  previous,
  start,
  end,
  invertDelta = false,
  compare = true,
  paid,
}: Props) {
  const delta = value != null && previous != null ? value - previous : null;
  const pct =
    value != null && previous != null && previous !== 0
      ? ((value - previous) / previous) * 100
      : null;
  const isPositive = delta != null && delta >= 0;
  const isGood = invertDelta ? !isPositive : isPositive;

  const pillClass =
    delta == null
      ? "bg-white/5 text-white/50"
      : isGood
        ? "bg-success-neon/15 text-success-neon"
        : "bg-danger-neon/15 text-danger-neon";

  const Arrow = delta == null ? null : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="dark-card dark-card-hover relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
          {label}
        </p>
        {compare && (
          <span className="text-white/30" title="Comparação com período anterior">
            <Info size={12} />
          </span>
        )}
      </div>
      {start && end && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-white/40">
          📅 {formatDateBR(start)} → {formatDateBR(end)}
        </p>
      )}
      <p className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-white">
        {formatNumber(value)}
      </p>
      {compare && (
        <>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pillClass}`}
            >
              {Arrow && <Arrow size={11} />}
              {pct == null ? formatDelta(delta) : formatPct(pct)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-white/40">
            {previous == null
              ? "sem período anterior"
              : `${formatNumber(previous)} no período anterior`}
          </p>
        </>
      )}

      {paid && paid.total > 0 && (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
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
                    <span className="text-neon-pink">{paidPct.toFixed(0)}%</span>
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
                <p className="mt-1 text-[10px] text-white/40">
                  {formatNumber(paid.value)} via {paid.label?.toLowerCase() ?? "ads"}
                </p>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export function KpiEmptyCard({
  label,
  helpText = "O Instagram não envia dados históricos.",
}: {
  label: string;
  helpText?: string;
}) {
  return (
    <div className="dark-card relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
          {label}
        </p>
        <Info size={12} className="text-white/30" />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-white/60">{helpText}</p>
    </div>
  );
}
