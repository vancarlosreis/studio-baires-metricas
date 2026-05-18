/**
 * Helpers da Instagram Graph API (Business Login).
 * Suporta contas BUSINESS e MEDIA_CREATOR — cada uma tem conjunto diferente
 * de métricas disponíveis.
 */

const GRAPH_API_BASE = "https://graph.instagram.com/v23.0";

/**
 * Contexto que define qual base + path usar pra cada conta.
 *
 * - Business Login (token direto IG) → `graph.instagram.com/v23.0` + `me`
 * - Facebook Login / Meta Switch (token User do FB) → `graph.facebook.com/v23.0` + `{ig_user_id}`
 *
 * Quando `undefined`, assume Business Login (compat com chamadas existentes).
 */
export type GraphContext = {
  /** Ex: `https://graph.facebook.com/v23.0`. Default: graph.instagram.com */
  apiBase?: string;
  /** Ex: o numérico `17841...`. Default: `me` */
  accountPath?: string;
};

function resolveCtx(ctx?: GraphContext): {
  apiBase: string;
  accountPath: string;
} {
  return {
    apiBase: ctx?.apiBase ?? GRAPH_API_BASE,
    accountPath: ctx?.accountPath ?? "me",
  };
}

/**
 * Helper: monta um GraphContext a partir de uma ig_account row.
 * Usa o `auth_method` pra decidir qual API base + path usar.
 */
export function contextForAccount(account: {
  auth_method: "business_login" | "facebook_login";
  ig_user_id: string;
}): GraphContext {
  if (account.auth_method === "facebook_login") {
    return {
      apiBase: "https://graph.facebook.com/v23.0",
      accountPath: account.ig_user_id,
    };
  }
  return {}; // Business Login: defaults
}

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
  ctx?: GraphContext,
): Promise<AccountProfileResponse> {
  const { apiBase, accountPath } = resolveCtx(ctx);
  const isFb = apiBase.includes("graph.facebook.com");

  // Campos diferentes por endpoint:
  // - graph.instagram.com (Business Login): tem `user_id` (alias) e `account_type`
  // - graph.facebook.com (Meta Switch): tem só `id`, sem `account_type`
  //   (contas acessíveis via Graph FB são sempre Business/Creator por definição)
  const fields = [
    isFb ? "id" : "user_id",
    "username",
    "name",
    ...(isFb ? [] : ["account_type"]),
    "profile_picture_url",
    "media_count",
    "followers_count",
    "follows_count",
  ].join(",");

  const params = new URLSearchParams({ fields, access_token: accessToken });
  const res = await fetch(`${apiBase}/${accountPath}?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getAccountProfile ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return {
    user_id: String(json.user_id ?? json.id),
    username: json.username,
    name: json.name,
    // Em graph.facebook.com a conta é sempre Business/Creator pra estar visível
    // (Personal não aparece via Graph). Assumir BUSINESS é seguro pra desbloquear
    // as métricas business-only no resilient.
    account_type: json.account_type ?? (isFb ? "BUSINESS" : undefined),
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
  | "views" // unificada v22+ (substitui impressions/plays)
  | "accounts_engaged"
  | "total_interactions"
  | "likes"
  | "comments"
  | "shares"
  | "saves"
  | "replies"
  | "follower_count"
  | "profile_links_taps" // substitui website_clicks/email_contacts (v22)
  | "profile_views" // depreciada em time series (v21), mas em total_value às vezes funciona
  | "website_clicks"; // depreciada v21

/** Métricas universais (BUSINESS + CREATOR) — total_value no período. */
export const UNIVERSAL_METRICS: InsightsMetric[] = [
  "reach",
  "views", // substitui impressions/plays na v22
  "accounts_engaged",
  "total_interactions",
  "likes",
  "comments",
  "shares",
  "saves",
  "profile_links_taps", // toques no link da bio (substitui website_clicks v22+)
];

/** Métricas que precisam de breakdown follower/non-follower — opcional. */
export const FOLLOWER_BREAKDOWN_METRICS: InsightsMetric[] = ["reach"];

/** Métricas só pra BUSINESS (em time series — limitadas em v21+). */
export const BUSINESS_ONLY_METRICS: InsightsMetric[] = [
  "profile_views",
  "website_clicks",
];

// ============================================================================
// Demografia da audiência (3 tipos × 4 breakdowns)
// Requer 100+ seguidores na conta.
// ============================================================================
export type AudienceType =
  | "engaged_audience_demographics"
  | "reached_audience_demographics"
  | "follower_demographics";

export type DemographicBreakdown = "age" | "gender" | "city" | "country";

export type DemographicResult = {
  breakdown: DemographicBreakdown;
  values: Record<string, number>; // { "18-24": 234, "25-34": 412, ... }
};

/**
 * Busca breakdown demográfico (audience × breakdown × valor).
 * A API retorna `total_value.breakdowns[0].results[]` com pares `dimension_values` + `value`.
 */
export async function getAudienceDemographic(
  accessToken: string,
  metric: AudienceType,
  breakdown: DemographicBreakdown,
  ctx?: GraphContext,
): Promise<DemographicResult | null> {
  const { apiBase, accountPath } = resolveCtx(ctx);
  const params = new URLSearchParams({
    metric,
    period: "lifetime",
    metric_type: "total_value",
    breakdown,
    timeframe: "this_week",
    access_token: accessToken,
  });

  const res = await fetch(`${apiBase}/${accountPath}/insights?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `getAudienceDemographic(${metric}/${breakdown}) ${res.status}: ${text.slice(0, 200)}`,
    );
  }

  const json = await res.json();
  const data = json.data?.[0];
  const breakdownsResult = data?.total_value?.breakdowns?.[0]?.results ?? [];

  const values: Record<string, number> = {};
  for (const row of breakdownsResult) {
    const dimensionValues: string[] = row.dimension_values ?? [];
    const key = dimensionValues.join(", ");
    const value = typeof row.value === "number" ? row.value : 0;
    if (key) values[key] = value;
  }

  return { breakdown, values };
}

