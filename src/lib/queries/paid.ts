import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

export type PaidAggregates = {
  reach: number;
  impressions: number;
  clicks: number;
  spend: number;
  video_views: number;
  engagement: number;
  media_count: number; // mídias com pelo menos 1 ad
  ad_count: number; // total de ads ativos no período
};

const EMPTY: PaidAggregates = {
  reach: 0,
  impressions: 0,
  clicks: 0,
  spend: 0,
  video_views: 0,
  engagement: 0,
  media_count: 0,
  ad_count: 0,
};

/**
 * Soma agregados de tráfego pago de todas as mídias de uma conta IG
 * publicadas no período. Usa o snapshot MAIS RECENTE de cada mídia
 * em `media_paid_insights`.
 *
 * Opcionalmente filtra por media_product_type (FEED / REELS / STORY).
 */
export async function getPaidAggregatesForPeriod(
  supabase: DB,
  igAccountId: string,
  start: Date,
  end: Date,
  productType?: "FEED" | "REELS" | null,
): Promise<PaidAggregates> {
  let q = supabase
    .from("media")
    .select(
      `
      id,
      posted_at,
      media_product_type,
      media_paid_insights (
        paid_reach,
        paid_impressions,
        paid_clicks,
        paid_spend,
        paid_video_views,
        paid_engagement,
        ad_count,
        snapshot_at
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

  const result: PaidAggregates = { ...EMPTY };
  for (const m of data) {
    const insights = m.media_paid_insights;
    if (!Array.isArray(insights) || insights.length === 0) continue;

    // Pega o snapshot mais recente desta mídia
    const latest = insights.reduce((acc, ins) =>
      new Date(ins.snapshot_at).getTime() > new Date(acc.snapshot_at).getTime()
        ? ins
        : acc,
    );

    if ((latest.paid_reach ?? 0) > 0 || (latest.ad_count ?? 0) > 0) {
      result.media_count += 1;
    }
    result.reach += latest.paid_reach ?? 0;
    result.impressions += latest.paid_impressions ?? 0;
    result.clicks += latest.paid_clicks ?? 0;
    result.spend += Number(latest.paid_spend ?? 0);
    result.video_views += latest.paid_video_views ?? 0;
    result.engagement += latest.paid_engagement ?? 0;
    result.ad_count += latest.ad_count ?? 0;
  }
  return result;
}

/**
 * Mapa media_id (UUID interno) → última snapshot de paid insights.
 * Útil pra MediaTable mostrar coluna "Alcance pago" por mídia.
 */
export async function getPaidInsightsByMediaId(
  supabase: DB,
  igAccountId: string,
): Promise<
  Map<
    string,
    {
      paid_reach: number;
      paid_impressions: number;
      paid_spend: number;
      paid_engagement: number;
      ad_count: number;
    }
  >
> {
  const { data, error } = await supabase
    .from("media")
    .select(
      `
      id,
      media_paid_insights (
        paid_reach, paid_impressions, paid_spend, paid_engagement,
        ad_count, snapshot_at
      )
    `,
    )
    .eq("ig_account_id", igAccountId)
    .is("deleted_at", null);

  const map = new Map<
    string,
    {
      paid_reach: number;
      paid_impressions: number;
      paid_spend: number;
      paid_engagement: number;
      ad_count: number;
    }
  >();
  if (error || !data) return map;

  for (const m of data) {
    const insights = m.media_paid_insights;
    if (!Array.isArray(insights) || insights.length === 0) continue;
    const latest = insights.reduce((acc, ins) =>
      new Date(ins.snapshot_at).getTime() > new Date(acc.snapshot_at).getTime()
        ? ins
        : acc,
    );
    map.set(m.id, {
      paid_reach: latest.paid_reach ?? 0,
      paid_impressions: latest.paid_impressions ?? 0,
      paid_spend: Number(latest.paid_spend ?? 0),
      paid_engagement: latest.paid_engagement ?? 0,
      ad_count: latest.ad_count ?? 0,
    });
  }
  return map;
}
