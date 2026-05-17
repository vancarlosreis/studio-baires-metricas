"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import {
  getAccountProfile,
  getAccountInsightsResilient,
  getMediaList,
  getMediaInsightsResilient,
  findMetric,
  type MediaType,
} from "@/lib/instagram/api";
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

const INSIGHTS_PERIOD_DAYS = 7;

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

    // 1. Perfil
    const profile = await getAccountProfile(accessToken);

    // 2. Insights — adapta por account_type, tolerante a falhas parciais
    const until = Math.floor(Date.now() / 1000);
    const since = until - INSIGHTS_PERIOD_DAYS * 24 * 60 * 60;
    const { insights, errors: insightErrors } = await getAccountInsightsResilient(
      accessToken,
      profile.account_type,
      { since, until },
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

    // 4. Salva snapshot do dia
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
          // Universais (funciona em BUSINESS + CREATOR)
          reach: findMetric(insights, "reach"),
          accounts_engaged: findMetric(insights, "accounts_engaged"),
          total_interactions: findMetric(insights, "total_interactions"),
          likes: findMetric(insights, "likes"),
          comments: findMetric(insights, "comments"),
          shares: findMetric(insights, "shares"),
          saves: findMetric(insights, "saves"),
          // Business-only (vai ser null pra contas CREATOR)
          profile_views: findMetric(insights, "profile_views"),
          website_clicks: findMetric(insights, "website_clicks"),
          raw_payload: {
            profile,
            insights,
            errors: insightErrors,
            period: { since, until, days: INSIGHTS_PERIOD_DAYS },
          } as unknown as never,
        },
        { onConflict: "ig_account_id,snapshot_date" },
      );

    if (snapErr) throw new Error(`Falha ao salvar snapshot: ${snapErr.message}`);

    if (job) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          metadata: { insight_errors: insightErrors } as unknown as never,
        })
        .eq("id", job.id);
    }

    revalidatePath("/dashboard");
    return {
      ok: true,
      igAccountId: account.id,
      snapshot_date: today,
      warnings: insightErrors,
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

    // 1. Lista mídias
    const { data: mediaItems } = await getMediaList(accessToken, { maxItems });

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
      );

      if (insightErrors.length > 0) {
        warnings.push(`media ${item.id} insights: ${insightErrors[0]}`);
      }

      // Insere snapshot de insights (não upsert — guardamos histórico)
      await supabase.from("media_insights").insert({
        media_id: mediaRow.id,
        likes: findMetric(insights, "likes"),
        comments: findMetric(insights, "comments"),
        saves: findMetric(insights, "saves"),
        shares: findMetric(insights, "shares"),
        reach: findMetric(insights, "reach"),
        impressions: findMetric(insights, "impressions"),
        views: findMetric(insights, "views"),
        plays: findMetric(insights, "plays"),
        total_interactions: findMetric(insights, "total_interactions"),
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

    revalidatePath("/dashboard");
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

/**
 * Sync completo: perfil + mídia. Chamado quando usuário clica em
 * "Sincronizar agora".
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

  return {
    ok: true,
    warnings: [...profile.warnings, ...media.warnings],
  };
}

export async function syncAccountFormAction(formData: FormData) {
  const igAccountId = String(formData.get("igAccountId") ?? "");
  if (!igAccountId) redirect("/dashboard?error=missing_account");

  const result = await syncAccountFull(igAccountId);
  const url = new URL("/dashboard", "https://placeholder");
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
