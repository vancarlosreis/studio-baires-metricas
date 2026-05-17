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

export function HourlyHeatmapDark({ data }: Props) {
  const values = parseHourly(data);
  const max = Math.max(...values, 1);
  const hasData = max > 0 && values.some((v) => v > 0);

  if (!hasData) {
    return (
      <div className="grid h-[220px] place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] text-sm text-white/40">
        Sem dados de seguidores online disponíveis
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-1.5">
        {HOURS.map((h) => {
          const v = values[h];
          const intensity = v / max;
          const opacity = 0.12 + intensity * 0.88;
          return (
            <div
              key={h}
              className="group relative flex aspect-square flex-col items-center justify-center rounded-md text-center text-[10px] font-semibold text-white"
              style={{
                background: `rgba(139, 92, 246, ${opacity})`,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              title={`${h.toString().padStart(2, "0")}h — ${new Intl.NumberFormat("pt-BR").format(v)}`}
            >
              <span className="text-white/80">{h.toString().padStart(2, "0")}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-white/40">
        <span>0h</span>
        <span>Intensidade ▮ seguidores online</span>
        <span>23h</span>
      </div>
    </div>
  );
}
