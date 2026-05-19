"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import {
  getAccountProfile,
  getAccountInsightsResilient,
  getAccountMetricWithProductTypeBreakdown,
  getMediaList,
  getMediaInsightsResilient,
  getStoriesList,
  getStoryInsights,
  findMetric,
  getAudienceDemographicsResilient,
  getOnlineFollowers,
  contextForAccount,
  type MediaType,
  type AudienceType,
  type DemographicBreakdown,
} from "@/lib/instagram/api";
import {
  discoverAdAccounts,
  listAdsWithInsights,
  aggregateAdsByMedia,
  shortcodeFromPermalink,
} from "@/lib/instagram/marketing";
import type { Database } from "@/lib/supabase/database.types";

type MediaKind = Database["public"]["Enums"]["media_kind"];

function normalizeMediaKind(
  mediaType: MediaType,
  productType: string | undefined,
): MediaKind {
  if (productType === "REELS") return "REELS";
  if (productType === "STORY") return "STORY";
  if (mediaType === "IMAGE") return "IMAGE";
  if (mediaType === "VIDEO") return "VIDEO";
  if (mediaType === "CAROUSEL_ALBUM") return "CAROUSEL_ALBUM";
  return "IMAGE"; // fallback seguro
}

/** Decripta o access_token_encrypted vindo do banco (bytea). */
function decryptAccountToken(blob: unknown): string {
  let buffer: Buffer;
  if (typeof blob === "string") {
    const hex = blob.startsWith("\\x") ? blob.slice(2) : blob;
    buffer = Buffer.from(hex, "hex");
  } else {
    buffer = Buffer.from(blob as Uint8Array);
  }
  return decryptToken(buffer);
}

// 30 dias = bate com o período default do PeriodSelector. Os KPIs da KPI Row
// (Alcance, Visualizações, Interações, Toques no link) mostram o valor desse
// snapshot. Em algum momento futuro vale fazer query dinâmica baseada no
// período selecionado pelo user, mas por enquanto fixar em 30 cobre 95% do
// uso (default = "Últimos 30 dias").
const INSIGHTS_PERIOD_DAYS = 30;

export type SyncResult =
  | { ok: true; igAccountId: string; snapshot_date: string; warnings: string[] }
  | { ok: false; error: string };

/**
 * Sincroniza uma conta IG: busca perfil + insights (últimos 7 dias) e salva
 * snapshot do dia. Adapta as métricas baseado no account_type (BUSINESS vs CREATOR).
 */
