/**
 * Helpers de período pra filtros de data no dashboard.
 * Presets: hoje, ontem, 7d, 15d, 30d, 90d, mes-atual, mes-passado, custom.
 */

export type PeriodPreset =
  | "hoje"
  | "ontem"
  | "7d"
  | "15d"
  | "30d"
  | "90d"
  | "mes-atual"
  | "mes-passado"
  | "custom";

export type Period = {
  preset: PeriodPreset;
  start: Date;
  end: Date;
  label: string;
};

export const PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "hoje", label: "Hoje" },
  { value: "ontem", label: "Ontem" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "15d", label: "Últimos 15 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Último trimestre" },
  { value: "mes-atual", label: "Mês até o momento" },
  { value: "mes-passado", label: "Último mês" },
  { value: "custom", label: "Período personalizado" },
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * Resolve um preset (ou par custom de/até) num Period completo.
 */
export function resolvePeriod(
  preset: string | undefined,
  customDe?: string,
  customAte?: string,
): Period {
  const presetKey = (
    PRESETS.find((p) => p.value === preset)?.value ?? "30d"
  ) as PeriodPreset;
  const now = new Date();

  switch (presetKey) {
    case "hoje":
      return {
        preset: "hoje",
        start: startOfDay(now),
        end: endOfDay(now),
        label: "Hoje",
      };
    case "ontem": {
      const y = daysAgo(1);
      return {
        preset: "ontem",
        start: startOfDay(y),
        end: endOfDay(y),
        label: "Ontem",
      };
    }
    case "7d":
      return {
        preset: "7d",
        start: startOfDay(daysAgo(7)),
        end: endOfDay(now),
        label: "Últimos 7 dias",
      };
    case "15d":
      return {
        preset: "15d",
        start: startOfDay(daysAgo(15)),
        end: endOfDay(now),
        label: "Últimos 15 dias",
      };
    case "30d":
      return {
        preset: "30d",
        start: startOfDay(daysAgo(30)),
        end: endOfDay(now),
        label: "Últimos 30 dias",
      };
    case "90d":
      return {
        preset: "90d",
        start: startOfDay(daysAgo(90)),
        end: endOfDay(now),
        label: "Último trimestre",
      };
    case "mes-atual":
      return {
        preset: "mes-atual",
        start: startOfMonth(now),
        end: endOfDay(now),
        label: "Mês até o momento",
      };
    case "mes-passado": {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      return {
        preset: "mes-passado",
        start: startOfMonth(prevMonth),
        end: endOfMonth(prevMonth),
        label: "Último mês",
      };
    }
    case "custom":
      if (customDe && customAte) {
        const start = startOfDay(new Date(customDe));
        const end = endOfDay(new Date(customAte));
        return {
          preset: "custom",
          start,
          end,
          label: `${formatDateBR(start)} → ${formatDateBR(end)}`,
        };
      }
      // fallback se custom sem datas
      return resolvePeriod("30d");
  }
}

/**
 * Período anterior do mesmo tamanho (pra comparação).
 */
export function previousPeriod(p: Period): Period {
  const lengthMs = p.end.getTime() - p.start.getTime();
  const prevEnd = new Date(p.start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - lengthMs);
  return {
    preset: p.preset,
    start: prevStart,
    end: prevEnd,
    label: `${formatDateBR(prevStart)} → ${formatDateBR(prevEnd)}`,
  };
}

export function formatDateBR(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateBRShort(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Calcula crescimento percentual entre dois valores. null se base for 0.
 */
export function growthPct(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Diferença numérica entre dois valores (current - previous).
 */
export function growthDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (current == null || previous == null) return null;
  return current - previous;
}
