import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

/**
 * Agregados de uma seção (FEED ou REELS) num período.
 * Soma métricas das mídias publicadas dentro do período.
 */
export type MediaAggregates = {
  count: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  reach: number;
  views: number;
  total_interactions: number;
  profile_visits: number;
  follows: number;
};

const EMPTY: MediaAggregates = {
  count: 0,
  likes: 0,
  comments: 0,
  saves: 0,
  shares: 0,
  reach: 0,
  views: 0,
  total_interactions: 0,
  profile_visits: 0,
  follows: 0,
};

/**
 * Soma agregada das métricas das mídias do tipo `productType`
 * publicadas entre [start, end].
 */
export async function getMediaAggregates(
  supabase: DB,
  igAccountId: string,
  productType: "FEED" | "REELS" | null,
  start: Date,
  end: Date,
): Promise<MediaAggregates> {
  let q = supabase
    .from("media")
    .select(
      `
      id,
      posted_at,
      media_product_type,
      media_insights (
        likes, comments, saves, shares, reach, views,
        total_interactions, profile_visits, follows, snapshot_at
      )
    `,
    )
    .eq("ig_account_id", igAccountId)
    .is("deleted_at", null)
    .gte("posted_at", start.toISOString())
    .lte("posted_at", end.toISOString());

  if (productType) q = q.eq("media_product_type", productType);

  const { data, error } = await q;
  if (error || !data) return EMPTY;

  const result: MediaAggregates = { ...EMPTY };
  for (const m of data) {
    result.count += 1;
    // Pega o insight mais recente (snapshot_at maior)
    const insights = m.media_insights;
    let latest: NonNullable<typeof insights>[number] | null = null;
    if (Array.isArray(insights) && insights.length > 0) {
      latest = insights.reduce((acc, ins) =>
        new Date(ins.snapshot_at).getTime() > new Date(acc.snapshot_at).getTime()
          ? ins
          : acc,
      );
    }
    if (latest) {
      result.likes += latest.likes ?? 0;
      result.comments += latest.comments ?? 0;
      result.saves += latest.saves ?? 0;
      result.shares += latest.shares ?? 0;
      result.reach += latest.reach ?? 0;
      result.views += latest.views ?? 0;
      result.total_interactions += latest.total_interactions ?? 0;
      result.profile_visits += latest.profile_visits ?? 0;
      result.follows += latest.follows ?? 0;
    }
  }

  return result;
}

/**
 * Subtrai dois agregados (current - previous) pra calcular deltas.
 */
export function diffAggregates(
  current: MediaAggregates,
  previous: MediaAggregates,
): Record<keyof MediaAggregates, number> {
  const result = {} as Record<keyof MediaAggregates, number>;
  for (const key of Object.keys(current) as Array<keyof MediaAggregates>) {
    result[key] = current[key] - previous[key];
  }
  return result;
}

/**
 * Distribui mídias por dia da semana (Dom=0, Sab=6) e calcula
 * total de interações por dia. Útil pra "Melhor dia pra postar".
 */
export type DayOfWeekStats = {
  day: number; // 0..6
  label: string; // Dom, Seg, ...
  count: number;
  totalInteractions: number;
  avgInteractions: number;
};

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export async function getMediaByDayOfWeek(
  supabase: DB,
  igAccountId: string,
  start: Date,
  end: Date,
): Promise<DayOfWeekStats[]> {
  const { data, error } = await supabase
    .from("media")
    .select(
      `
      id,
      posted_at,
      media_insights (
        total_interactions, snapshot_at
      )
    `,
    )
    .eq("ig_account_id", igAccountId)
    .is("deleted_at", null)
    .gte("posted_at", start.toISOString())
    .lte("posted_at", end.toISOString());

  if (error || !data) {
    return DAY_LABELS.map((label, i) => ({
      day: i,
      label,
      count: 0,
      totalInteractions: 0,
      avgInteractions: 0,
    }));
  }

  const buckets = DAY_LABELS.map((label, i) => ({
    day: i,
    label,
    count: 0,
    totalInteractions: 0,
    avgInteractions: 0,
  }));

  for (const m of data) {
    const day = new Date(m.posted_at).getDay();
    const insights = m.media_insights;
    let latest: NonNullable<typeof insights>[number] | null = null;
    if (Array.isArray(insights) && insights.length > 0) {
      latest = insights.reduce((acc, ins) =>
        new Date(ins.snapshot_at).getTime() > new Date(acc.snapshot_at).getTime()
          ? ins
          : acc,
      );
    }
    buckets[day].count += 1;
    buckets[day].totalInteractions += latest?.total_interactions ?? 0;
  }

  for (const b of buckets) {
    b.avgInteractions =
      b.count > 0 ? Math.round(b.totalInteractions / b.count) : 0;
  }

  return buckets;
}

/**
 * Busca o snapshot mais próximo de uma data. Útil pra comparar
 * "agora" com "30 dias atrás".
 */
export async function getSnapshotNearDate(
  supabase: DB,
  igAccountId: string,
  date: Date,
): Promise<Database["public"]["Tables"]["account_snapshots"]["Row"] | null> {
  const dateStr = date.toISOString().slice(0, 10);

  // Tenta snapshot do dia exato ou antes
  const { data: before } = await supabase
    .from("account_snapshots")
    .select("*")
    .eq("ig_account_id", igAccountId)
    .lte("snapshot_date", dateStr)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return before ?? null;
}
