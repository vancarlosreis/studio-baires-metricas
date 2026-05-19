import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

export type StoryRow = Database["public"]["Tables"]["stories"]["Row"];

export type StoryAggregates = {
  count: number;
  views: number;
  reach: number;
  total_interactions: number;
  replies: number;
  shares: number;
  taps_forward: number;
  taps_back: number;
  exits: number;
  navigation: number;
  profile_activity: number;
  /** Retenção média = 1 - (exits / views). */
  retention_avg: number | null;
};

const EMPTY_AGG: StoryAggregates = {
  count: 0,
  views: 0,
  reach: 0,
  total_interactions: 0,
  replies: 0,
  shares: 0,
  taps_forward: 0,
  taps_back: 0,
  exits: 0,
  navigation: 0,
  profile_activity: 0,
  retention_avg: null,
};

/**
 * Lista stories de uma conta publicados no período, ordenados do mais recente
 * pro mais antigo.
 */
export async function listStoriesForPeriod(
  supabase: DB,
  igAccountId: string,
  start: Date,
  end: Date,
  limit = 100,
): Promise<StoryRow[]> {
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("ig_account_id", igAccountId)
    .is("deleted_at", null)
    .gte("posted_at", start.toISOString())
    .lte("posted_at", end.toISOString())
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listStoriesForPeriod] erro:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Agrega métricas dos stories no período.
 * Retorna soma + retenção média (1 - exits/views).
 */
export async function getStoriesAggregates(
  supabase: DB,
  igAccountId: string,
  start: Date,
  end: Date,
): Promise<StoryAggregates> {
  const stories = await listStoriesForPeriod(supabase, igAccountId, start, end, 1000);
  if (stories.length === 0) return EMPTY_AGG;

  const agg = { ...EMPTY_AGG, count: stories.length, retention_avg: null as number | null };

  let retentionSum = 0;
  let retentionCount = 0;

  for (const s of stories) {
    agg.views += s.views ?? 0;
    agg.reach += s.reach ?? 0;
    agg.total_interactions += s.total_interactions ?? 0;
    agg.replies += s.replies ?? 0;
    agg.shares += s.shares ?? 0;
    agg.taps_forward += s.taps_forward ?? 0;
    agg.taps_back += s.taps_back ?? 0;
    agg.exits += s.exits ?? 0;
    agg.navigation += s.navigation ?? 0;
    agg.profile_activity += s.profile_activity ?? 0;

    // Retenção (fórmula Reportei): (reach - exits - swipe_forward) / reach
    if (s.reach && s.reach > 0) {
      const lost = (s.exits ?? 0) + (s.swipe_forward ?? 0);
      retentionSum += Math.max(0, (s.reach - lost) / s.reach);
      retentionCount += 1;
    }
  }

  agg.retention_avg = retentionCount > 0 ? retentionSum / retentionCount : null;
  return agg;
}
