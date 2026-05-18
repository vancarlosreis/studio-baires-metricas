/**
 * Helpers da Meta Marketing API pra puxar dados de tráfego pago.
 *
 * Objetivo: pra cada mídia IG, somar quanto de reach/impressions/clicks/spend
 * veio de ads (vs orgânico). A Meta removeu o breakdown organic/paid das
 * métricas de mídia em out/2024, então o único jeito hoje é cruzar via
 * Marketing API.
 *
 * Como cada ad referencia uma mídia IG:
 * - Boosted post: `ad.creative.object_story_id` = "{page_id}_{post_id}" e
 *   `ad.creative.effective_object_story_id` aponta pro post original
 * - Dark post / ad criado no Gerenciador: `ad.creative.instagram_actor_id` +
 *   `ad.creative.instagram_permalink_url`
 *
 * Estratégia: extraímos o ig_media_id de `creative.object_story_id` (split
 * no `_`) ou do final do `instagram_permalink_url` quando disponível.
 *
 * Requer escopo `ads_read` no token. Funciona com mesmo token User do Facebook
 * usado no Meta Switch — só basta re-conectar pra adicionar o escopo novo.
 */

const GRAPH_VERSION = "v23.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// ----------------------------------------------------------------------------
// 1. Lista de ad accounts do usuário
// ----------------------------------------------------------------------------

export type FbAdAccount = {
  id: string; // "act_XXXXXXXXXX"
  name?: string;
  currency?: string;
  timezone_name?: string;
  account_status?: number;
};

async function fetchPaginated<T>(initialUrl: string): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = initialUrl;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`fetch ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      data: T[];
      paging?: { next?: string };
    };
    out.push(...(json.data ?? []));
    url = json.paging?.next ?? null;
  }
  return out;
}

/**
 * Resultado detalhado pra debug: quais ad accounts vieram de onde.
 */
export type AdAccountDiscovery = {
  accounts: FbAdAccount[];
  source_counts: {
    direct: number; // /me/adaccounts
    assigned: number; // /me/assigned_ad_accounts
    business_owned: number; // /{biz}/owned_ad_accounts somados
    business_client: number; // /{biz}/client_ad_accounts somados
    businesses_seen: number;
  };
  errors: string[];
};

/**
 * Lista TODAS as ad accounts acessíveis ao usuário, incluindo:
 * - Ad accounts que o user é dono direto (`/me/adaccounts`)
 * - Ad accounts atribuídas ao user via Business Manager (`/me/assigned_ad_accounts`)
 * - Ad accounts de Business Managers que o user gerencia
 *   - Owned (do próprio business): `/{biz_id}/owned_ad_accounts`
 *   - Client (clientes do business, ex: agência atendendo cliente):
 *     `/{biz_id}/client_ad_accounts`
 *
 * Dedupe por id. Cobre cenários: contas pessoais, BM próprio,
 * BM de cliente (agência), atribuição direta via System User/BM.
 */
export async function discoverAdAccounts(
  accessToken: string,
): Promise<AdAccountDiscovery> {
  const fields = "id,name,currency,timezone_name,account_status";
  const out = new Map<string, FbAdAccount>();
  const errors: string[] = [];
  const counts = {
    direct: 0,
    assigned: 0,
    business_owned: 0,
    business_client: 0,
    businesses_seen: 0,
  };

  function fetchInto(
    initialUrl: string,
    bucket: keyof typeof counts,
    label: string,
  ): Promise<void> {
    return fetchPaginated<FbAdAccount>(initialUrl)
      .then((arr) => {
        for (const ad of arr) {
          if (!out.has(ad.id)) {
            out.set(ad.id, ad);
          }
        }
        counts[bucket] += arr.length;
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${label}: ${msg.slice(0, 150)}`);
      });
  }

  // 1. /me/adaccounts (próprias diretas)
  await fetchInto(
    `${GRAPH_BASE}/me/adaccounts?${new URLSearchParams({
      fields,
      limit: "100",
      access_token: accessToken,
    }).toString()}`,
    "direct",
    "/me/adaccounts",
  );

  // 2. /me/assigned_ad_accounts (atribuídas via BM)
  await fetchInto(
    `${GRAPH_BASE}/me/assigned_ad_accounts?${new URLSearchParams({
      fields,
      limit: "100",
      access_token: accessToken,
    }).toString()}`,
    "assigned",
    "/me/assigned_ad_accounts",
  );

  // 3. /me/businesses → owned + client
  let businesses: Array<{ id: string; name?: string }> = [];
  try {
    businesses = await fetchPaginated<{ id: string; name?: string }>(
      `${GRAPH_BASE}/me/businesses?${new URLSearchParams({
        fields: "id,name",
        limit: "100",
        access_token: accessToken,
      }).toString()}`,
    );
    counts.businesses_seen = businesses.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`/me/businesses: ${msg.slice(0, 150)}`);
  }

  for (const biz of businesses) {
    await fetchInto(
      `${GRAPH_BASE}/${biz.id}/owned_ad_accounts?${new URLSearchParams({
        fields,
        limit: "100",
        access_token: accessToken,
      }).toString()}`,
      "business_owned",
      `/${biz.id}/owned_ad_accounts`,
    );
    await fetchInto(
      `${GRAPH_BASE}/${biz.id}/client_ad_accounts?${new URLSearchParams({
        fields,
        limit: "100",
        access_token: accessToken,
      }).toString()}`,
      "business_client",
      `/${biz.id}/client_ad_accounts`,
    );
  }

  return {
    accounts: Array.from(out.values()),
    source_counts: counts,
    errors,
  };
}