/**
 * Busca múltiplos breakdowns em paralelo, tolerante a falhas parciais.
 */
export async function getAudienceDemographicsResilient(
  accessToken: string,
  metric: AudienceType,
  breakdowns: DemographicBreakdown[],
  ctx?: GraphContext,
): Promise<{
  results: DemographicResult[];
  errors: string[];
}> {
  const settled = await Promise.allSettled(
    breakdowns.map((b) => getAudienceDemographic(accessToken, metric, b, ctx)),
  );

  const results: DemographicResult[] = [];
  const errors: string[] = [];

  settled.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      results.push(r.value);
    } else if (r.status === "rejected") {
      errors.push(
        `${metric}/${breakdowns[i]}: ${r.reason instanceof Error ? r.reason.message : "erro"}`,
      );
    }
  });

  return { results, errors };
}

// ============================================================================
// Online followers — heatmap de quando os seguidores estão online
// ============================================================================
export type OnlineFollowers = Record<string, number>; // { "0": 142, "1": 89, ..., "23": 401 }

/**
 * Busca `online_followers` (lifetime). Retorna {hora: count} pra 24h.
 * Útil pra widgets de "melhor horário pra postar".
 */
export async function getOnlineFollowers(
  accessToken: string,
  ctx?: GraphContext,
): Promise<OnlineFollowers | null> {
  const { apiBase, accountPath } = resolveCtx(ctx);
  const params = new URLSearchParams({
    metric: "online_followers",
    period: "lifetime",
    access_token: accessToken,
  });

  const res = await fetch(`${apiBase}/${accountPath}/insights?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getOnlineFollowers ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  // A resposta vem como data[0].values[0].value = { "0": 142, "1": 89, ... }
  const value = json.data?.[0]?.values?.[0]?.value;
  if (!value || typeof value !== "object") return null;

  return value as OnlineFollowers;
}

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
  ctx?: GraphContext,
): Promise<InsightResult[]> {
  if (metrics.length === 0) return [];

  const { apiBase, accountPath } = resolveCtx(ctx);
  const params = new URLSearchParams({
    metric: metrics.join(","),
    period: "day",
    metric_type: "total_value",
    access_token: accessToken,
  });
  if (options.since) params.set("since", String(options.since));
  if (options.until) params.set("until", String(options.until));

  const res = await fetch(`${apiBase}/${accountPath}/insights?${params}`);
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
  ctx?: GraphContext,
): Promise<{ insights: InsightResult[]; errors: string[] }> {
  const errors: string[] = [];
  const insights: InsightResult[] = [];

  // 1. Métricas universais
  try {
    const universal = await getAccountInsights(
      accessToken,
      UNIVERSAL_METRICS,
      options,
      ctx,
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
        ctx,
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
  name: string,
): number | null {
  return readInsightValue(insights.find((i) => i.name === name));
}

// ============================================================================
// Media (posts, reels, stories)
// ============================================================================

export type MediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | string;
export type MediaProductType = "FEED" | "REELS" | "STORY" | "AD" | "IGTV" | string;

export type MediaItem = {
  id: string;
  media_type: MediaType;
  media_product_type?: MediaProductType;
  caption?: string;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string; // ISO 8601
  username?: string;
};

export type MediaListResponse = {
  data: MediaItem[];
  nextCursor: string | null;
};

/**
 * Lista mídias do usuário autenticado, ordenadas por mais recentes.
 * Pagina automaticamente até atingir `maxItems` (padrão 50).
 */
export async function getMediaList(
  accessToken: string,
  options: { maxItems?: number; pageSize?: number } = {},
  ctx?: GraphContext,
): Promise<MediaListResponse> {
  const { apiBase, accountPath } = resolveCtx(ctx);
  const maxItems = options.maxItems ?? 50;
  const pageSize = Math.min(options.pageSize ?? 25, 100);
  const fields = [
    "id",
    "media_type",
    "media_product_type",
    "caption",
    "permalink",
    "media_url",
    "thumbnail_url",
    "timestamp",
    "username",
  ].join(",");

  const collected: MediaItem[] = [];
  let nextUrl: string | null = `${apiBase}/${accountPath}/media?${new URLSearchParams({
    fields,
    limit: String(pageSize),
    access_token: accessToken,
  })}`;

  while (nextUrl && collected.length < maxItems) {
    const res: Response = await fetch(nextUrl);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`getMediaList ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const data: MediaItem[] = (json.data ?? []) as MediaItem[];
    collected.push(...data);
    nextUrl = json.paging?.next ?? null;
  }

  return {
    data: collected.slice(0, maxItems),
    nextCursor: nextUrl,
  };
}