export async function syncAccountProfile(igAccountId: string): Promise<SyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: account, error: fetchErr } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("id", igAccountId)
    .single();

  if (fetchErr || !account) {
    return { ok: false, error: "Conta não encontrada." };
  }

  const { data: job } = await supabase
    .from("sync_jobs")
    .insert({
      user_id: user.id,
      ig_account_id: account.id,
      kind: "account_profile",
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  try {
    const accessToken = decryptAccountToken(account.access_token_encrypted);
    const graphCtx = contextForAccount(account);

    // 1. Perfil
    const profile = await getAccountProfile(accessToken, graphCtx);

    // 2. Insights — adapta por account_type, tolerante a falhas parciais
    const until = Math.floor(Date.now() / 1000);
    const since = until - INSIGHTS_PERIOD_DAYS * 24 * 60 * 60;
    const { insights, errors: insightErrors } = await getAccountInsightsResilient(
      accessToken,
      profile.account_type,
      { since, until },
      graphCtx,
    );

    // 3. Atualiza ig_accounts (metadata + account_type)
    await supabase
      .from("ig_accounts")
      .update({
        ig_account_name: profile.name ?? account.ig_account_name,
        ig_profile_picture_url:
          profile.profile_picture_url ?? account.ig_profile_picture_url,
        account_type: profile.account_type ?? null,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    // 4. Online followers (heatmap de horário — lifetime, não depende do período)
    let onlineFollowers = null;
    try {
      onlineFollowers = await getOnlineFollowers(accessToken, graphCtx);
    } catch (err) {
      console.warn("[syncAccountProfile] online_followers falhou:", err);
    }

    // 4.1. Breakdown de paid (AD) vs orgânico via media_product_type
    //      pra reach, views e total_interactions. Fonte: IG Insights API
    //      breakdown=media_product_type, dimension AD.
    const [reachBreakdown, viewsBreakdown, interactionsBreakdown] =
      await Promise.all([
        getAccountMetricWithProductTypeBreakdown(
          accessToken,
          "reach",
          { since, until },
          graphCtx,
        ),
        getAccountMetricWithProductTypeBreakdown(
          accessToken,
          "views",
          { since, until },
          graphCtx,
        ),
        getAccountMetricWithProductTypeBreakdown(
          accessToken,
          "total_interactions",
          { since, until },
          graphCtx,
        ),
      ]);

    // 5. Salva snapshot do dia
    const today = new Date().toISOString().slice(0, 10);
    const { error: snapErr } = await supabase
      .from("account_snapshots")
      .upsert(
        {
          ig_account_id: account.id,
          snapshot_date: today,
          followers_count: profile.followers_count ?? null,
          follows_count: profile.follows_count ?? null,
          media_count: profile.media_count ?? null,
          // Universais v22 (BUSINESS + CREATOR)
          reach: findMetric(insights, "reach"),
          views: findMetric(insights, "views"),
          accounts_engaged: findMetric(insights, "accounts_engaged"),
          total_interactions: findMetric(insights, "total_interactions"),
          likes: findMetric(insights, "likes"),
          comments: findMetric(insights, "comments"),
          shares: findMetric(insights, "shares"),
          saves: findMetric(insights, "saves"),
          replies: findMetric(insights, "replies"),
          profile_links_taps: findMetric(insights, "profile_links_taps"),
          // Depreciadas (mantidas pra retro-compat se a API ainda devolver)
          profile_views: findMetric(insights, "profile_views"),
          website_clicks: findMetric(insights, "website_clicks"),
          // Heatmap de online_followers
          online_followers: onlineFollowers as unknown as never,
          // Breakdown paid/orgânico via media_product_type
          paid_reach: reachBreakdown?.paid ?? null,
          paid_views: viewsBreakdown?.paid ?? null,
          paid_total_interactions: interactionsBreakdown?.paid ?? null,
          organic_reach: reachBreakdown?.organic ?? null,
          organic_views: viewsBreakdown?.organic ?? null,
          organic_total_interactions: interactionsBreakdown?.organic ?? null,
          raw_payload: {
            profile,
            insights,
            errors: insightErrors,
            period: { since, until, days: INSIGHTS_PERIOD_DAYS },
            online_followers_present: !!onlineFollowers,
            breakdowns: {
              reach: reachBreakdown,
              views: viewsBreakdown,
              total_interactions: interactionsBreakdown,
            },
          } as unknown as never,
        },
        { onConflict: "ig_account_id,snapshot_date" },
      );

    if (snapErr) throw new Error(`Falha ao salvar snapshot: ${snapErr.message}`);

    // 6. Demografia (3 tipos × 4 breakdowns = até 12 calls).
    //    Tolerante a falhas — alguns breakdowns podem falhar se a conta tem <100 seguidores
    //    ou se a Meta limitou alguma combinação.
    const today_date = today;
    const demographicTypes: AudienceType[] = [
      "follower_demographics",
      "reached_audience_demographics",
      "engaged_audience_demographics",
    ];
    const breakdowns: DemographicBreakdown[] = ["age", "gender", "city", "country"];
    const demographicWarnings: string[] = [];

    for (const audienceType of demographicTypes) {
      const { results, errors: demoErrors } =
        await getAudienceDemographicsResilient(
          accessToken,
          audienceType,
          breakdowns,
          graphCtx,
        );
      demographicWarnings.push(...demoErrors);

      // Mapeia o nome do enum no banco: remove sufixo _audience_demographics / _demographics
      const dbAudienceType =
        audienceType === "follower_demographics"
          ? "follower"
          : audienceType === "reached_audience_demographics"
            ? "reached"
            : "engaged";

      for (const result of results) {
        await supabase
          .from("audience_demographics")
          .upsert(
            {
              ig_account_id: account.id,
              snapshot_date: today_date,
              audience_type: dbAudienceType as never,
              breakdown: result.breakdown as never,
              breakdown_values: result.values as unknown as never,
              raw_payload: { results } as unknown as never,
            },
            { onConflict: "ig_account_id,snapshot_date,audience_type,breakdown" },
          );
      }
    }
    if (demographicWarnings.length > 0) {
      console.warn("[syncAccountProfile] demographics warnings:", demographicWarnings);
    }

    const allWarnings = [...insightErrors, ...demographicWarnings];
    if (job) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          metadata: {
            insight_errors: insightErrors,
            demographic_warnings: demographicWarnings,
            online_followers: !!onlineFollowers,
          } as unknown as never,
        })
        .eq("id", job.id);
    }

    revalidatePath("/dashboard", "layout");
    return {
      ok: true,
      igAccountId: account.id,
      snapshot_date: today,
      warnings: allWarnings,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[syncAccountProfile] erro:", message);

    if (job) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: message.slice(0, 500),
        })
        .eq("id", job.id);
    }

    return { ok: false, error: message };
  }
}