/** Versão simplificada — retorna só a lista de accounts (compat com código existente). */
export async function listAdAccounts(
  accessToken: string,
): Promise<FbAdAccount[]> {
  const { accounts } = await discoverAdAccounts(accessToken);
  return accounts;
}

// ----------------------------------------------------------------------------
// 2. Lista de ads de uma ad account com insights agregados
// ----------------------------------------------------------------------------

export type AdWithInsights = {
  ad_id: string;
  ad_name?: string;
  status?: string;
  /** ID da mídia IG promovida (extraído de object_story_id ou permalink). null se não conseguimos identificar. */
  ig_media_id: string | null;
  /** Shortcode do IG (ex: "DYX5UlomlS7") extraído de instagram_permalink_url quando disponível. Usado pra fallback de matching via permalink na nossa tabela media. */
  ig_shortcode: string | null;
  paid_reach: number;
  paid_impressions: number;
  paid_clicks: number;
  paid_spend: number;
  paid_video_views: number;
  paid_engagement: number; // post_engagement de actions
};

type RawAd = {
  id: string;
  name?: string;
  effective_status?: string;
  creative?: {
    object_story_id?: string;
    instagram_permalink_url?: string;
    effective_object_story_id?: string;
  };
  insights?: {
    data: Array<{
      reach?: string;
      impressions?: string;
      clicks?: string;
      spend?: string;
      // video_views foi deprecado — extraímos video views via actions[].video_view agora
      actions?: Array<{ action_type: string; value: string }>;
      video_play_actions?: Array<{ action_type: string; value: string }>;
    }>;
  };
};

/**
 * Tenta extrair o ig_media_id NUMÉRICO direto do creative do ad.
 * Funciona pra boosted posts onde object_story_id já é o ig_media_id.
 *
 * Estratégia: object_story_id formato "{page_id}_{post_id}" — o post_id
 * pra ads de boosted post IG geralmente É o ig_media_id (17 dígitos).
 */
function extractIgMediaIdDirect(ad: RawAd): string | null {
  const c = ad.creative;
  if (!c) return null;

  const osid = c.effective_object_story_id ?? c.object_story_id;
  if (osid && osid.includes("_")) {
    const parts = osid.split("_");
    const last = parts[parts.length - 1];
    if (/^\d{15,20}$/.test(last)) return last;
  }
  return null;
}

/**
 * Extrai shortcode de instagram_permalink_url.
 * Aceita URLs tipo:
 *   - https://www.instagram.com/p/DYX5UlomlS7/
 *   - https://www.instagram.com/reel/DYX5UlomlS7/
 *   - https://www.instagram.com/tv/DYX5UlomlS7/
 */
