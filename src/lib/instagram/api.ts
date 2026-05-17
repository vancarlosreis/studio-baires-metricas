/**
 * Helpers da Instagram Graph API (Business Login).
 * Suporta contas BUSINESS e MEDIA_CREATOR — cada uma tem conjunto diferente
 * de métricas disponíveis.
 */

const GRAPH_API_BASE = "https://graph.instagram.com/v23.0";

export type AccountType = "BUSINESS" | "MEDIA_CREATOR" | "PERSONAL" | string;

export type AccountProfileResponse = {
  user_id: string;
  username: string;
  name?: string;
  account_type?: AccountType;
  profile_picture_url?: string;
  media_count?: number;
  followers_count?: number;
  follows_count?: number;
};

/**
 * Busca perfil + contadores agregados em uma única chamada.
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

  const params = new URLSearchParams({ fields, access_token: accessToken });
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

// ============================================================================
// Métricas — conjuntos por tipo de conta
// ============================================================================

export type InsightsMetric =
  | "reach"
  | "accounts_engaged"
  | "total_interactions"
  | "likes"
  | "comments"
  | "shares"
  | "saves"
  | "replies"
  | "profile_views" // só BUSINESS
  | "website_clicks"; // só BUSINESS

/** Métricas disponíveis pra qualquer conta (BUSINESS + CREATOR). */
export const UNIVERSAL_METRICS: InsightsMetric[] = [
  "reach",
  "accounts_engaged",
  "total_interactions",
  "likes",
  "comments",
  "shares",
  "saves",
];

/** Métricas adicionais disponíveis só pra contas BUSINESS. */
export const BUSINESS_ONLY_METRICS: InsightsMetric[] = [
  "profile_views",
  "website_clicks",
];

/**
 * Decide quais métricas pedir baseado no account_type.
 * CREATOR/MEDIA_CREATOR: só universais. BUSINESS: universais + business-only.
 */
export function getMetricsForAccountType(
  accountType: AccountType | undefined,
): InsightsMetric[] {
  if (accountType === "BUSINESS") {
    return [...UNIVERSAL_METRICS, ...BUSINESS_ONLY_METRICS];
  }
  return UNIVERSAL_METRICS;
}

export type InsightResult = {
  name: InsightsMetric;
  period: string;
  total_value?: { value: number };
  values?: { end_time: string; value: number }[];
};

/**
 * Busca métricas agregadas via /me/insights.
 * Requer scope `instagram_business_manage_insights`.
 *
 * Usa metric_type=total_value pra obter o total agregado no período
 * (since → until). Sem range, retorna apenas o dia atual.
 */
export async function getAccountInsights(
  accessToken: string,
  metrics: InsightsMetric[],
  options: { since?: number; until?: number } = {},
): Promise<InsightResult[]> {
  if (metrics.length === 0) return [];

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
 * Versão tolerante: chama getAccountInsights por subset (universais primeiro,
 * depois business-only se aplicável). Se um subset falhar, retorna o que conseguiu.
 */
export async function getAccountInsightsResilient(
  accessToken: string,
  accountType: AccountType | undefined,
  options: { since?: number; until?: number } = {},
): Promise<{ insights: InsightResult[]; errors: string[] }> {
  const errors: string[] = [];
  const insights: InsightResult[] = [];

  // 1. Métricas universais
  try {
    const universal = await getAccountInsights(
      accessToken,
      UNIVERSAL_METRICS,
      options,
    );
    insights.push(...universal);
  } catch (err) {
    errors.push(
      `universal: ${err instanceof Error ? err.message : "erro desconhecido"}`,
    );
  }

  // 2. Métricas business-only (se aplicável)
  if (accountType === "BUSINESS") {
    try {
      const businessOnly = await getAccountInsights(
        accessToken,
        BUSINESS_ONLY_METRICS,
        options,
      );
      insights.push(...businessOnly);
    } catch (err) {
      errors.push(
        `business-only: ${err instanceof Error ? err.message : "erro desconhecido"}`,
      );
    }
  }

  return { insights, errors };
}

/**
 * Extrai o valor numérico de um InsightResult.
 * Lida com total_value.value (preferido) ou soma values[].
 */
export function readInsightValue(
  insight: InsightResult | undefined,
): number | null {
  if (!insight) return null;
  if (insight.total_value && typeof insight.total_value.value === "number") {
    return insight.total_value.value;
  }
  if (Array.isArray(insight.values) && insight.values.length > 0) {
    return insight.values.reduce((sum, p) => sum + (p.value ?? 0), 0);
  }
  return null;
}

/**
 * Encontra uma métrica específica num array de resultados.
 */
export function findMetric(
  insights: InsightResult[],
  name: InsightsMetric,
): number | null {
  return readInsightValue(insights.find((i) => i.name === name));
}