// ============================================================================
// Sync de mídia (posts/reels/stories)
// ============================================================================

const DEFAULT_MEDIA_LIMIT = 50;

export type MediaSyncResult =
  | { ok: true; igAccountId: string; mediaCount: number; warnings: string[] }
  | { ok: false; error: string };

/**
 * Sincroniza as últimas N mídias da conta + insights por mídia.
 * Upsert em media (por ig_account_id + ig_media_id) + insert em media_insights
 * (snapshot atual).
 */
export async function syncAccountMedia(
  igAccountId: string,
  maxItems = DEFAULT_MEDIA_LIMIT,
): Promise<MediaSyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: account, error: fetchErr } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("id", igAccountId)
    .single();

  if (fetchErr || !account) return { ok: false, error: "Conta não encontrada." };

  const { data: job } = await supabase
    .from("sync_jobs")
    .insert({
      user_id: user.id,
      ig_account_id: account.id,
      kind: "media_list",
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  const warnings: string[] = [];

  try {
    const accessToken = decryptAccountToken(account.access_token_encrypted);
    const graphCtx = contextForAccount(account);

    // 1. Lista mídias
    const { data: mediaItems } = await getMediaList(accessToken, { maxItems }, graphCtx);

    if (mediaItems.length === 0) {
      if (job) {
        await supabase
          .from("sync_jobs")
          .update({
            status: "success",
            finished_at: new Date().toISOString(),
            metadata: { media_count: 0 } as unknown as never,
          })
          .eq("id", job.id);
      }
      return { ok: true, igAccountId: account.id, mediaCount: 0, warnings };
    }

    // 2. Upsert media + buscar insights pra cada uma
    for (const item of mediaItems) {
      const kind = normalizeMediaKind(item.media_type, item.media_product_type);
      const postedAt = item.timestamp;
      const expiresAt =
        kind === "STORY"
          ? new Date(new Date(item.timestamp).getTime() + 24 * 60 * 60 * 1000).toISOString()
          : null;

      // Upsert a media
      const { data: mediaRow, error: mediaErr } = await supabase
        .from("media")
        .upsert(
          {
            ig_account_id: account.id,
            ig_media_id: item.id,
            kind,
            media_product_type: item.media_product_type ?? null,
            caption: item.caption ?? null,
            permalink: item.permalink ?? null,
            media_url: item.media_url ?? null,
            thumbnail_url: item.thumbnail_url ?? null,
            posted_at: postedAt,
            expires_at: expiresAt,
            raw_payload: item as unknown as never,
          },
          { onConflict: "ig_account_id,ig_media_id" },
        )
        .select()
        .single();

      if (mediaErr || !mediaRow) {
        warnings.push(`media ${item.id}: ${mediaErr?.message ?? "upsert falhou"}`);
        continue;
      }

      // Busca insights da mídia (com tolerância)
      const { insights, errors: insightErrors } = await getMediaInsightsResilient(
        accessToken,
        item.id,
        item.media_product_type,
        graphCtx,
      );

      if (insightErrors.length > 0) {
        warnings.push(`media ${item.id} insights: ${insightErrors[0]}`);
      }

      // Insere snapshot de insights (não upsert — guardamos histórico)
      // IMPORTANTE: a API retorna "saved", mapeamos pra coluna "saves".
      await supabase.from("media_insights").insert({
        media_id: mediaRow.id,
        likes: findMetric(insights, "likes"),
        comments: findMetric(insights, "comments"),
        saves: findMetric(insights, "saved"), // API name = "saved"
        shares: findMetric(insights, "shares"),
        reach: findMetric(insights, "reach"),
        impressions: findMetric(insights, "impressions"),
        plays: findMetric(insights, "plays"),
        views: findMetric(insights, "views"),
        total_interactions: findMetric(insights, "total_interactions"),
        follows: findMetric(insights, "follows"),
        profile_visits: findMetric(insights, "profile_visits"),
        profile_activity: findMetric(insights, "profile_activity"),
        navigation: findMetric(insights, "navigation"),
        exits: findMetric(insights, "exits"),
        taps_forward: findMetric(insights, "taps_forward"),
        taps_back: findMetric(insights, "taps_back"),
        replies: findMetric(insights, "replies"),
        raw_payload: { insights, errors: insightErrors } as unknown as never,
      });
    }

    if (job) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          metadata: {
            media_count: mediaItems.length,
            warnings: warnings.slice(0, 10),
          } as unknown as never,
        })
        .eq("id", job.id);
    }

    revalidatePath("/dashboard", "layout");
    return {
      ok: true,
      igAccountId: account.id,
      mediaCount: mediaItems.length,
      warnings,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[syncAccountMedia] erro:", message);

    if (job) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: message.slice(0, 500),
        })
        .eq("id", job.id);
    }

    return { ok: false, error: message };
  }
}