function extractIgShortcode(ad: RawAd): string | null {
  const url = ad.creative?.instagram_permalink_url;
  if (!url) return null;
  const match = url.match(/\/(?:p|reel|tv|reels)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

/** Versão exportada do helper de shortcode pra reuso em outros lugares. */
export function shortcodeFromPermalink(permalink: string | null | undefined): string | null {
  if (!permalink) return null;
  const match = permalink.match(/\/(?:p|reel|tv|reels)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

function sumAction(
  actions: Array<{ action_type: string; value: string }> | undefined,
  types: string[],
): number {
  if (!actions) return 0;
  let total = 0;
  for (const a of actions) {
    if (types.includes(a.action_type)) {
      const v = parseFloat(a.value);
      if (!isNaN(v)) total += v;
    }
  }
  return total;
}

/**
 * Lista todos os ads de uma ad account com insights agregados no período.
 * `since`/`until` em formato YYYY-MM-DD.
 */
export async function listAdsWithInsights(
  accessToken: string,
  adAccountId: string, // "act_XXXX"
  since: string,
  until: string,
): Promise<AdWithInsights[]> {
  // Pedimos creative + insights na mesma chamada (Graph API resolve subfields)
  // NOTA: `video_views` foi REMOVIDO da Marketing API. Pra video views agora
  // usamos `video_play_actions` (lista com action_type) OU extraímos do
  // `actions` campo unificado quando tiver action_type=video_view.
  const fields = [
    "id",
    "name",
    "effective_status",
    "creative{object_story_id,effective_object_story_id,instagram_permalink_url}",
    `insights.time_range({"since":"${since}","until":"${until}"}){reach,impressions,clicks,spend,actions,video_play_actions}`,
  ].join(",");

  const params = new URLSearchParams({
    fields,
    limit: "100",
    access_token: accessToken,
  });

  const out: AdWithInsights[] = [];
  let url: string | null = `${GRAPH_BASE}/${adAccountId}/ads?${params.toString()}`;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `listAdsWithInsights ${res.status}: ${text.slice(0, 200)}`,
      );
    }
    const json = (await res.json()) as {
      data: RawAd[];
      paging?: { next?: string };
    };
    for (const ad of json.data ?? []) {
      const ins = ad.insights?.data?.[0];
      // Video views agora vem de video_play_actions[].value (com action_type
      // genérico tipo "video_view") OU de actions[].video_view.
      const videoViews =
        sumAction(ins?.video_play_actions, ["video_view"]) ||
        sumAction(ins?.actions, ["video_view"]);
      out.push({
        ad_id: ad.id,
        ad_name: ad.name,
        status: ad.effective_status,
        ig_media_id: extractIgMediaIdDirect(ad),
        ig_shortcode: extractIgShortcode(ad),
        paid_reach: ins?.reach ? parseInt(ins.reach, 10) : 0,
        paid_impressions: ins?.impressions ? parseInt(ins.impressions, 10) : 0,
        paid_clicks: ins?.clicks ? parseInt(ins.clicks, 10) : 0,
        paid_spend: ins?.spend ? parseFloat(ins.spend) : 0,
        paid_video_views: videoViews,
        paid_engagement: sumAction(ins?.actions, [
          "post_engagement",
          "post_reaction",
          "comment",
          "post_save",
          "post",
        ]),
      });
    }
    url = json.paging?.next ?? null;
  }

  return out;
}

// ----------------------------------------------------------------------------
// 3. Agregação por ig_media_id
// ----------------------------------------------------------------------------

export type PaidAggregateByMedia = {
  ig_media_id: string;
  paid_reach: number;
  paid_impressions: number;
  paid_clicks: number;
  paid_spend: number;
  paid_video_views: number;
  paid_engagement: number;
  ad_count: number;
};

/**
 * Agrega ads (vários ads podem promover a mesma mídia) por ig_media_id.
 *
 * Estratégia (em ordem de preferência):
 * 1. **Shortcode via permalink** (mais confiável) — extrai shortcode do
 *    `instagram_permalink_url` do ad e cruza com `media.permalink` no banco.
 * 2. **ig_media_id direto** (fallback) — só pra casos raros sem permalink.
 *    Pra ads de IG, o `object_story_id.last_part` é o post_id do FB shadow,
 *    NÃO o ig_media_id real — então essa estratégia falha pra maioria.
 *
 * Ads sem nenhuma dessas informações são ignorados.
 */
export function aggregateAdsByMedia(
  ads: AdWithInsights[],
  shortcodeToMediaId?: Map<string, string>,
): PaidAggregateByMedia[] {
  const map = new Map<string, PaidAggregateByMedia>();
  for (const ad of ads) {
    let mediaId: string | null = null;

    // 1. Shortcode primeiro (mais confiável)
    if (ad.ig_shortcode && shortcodeToMediaId) {
      mediaId = shortcodeToMediaId.get(ad.ig_shortcode) ?? null;
    }

    // 2. Fallback: ig_media_id direto (raramente bate pra ads de IG mas
    //    pode bater pra ads onde object_story_id é o próprio ig_media_id)
    if (!mediaId && ad.ig_media_id) {
      mediaId = ad.ig_media_id;
    }

    if (!mediaId) continue;
    const cur = map.get(mediaId) ?? {
      ig_media_id: mediaId,
      paid_reach: 0,
      paid_impressions: 0,
      paid_clicks: 0,
      paid_spend: 0,
      paid_video_views: 0,
      paid_engagement: 0,
      ad_count: 0,
    };
    cur.paid_reach += ad.paid_reach;
    cur.paid_impressions += ad.paid_impressions;
    cur.paid_clicks += ad.paid_clicks;
    cur.paid_spend += ad.paid_spend;
    cur.paid_video_views += ad.paid_video_views;
    cur.paid_engagement += ad.paid_engagement;
    cur.ad_count += 1;
    map.set(mediaId, cur);
  }
  return Array.from(map.values());
}
