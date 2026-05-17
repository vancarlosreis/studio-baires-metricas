/**
 * Helpers da Instagram Graph API (leitura de dados de contas Business).
 * Usado pelos sync jobs pra popular account_snapshots e media.
 */

const GRAPH_API_BASE = "https://graph.instagram.com/v23.0";

export type AccountProfileResponse = {
  user_id: string;
  username: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
  media_count?: number;
  followers_count?: number;
  follows_count?: number;
};

/**
 * Busca perfil + contadores agregados (followers, follows, media_count).
 * Combina /me?fields=... numa única chamada.
 */
export async function getAccountProfile(
  accessToken: string,
): Promise<AccountProfileResponse> {
  const fields = [
    "user_id",
    "username",
    "name",
    "account_type",
    "profile_picture_url",
    "media_count",
    "followers_count",
    "follows_count",
  ].join(",");

  const params = new URLSearchParams({
    fields,
    access_token: accessToken,
  });

  const res = await fetch(`${GRAPH_API_BASE}/me?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getAccountProfile ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return {
    user_id: String(json.user_id ?? json.id),
    username: json.username,
    name: json.name,
    account_type: json.account_type,
    profile_picture_url: json.profile_picture_url,
    media_count: json.media_count,
    followers_count: json.followers_count,
    follows_count: json.follows_count,
  };
}

export type InsightsMetric =
  | "reach"
  | "impressions"
  | "profile_views"
  | "website_clicks"
  | "accounts_engaged"
  | "total_interactions";

export type InsightDataPoint = {
  end_time: string;
  value: number;
};

export type InsightResult = {
  name: InsightsMetric;
  period: string;
  values: InsightDataPoint[];
};

/**
 * Busca métricas agregadas via /me/insights.
 * Requer scope `instagram_business_manage_insights`.
 *
 * @param accessToken - Long-lived token
 * @param metrics - Lista de métricas a buscar
 * @param since - Unix timestamp (segundos) — opcional
 * @param until - Unix timestamp (segundos) — opcional
 */
export async function getAccountInsights(
  accessToken: string,
  metrics: InsightsMetric[],
  options: { since?: number; until?: number } = {},
): Promise<InsightResult[]> {
  const params = new URLSearchParams({
    metric: metrics.join(","),
    period: "day",
    metric_type: "total_value",
    access_token: accessToken,
  });
  if (options.since) params.set("since", String(options.since));
  if (options.until) params.set("until", String(options.until));

  const res = await fetch(`${GRAPH_API_BASE}/me/insights?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getAccountInsights ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return (json.data ?? []) as InsightResult[];
}

/**
 * Agrega valores de um InsightResult em um único número (total do período).
 */
export function sumInsight(insight: InsightResult | undefined): number | null {
  if (!insight) return null;
  // Pra metric_type=total_value, vem como total_value: { value: N }
  // Pra time_series, vem como values: [{ end_time, value }]
  const anyInsight = insight as unknown as {
    total_value?: { value: number };
    values?: InsightDataPoint[];
  };
  if (anyInsight.total_value && typeof anyInsight.total_value.value === "number") {
    return anyInsight.total_value.value;
  }
  if (Array.isArray(anyInsight.values) && anyInsight.values.length > 0) {
    return anyInsight.values.reduce((sum, p) => sum + (p.value ?? 0), 0);
  }
  return null;
}