// ============================================================================
// Sync de tráfego pago (Marketing API)
// ============================================================================

const PAID_LOOKBACK_DAYS = 90;

export type PaidSyncResult =
  | { ok: true; igAccountId: string; mediaCount: number; warnings: string[] }
  | { ok: false; error: string };

/**
 * Sync tráfego pago de uma conta IG.
 *
 * 1. Descobre ad_accounts vinculadas ao user via /me/adaccounts
 * 2. Pra cada ad account: lista ads ativos/passados dos últimos N dias
 *    com insights agregados
 * 3. Agrega por ig_media_id (vários ads podem promover a mesma mídia)
 * 4. Pra cada mídia já sincronizada no banco, insere snapshot em
 *    media_paid_insights
 *
 * Requer escopo ads_read no token. Conta IG conectada antes desse escopo
 * existir precisa re-conectar via Facebook.
 */
export async function syncPaidInsights(
  igAccountId: string,
): Promise<PaidSyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: account, error: fetchErr } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("id", igAccountId)
    .single();

  if (fetchErr || !account) return { ok: false, error: "Conta não encontrada." };

  const warnings: string[] = [];

  try {
    const accessToken = decryptAccountToken(account.access_token_encrypted);

    // 1. Lista ad accounts (varre /me/adaccounts, /me/assigned_ad_accounts e
    //    todos os businesses do user via /me/businesses)
    const discovery = await discoverAdAccounts(accessToken);
    const adAccounts = discovery.accounts;

    // Sempre adiciona o diagnóstico de descoberta pros warnings (útil pra debug)
    warnings.push(
      `Ad accounts: ${adAccounts.length} encontradas ` +
        `(direct=${discovery.source_counts.direct}, ` +
        `assigned=${discovery.source_counts.assigned}, ` +
        `business_owned=${discovery.source_counts.business_owned}, ` +
        `business_client=${discovery.source_counts.business_client}, ` +
        `businesses_seen=${discovery.source_counts.businesses_seen})`,
    );
    for (const err of discovery.errors) {
      warnings.push(`discovery: ${err}`);
    }

    if (adAccounts.length === 0) {
      warnings.push(
        "Nenhuma ad account encontrada — verificar se o user é membro de algum Business Manager + tem permissão de leitura nas ad accounts.",
      );
      return { ok: true, igAccountId, mediaCount: 0, warnings };
    }

    // Upsert ad_accounts no banco
    for (const ad of adAccounts) {
      await supabase.from("fb_ad_accounts").upsert(
        {
          user_id: user.id,
          ig_account_id: account.id,
          fb_ad_account_id: ad.id,
          name: ad.name ?? null,
          currency: ad.currency ?? null,
          timezone_name: ad.timezone_name ?? null,
          account_status: ad.account_status ?? null,
          is_active: ad.account_status === 1,
          last_synced_at: new Date().toISOString(),
          raw_payload: ad as unknown as never,
        },
        { onConflict: "ig_account_id,fb_ad_account_id" },
      );
    }

    // 2. Pra cada ad account, lista ads do período
    const until = new Date();
    const since = new Date(until.getTime() - PAID_LOOKBACK_DAYS * 86400_000);
    const sinceStr = since.toISOString().slice(0, 10);
    const untilStr = until.toISOString().slice(0, 10);

    const allAds = [] as Awaited<ReturnType<typeof listAdsWithInsights>>;
    for (const adAccount of adAccounts) {
      try {
        const ads = await listAdsWithInsights(
          accessToken,
          adAccount.id,
          sinceStr,
          untilStr,
        );
        allAds.push(...ads);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "erro desconhecido";
        warnings.push(`ad account ${adAccount.id}: ${msg}`);
      }
    }

    if (allAds.length === 0) {
      warnings.push("Nenhum ad encontrado nos últimos 90 dias.");
      return { ok: true, igAccountId, mediaCount: 0, warnings };
    }

    // 3. Constrói lookup shortcode → ig_media_id (usando media.permalink já no banco)
    //    pra resolver ads que não trazem ig_media_id direto mas trazem permalink IG.
    const { data: existingMedia } = await supabase
      .from("media")
      .select("ig_media_id, permalink")
      .eq("ig_account_id", account.id);

    const shortcodeMap = new Map<string, string>();
    for (const m of existingMedia ?? []) {
      const sc = shortcodeFromPermalink(m.permalink);
      if (sc) shortcodeMap.set(sc, m.ig_media_id);
    }

    // 4. Agrega por ig_media_id (com fallback de shortcode)
    const aggregates = aggregateAdsByMedia(allAds, shortcodeMap);
    const adsWithoutMatch = allAds.filter(
      (a) => !a.ig_media_id && (!a.ig_shortcode || !shortcodeMap.has(a.ig_shortcode)),
    ).length;
    const adsMatchedByShortcode = allAds.filter(
      (a) => !a.ig_media_id && a.ig_shortcode && shortcodeMap.has(a.ig_shortcode),
    ).length;

    warnings.push(
      `${allAds.length} ads encontrados · ${aggregates.length} mídias com boost detectadas` +
        (adsMatchedByShortcode > 0
          ? ` (${adsMatchedByShortcode} via permalink)`
          : ""),
    );
    if (adsWithoutMatch > 0) {
      warnings.push(
        `${adsWithoutMatch} ads sem mídia IG identificável (dark posts ou criativos novos não vinculados a nenhum post).`,
      );
    }

    // 5. Pra cada agregado: encontrar media UUID interno via ig_media_id
    //    e inserir snapshot
    let saved = 0;
    for (const agg of aggregates) {
      const { data: mediaRow } = await supabase
        .from("media")
        .select("id")
        .eq("ig_account_id", account.id)
        .eq("ig_media_id", agg.ig_media_id)
        .maybeSingle();

      if (!mediaRow) continue; // mídia ainda não sincronizada via syncAccountMedia

      const { error: insertErr } = await supabase
        .from("media_paid_insights")
        .insert({
          media_id: mediaRow.id,
          paid_reach: agg.paid_reach,
          paid_impressions: agg.paid_impressions,
          paid_clicks: agg.paid_clicks,
          paid_spend: agg.paid_spend,
          paid_video_views: agg.paid_video_views,
          paid_engagement: agg.paid_engagement,
          ad_count: agg.ad_count,
          raw_payload: { aggregate: agg } as unknown as never,
        });

      if (insertErr) {
        warnings.push(`media ${agg.ig_media_id}: ${insertErr.message}`);
      } else {
        saved += 1;
      }
    }

    return { ok: true, igAccountId, mediaCount: saved, warnings };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[syncPaidInsights] erro:", message);
    return { ok: false, error: message };
  }
}