// Métricas testadas pra serem universalmente seguras pra qualquer mídia
// (FEED, CAROUSEL, REELS em contas BUSINESS + CRIADOR). Validadas via tentativa
// e erro contra a API real — a documentação da Meta é otimista demais.
const SAFE_MEDIA_METRICS = [
  "reach",
  "likes",
  "comments",
  "shares",
  "saved", // API quer "saved", banco = "saves"
  "total_interactions",
];

// Stories têm conjunto totalmente diferente (não é tentado pra reels/feed)
const STORY_METRICS = [
  "reach",
  "impressions",
  "taps_forward",
  "taps_back",
  "exits",
  "replies",
  "navigation",
];

// Pra REELS, tentamos métricas extras separadamente — se falhar não bloqueia
// o batch principal. plays geralmente funciona mas depende da idade/tipo do reel.
const REELS_OPTIONAL_METRICS = ["plays"];

// Métricas opcionais pra qualquer mídia (FEED + REELS). Algumas mídias
// antigas ou de certos tipos podem não ter, então vai em batch isolado.
// `views` é o substituto unificado v22+ de impressions/plays.
const MEDIA_OPTIONAL_METRICS = ["views", "profile_visits", "follows"];

async function fetchInsightsBatch(
  accessToken: string,
  mediaId: string,
  metrics: string[],
  ctx?: GraphContext,
): Promise<InsightResult[]> {
  if (metrics.length === 0) return [];
  const { apiBase } = resolveCtx(ctx);
  const params = new URLSearchParams({
    metric: metrics.join(","),
    access_token: accessToken,
  });
  const res = await fetch(`${apiBase}/${mediaId}/insights?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return (json.data ?? []) as InsightResult[];
}

/**
 * Busca insights de uma mídia com fallback inteligente:
 * 1. STORY: tenta o conjunto específico de stories
 * 2. FEED/REELS: tenta o conjunto seguro (sempre funciona)
 * 3. REELS adicional: tenta `plays` em batch separado (não bloqueia)
 *
 * Estratégia evita o problema de batches inteiros sendo rejeitados por
 * uma única métrica inválida.
 */
export async function getMediaInsightsResilient(
  accessToken: string,
  mediaId: string,
  productType: MediaProductType | undefined,
  ctx?: GraphContext,
): Promise<{ insights: InsightResult[]; errors: string[] }> {
  const errors: string[] = [];
  const insights: InsightResult[] = [];

  if (productType === "STORY") {
    try {
      const story = await fetchInsightsBatch(accessToken, mediaId, STORY_METRICS, ctx);
      insights.push(...story);
    } catch (err) {
      errors.push(
        `story: ${err instanceof Error ? err.message : "erro desconhecido"}`,
      );
    }
    return { insights, errors };
  }

  // FEED + REELS: conjunto seguro primeiro
  try {
    const safe = await fetchInsightsBatch(accessToken, mediaId, SAFE_MEDIA_METRICS, ctx);
    insights.push(...safe);
  } catch (err) {
    errors.push(
      `safe: ${err instanceof Error ? err.message : "erro desconhecido"}`,
    );
  }

  // FEED + REELS: tenta métricas opcionais (views, profile_visits, follows)
  // isoladas — não bloqueia o batch principal. Algumas mídias antigas/feed
  // específico podem não ter algumas dessas.
  try {
    const opt = await fetchInsightsBatch(
      accessToken,
      mediaId,
      MEDIA_OPTIONAL_METRICS,
      ctx,
    );
    insights.push(...opt);
  } catch {
    // Tenta uma a uma se o batch falhar (uma métrica ruim quebra o batch inteiro)
    for (const metric of MEDIA_OPTIONAL_METRICS) {
      try {
        const single = await fetchInsightsBatch(accessToken, mediaId, [metric], ctx);
        insights.push(...single);
      } catch {
        // ignora individualmente
      }
    }
  }

  // REELS: tenta plays separado (se falhar, não impacta o resto)
  if (productType === "REELS") {
    try {
      const extra = await fetchInsightsBatch(
        accessToken,
        mediaId,
        REELS_OPTIONAL_METRICS,
        ctx,
      );
      insights.push(...extra);
    } catch {
      // Silencioso — plays é opcional pra reels
    }
  }

  return { insights, errors };
}
