import { formatDateBR } from "@/lib/period";

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

function formatPct(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2).replace(".", ",")}%`;
}

function formatDelta(n: number | null | undefined): string {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("pt-BR").format(n)}`;
}

/**
 * KPI básico — usado no overview da página principal.
 */
export function KpiCard({
  label,
  value,
  accent = "ink",
}: {
  label: string;
  value: string;
  accent?: "ink" | "forest" | "burgundy";
}) {
  const color =
    accent === "forest"
      ? "text-forest"
      : accent === "burgundy"
        ? "text-burgundy"
        : "text-ink";
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
        {label}
      </div>
      <div className={`headline-display mt-2 text-4xl ${color}`}>{value}</div>
    </div>
  );
}

/**
 * KPI com comparação de período anterior.
 * Mostra: título · valor · variação % (pill verde/vermelha) · valor anterior.
 */
export function KpiComparisonCard({
  label,
  value,
  previous,
  periodLabel,
  invertDelta = false,
}: {
  label: string;
  value: number | null | undefined;
  previous: number | null | undefined;
  periodLabel?: string; // ex: "17/04/2026 a 16/05/2026"
  invertDelta?: boolean; // pra métricas onde menos é melhor
}) {
  const delta =
    value != null && previous != null ? value - previous : null;
  const pct =
    value != null && previous != null && previous !== 0
      ? ((value - previous) / previous) * 100
      : value != null && previous === 0 && value > 0
        ? null // crescimento "infinito" pra base zero
        : null;
  const isPositive = delta != null && delta >= 0;
  const isGood = invertDelta ? !isPositive : isPositive;

  const pillClass =
    delta == null
      ? "bg-ink/5 text-ink-soft"
      : isGood
        ? "bg-forest/15 text-forest"
        : "bg-burgundy/15 text-burgundy";

  const arrow = delta == null ? "→" : isPositive ? "▲" : "▼";

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
          {label}
        </div>
        <span
          className="text-ink-soft/60"
          title="Comparação com período anterior"
        >
          ⓘ
        </span>
      </div>
      {periodLabel && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-ink-soft">
          <span>📅</span>
          <span>{periodLabel}</span>
        </div>
      )}
      <div className="headline-display mt-2 text-4xl text-ink">
        {formatNumber(value)}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pillClass}`}
        >
          <span>{arrow}</span>
          <span>{pct == null ? formatDelta(delta) : formatPct(pct)}</span>
        </span>
      </div>
      <div className="mt-1 text-[10px] text-ink-soft">
        {previous == null
          ? "sem período anterior"
          : `${formatNumber(previous)} no período anterior`}
      </div>
    </div>
  );
}

/**
 * KPI sem histórico (ex: "Número de seguidores" — Instagram não envia série temporal).
 */
export function KpiNoHistoryCard({
  label,
  helpText = "O Instagram não envia dados históricos.",
}: {
  label: string;
  helpText?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
          {label}
        </div>
        <span className="text-ink-soft/60" title="Sem histórico via API">
          ⓘ
        </span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{helpText}</p>
    </div>
  );
}

/**
 * KPI com sub-período (range de datas exibido com ícone de calendário).
 */
export function KpiWithDateRange({
  label,
  value,
  previous,
  start,
  end,
  invertDelta = false,
}: {
  label: string;
  value: number | null | undefined;
  previous: number | null | undefined;
  start: Date;
  end: Date;
  invertDelta?: boolean;
}) {
  const periodLabel = `${formatDateBR(start)} a ${formatDateBR(end)}`;
  return (
    <KpiComparisonCard
      label={label}
      value={value}
      previous={previous}
      periodLabel={periodLabel}
      invertDelta={invertDelta}
    />
  );
}