// ============================================================================
// Sync de stories (endpoint /stories — só retorna ativos <24h)
// ============================================================================

export type StoriesSyncResult =
  | { ok: true; igAccountId: string; storyCount: number; warnings: string[] }
  | { ok: false; error: string };

/**
 * Sincroniza stories ATIVOS da conta. A IG API só expõe stories <24h,
 * então pra ter histórico precisa rodar isso de forma recorrente (cron).
 * Aqui só upsert + insights — o cron é responsabilidade de quem chama.
 */
export async function syncStories(
  igAccountId: string,
): Promise<StoriesSyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: account, error: fetchErr } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("id", igAccountId)
    .single();

  if (fetchErr || !account) return { ok: false, error: "Conta não encontrada." };

  const warnings: string[] = [];

  try {
    const accessToken = decryptAccountToken(account.access_token_encrypted);
    const graphCtx = contextForAccount(account);

    const stories = await getStoriesList(accessToken, graphCtx);

    if (stories.length === 0) {
      return { ok: true, igAccountId, storyCount: 0, warnings };
    }

    let saved = 0;
    for (const story of stories) {
      const postedAt = story.timestamp;
      const expiresAt = new Date(
        new Date(postedAt).getTime() + 24 * 60 * 60 * 1000,
      ).toISOString();

      const { insights, errors: insightErrors } = await getStoryInsights(
        accessToken,
        story.id,
        graphCtx,
      );
      if (insightErrors.length > 0) {
        warnings.push(`story ${story.id}: ${insightErrors[0]}`);
      }

      const { error: upsertErr } = await supabase.from("stories").upsert(
        {
          ig_account_id: account.id,
          ig_media_id: story.id,
          caption: story.caption ?? null,
          permalink: story.permalink ?? null,
          media_url: story.media_url ?? null,
          thumbnail_url: story.thumbnail_url ?? null,
          media_type: story.media_type ?? null,
          posted_at: postedAt,
          expires_at: expiresAt,
          reach: findMetric(insights, "reach"),
          views: findMetric(insights, "views"),
          replies: findMetric(insights, "replies"),
          shares: findMetric(insights, "shares"),
          total_interactions: findMetric(insights, "total_interactions"),
          taps_forward: findMetric(insights, "taps_forward"),
          taps_back: findMetric(insights, "taps_back"),
          exits: findMetric(insights, "exits"),
          navigation: findMetric(insights, "navigation"),
          profile_activity: findMetric(insights, "profile_activity"),
          raw_payload: {
            story,
            insights,
            errors: insightErrors,
          } as unknown as never,
        },
        { onConflict: "ig_account_id,ig_media_id" },
      );

      if (upsertErr) {
        warnings.push(`story ${story.id}: ${upsertErr.message}`);
      } else {
        saved += 1;
      }
    }

    return { ok: true, igAccountId, storyCount: saved, warnings };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[syncStories] erro:", message);
    return { ok: false, error: message };
  }
}

