"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import {
  getAccountProfile,
  getAccountInsights,
  sumInsight,
  type InsightsMetric,
} from "@/lib/instagram/api";

const PROFILE_INSIGHT_METRICS: InsightsMetric[] = [
  "reach",
  "impressions",
  "profile_views",
  "website_clicks",
];

export type SyncResult =
  | { ok: true; igAccountId: string; snapshot_date: string }
  | { ok: false; error: string };

/**
 * Sincroniza uma conta IG: busca perfil + insights do dia e salva snapshot.
 * Retorna `{ ok: true }` em sucesso ou `{ ok: false, error }` em falha.
 *
 * NOTA: não throws — retorna shape de Result pra UI tratar.
 */
export async function syncAccountProfile(igAccountId: string): Promise<SyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  // Busca a ig_account (RLS garante isolamento)
  const { data: account, error: fetchErr } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("id", igAccountId)
    .single();

  if (fetchErr || !account) {
    return { ok: false, error: "Conta não encontrada." };
  }

  // Cria um sync_job pra log/observabilidade
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
    // Descriptografa o token. bytea volta como hex string ou Uint8Array dependendo do client.
    const tokenBlob = account.access_token_encrypted;
    let buffer: Buffer;
    if (typeof tokenBlob === "string") {
      // Vem como "\\x..." (hex prefixado) do Postgres
      const hex = tokenBlob.startsWith("\\x") ? tokenBlob.slice(2) : tokenBlob;
      buffer = Buffer.from(hex, "hex");
    } else {
      buffer = Buffer.from(tokenBlob as unknown as Uint8Array);
    }
    const accessToken = decryptToken(buffer);

    // 1. Perfil + contadores agregados
    const profile = await getAccountProfile(accessToken);

    // 2. Insights agregados (reach, impressions, profile_views, website_clicks)
    let insights: Awaited<ReturnType<typeof getAccountInsights>> = [];
    try {
      insights = await getAccountInsights(accessToken, PROFILE_INSIGHT_METRICS);
    } catch (err) {
      // Insights podem falhar se o app não tiver o scope ainda — não fatal
      console.warn("[syncAccountProfile] insights falhou:", err);
    }

    const findInsight = (name: InsightsMetric) =>
      insights.find((i) => i.name === name);

    // 3. Atualiza metadados do perfil (foto, nome, account_type podem ter mudado)
    await supabase
      .from("ig_accounts")
      .update({
        ig_account_name: profile.name ?? account.ig_account_name,
        ig_profile_picture_url:
          profile.profile_picture_url ?? account.ig_profile_picture_url,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    // 4. Salva snapshot do dia (upsert por chave única ig_account_id+date)
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { error: snapErr } = await supabase
      .from("account_snapshots")
      .upsert(
        {
          ig_account_id: account.id,
          snapshot_date: today,
          followers_count: profile.followers_count ?? null,
          follows_count: profile.follows_count ?? null,
          media_count: profile.media_count ?? null,
          reach: sumInsight(findInsight("reach")),
          impressions: sumInsight(findInsight("impressions")),
          profile_views: sumInsight(findInsight("profile_views")),
          website_clicks: sumInsight(findInsight("website_clicks")),
          raw_payload: { profile, insights } as unknown as never,
        },
        { onConflict: "ig_account_id,snapshot_date" },
      );

    if (snapErr) throw new Error(`Falha ao salvar snapshot: ${snapErr.message}`);

    // 5. Marca job como sucesso
    if (job) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    revalidatePath("/dashboard");
    return { ok: true, igAccountId: account.id, snapshot_date: today };
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

/**
 * Versão chamada por <form action={syncAccountFormAction}> que faz redirect
 * com status na query string.
 */
export async function syncAccountFormAction(formData: FormData) {
  const igAccountId = String(formData.get("igAccountId") ?? "");
  if (!igAccountId) redirect("/dashboard?error=missing_account");

  const result = await syncAccountProfile(igAccountId);
  const url = new URL("/dashboard", "https://placeholder");
  if (result.ok) {
    url.searchParams.set("synced", igAccountId);
  } else {
    url.searchParams.set("sync_error", result.error.slice(0, 100));
  }
  redirect(url.pathname + url.search);
}
