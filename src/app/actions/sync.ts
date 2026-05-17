"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import {
  getAccountProfile,
  getAccountInsightsResilient,
  findMetric,
} from "@/lib/instagram/api";

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
    // Descriptografa o token
    const tokenBlob = account.access_token_encrypted;
    let buffer: Buffer;
    if (typeof tokenBlob === "string") {
      const hex = tokenBlob.startsWith("\\x") ? tokenBlob.slice(2) : tokenBlob;
      buffer = Buffer.from(hex, "hex");
    } else {
      buffer = Buffer.from(tokenBlob as unknown as Uint8Array);
    }
    const accessToken = decryptToken(buffer);

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

export async function syncAccountFormAction(formData: FormData) {
  const igAccountId = String(formData.get("igAccountId") ?? "");
  if (!igAccountId) redirect("/dashboard?error=missing_account");

  const result = await syncAccountProfile(igAccountId);
  const url = new URL("/dashboard", "https://placeholder");
  if (result.ok) {
    url.searchParams.set("synced", igAccountId);
    if (result.warnings.length > 0) {
      url.searchParams.set("sync_warning", result.warnings[0].slice(0, 100));
    }
  } else {
    url.searchParams.set("sync_error", result.error.slice(0, 100));
  }
  redirect(url.pathname + url.search);
}
