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
};

export function KpiCompareCard({ label, value, previous, start, end, invertDelta = false }: Props) {
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
        ? "bg-[var(--color-success-neon)]/15 text-[var(--color-success-neon)]"
        : "bg-[var(--color-danger-neon)]/15 text-[var(--color-danger-neon)]";

  const Arrow = delta == null ? null : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="dark-card dark-card-hover relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
          {label}
        </p>
        <span className="text-white/30" title="Comparação com período anterior">
          <Info size={12} />
        </span>
      </div>
      {start && end && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-white/40">
          📅 {formatDateBR(start)} → {formatDateBR(end)}
        </p>
      )}
      <p className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-white">
        {formatNumber(value)}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pillClass}`}>
          {Arrow && <Arrow size={11} />}
          {pct == null ? formatDelta(delta) : formatPct(pct)}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-white/40">
        {previous == null
          ? "sem período anterior"
          : `${formatNumber(previous)} no período anterior`}
      </p>
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