/**
 * Sync completo: perfil + mídia + tráfego pago. Chamado quando usuário
 * clica em "Sincronizar agora".
 */
export async function syncAccountFull(igAccountId: string): Promise<{
  ok: boolean;
  error?: string;
  warnings: string[];
}> {
  const profile = await syncAccountProfile(igAccountId);
  if (!profile.ok) return { ok: false, error: profile.error, warnings: [] };

  const media = await syncAccountMedia(igAccountId);
  if (!media.ok) {
    return {
      ok: true, // perfil deu certo, só mídia falhou
      warnings: [...profile.warnings, `Mídia: ${media.error}`],
    };
  }

  // Paid insights — tolerante a falhas (ex: token sem ads_read).
  // Não bloqueia o sync se falhar — só vira warning.
  const paid = await syncPaidInsights(igAccountId);
  const paidWarnings: string[] = [];
  if (!paid.ok) {
    paidWarnings.push(`Tráfego pago: ${paid.error}`);
  } else {
    paidWarnings.push(...paid.warnings);
  }

  // Stories — só ativos (<24h). Pra histórico real precisa de cron recorrente.
  const stories = await syncStories(igAccountId);
  const storyWarnings: string[] = [];
  if (!stories.ok) {
    storyWarnings.push(`Stories: ${stories.error}`);
  } else if (stories.storyCount > 0) {
    storyWarnings.push(
      `Stories: ${stories.storyCount} ativos coletados (API só expõe <24h)`,
    );
    storyWarnings.push(...stories.warnings);
  }

  return {
    ok: true,
    warnings: [
      ...profile.warnings,
      ...media.warnings,
      ...paidWarnings,
      ...storyWarnings,
    ],
  };
}

export async function syncAccountFormAction(formData: FormData) {
  const igAccountId = String(formData.get("igAccountId") ?? "");
  // `returnTo` permite voltar pra mesma página (detalhe ou dashboard)
  const returnToRaw = String(formData.get("returnTo") ?? "/dashboard");
  // Sanitiza: só aceita paths internos
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/dashboard";

  if (!igAccountId) redirect(`${returnTo}?error=missing_account`);

  const result = await syncAccountFull(igAccountId);
  const url = new URL(returnTo, "https://placeholder");
  if (result.ok) {
    url.searchParams.set("synced", igAccountId);
    if (result.warnings.length > 0) {
      url.searchParams.set("sync_warning", result.warnings[0].slice(0, 100));
    }
  } else {
    url.searchParams.set("sync_error", (result.error ?? "").slice(0, 100));
  }
  redirect(url.pathname + url.search);
}
