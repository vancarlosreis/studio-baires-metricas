"use client";

type Props = {
  data: Record<string, number> | null | undefined;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function parseHourly(data: Record<string, number> | null | undefined): number[] {
  if (!data) return new Array(24).fill(0);
  const out = new Array(24).fill(0);
  for (const [key, value] of Object.entries(data)) {
    const h = parseInt(key, 10);
    if (h >= 0 && h < 24) out[h] = value;
  }
  return out;
}

/**
 * Cor por rank relativo: 0 = pior (vermelho), 1 = melhor (verde).
 * Gradiente verde → amarelo → laranja → vermelho, mesma vibe do risk matrix.
 * (Aqui invertido: melhor = verde, pior = vermelho — oposto do risk matrix
 * onde alto risco = vermelho).
 */
function colorFor(rank: number): { bg: string; text: string } {
  // 5 buckets baseados no rank (0..1)
  if (rank >= 0.8) return { bg: "rgba(34, 197, 94, 0.85)", text: "text-white" }; // green-500
  if (rank >= 0.6) return { bg: "rgba(132, 204, 22, 0.80)", text: "text-white" }; // lime-500
  if (rank >= 0.4) return { bg: "rgba(234, 179, 8, 0.80)", text: "text-black" }; // yellow-500
  if (rank >= 0.2) return { bg: "rgba(249, 115, 22, 0.85)", text: "text-white" }; // orange-500
  return { bg: "rgba(239, 68, 68, 0.85)", text: "text-white" }; // red-500
}

export function HourlyHeatmapDark({ data }: Props) {
  const values = parseHourly(data);
  const hasData = values.some((v) => v > 0);

  if (!hasData) {
    return (
      <div className="grid h-[220px] place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] text-sm text-white/40">
        Sem dados de seguidores online disponíveis
      </div>
    );
  }

  // Rank baseado em min..max (cada hora vira posição relativa 0..1)
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-1.5">
        {HOURS.map((h) => {
          const v = values[h];
          const rank = (v - min) / range;
          const c = colorFor(rank);
          return (
            <div
              key={h}
              className={`relative grid aspect-square place-items-center rounded-md border border-white/[0.05] text-[10px] font-semibold ${c.text}`}
              style={{ background: c.bg }}
              title={`${h.toString().padStart(2, "0")}h — ${new Intl.NumberFormat("pt-BR").format(v)} seguidores online`}
            >
              <span>{h.toString().padStart(2, "0")}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: "rgba(239, 68, 68, 0.85)" }}
          />
          Pior horário
        </span>
        <span className="italic">Seguidores online por hora</span>
        <span className="flex items-center gap-1">
          Melhor horário
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: "rgba(34, 197, 94, 0.85)" }}
          />
        </span>
      </div>
    </div>
  );
}
