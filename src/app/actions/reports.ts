"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MonthlyReport, type ReportData } from "@/lib/pdf/report";
import {
  listAccountSnapshots,
  listMediaWithInsights,
} from "@/lib/queries/ig-accounts";

export type GenerateReportResult =
  | { ok: true; reportId: string; pdfPath: string }
  | { ok: false; error: string };

/**
 * Gera um relatório PDF mensal pra uma conta IG.
 * Busca dados → renderiza PDF → upload pro Storage → salva entry em reports.
 */
export async function generateReport(
  igAccountId: string,
  periodStartIso?: string,
  periodEndIso?: string,
): Promise<GenerateReportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  // Conta
  const { data: account, error: accountErr } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("id", igAccountId)
    .single();
  if (accountErr || !account) {
    return { ok: false, error: "Conta não encontrada." };
  }

  // Período: default = últimos 30 dias
  const periodEnd = periodEndIso ? new Date(periodEndIso) : new Date();
  const periodStart = periodStartIso
    ? new Date(periodStartIso)
    : new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Dados pro PDF
  const [snapshots, media] = await Promise.all([
    listAccountSnapshots(supabase, account.id, 30),
    listMediaWithInsights(supabase, account.id, { limit: 50 }),
  ]);

  const latest = snapshots[snapshots.length - 1];
  const earliest = snapshots[0];

  // Filtra mídias do período
  const mediaInPeriod = media.filter((m) => {
    const posted = new Date(m.posted_at).getTime();
    return posted >= periodStart.getTime() && posted <= periodEnd.getTime();
  });

  // Top posts ordenados por engajamento (interações + reach)
  const topPosts = [...media]
    .map((m) => ({
      ...m,
      _score:
        (m.latest_insight?.total_interactions ?? 0) +
        (m.latest_insight?.reach ?? 0) / 10,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 4);

  // Crescimento de seguidores (% entre primeiro e último snapshot)
  let followersDelta: number | null = null;
  if (earliest?.followers_count && latest?.followers_count && earliest.id !== latest.id) {
    const delta =
      ((latest.followers_count - earliest.followers_count) /
        earliest.followers_count) *
      100;
    followersDelta = delta;
  }

  const data: ReportData = {
    accountName: account.ig_account_name ?? account.ig_username,
    accountHandle: account.ig_username,
    profilePictureUrl: account.ig_profile_picture_url,
    accountType: account.account_type,
    periodStart,
    periodEnd,
    generatedAt: new Date(),
    kpis: {
      followers: latest?.followers_count ?? null,
      followersDelta,
      reach: latest?.reach ?? null,
      engaged: latest?.accounts_engaged ?? null,
      interactions: latest?.total_interactions ?? null,
      mediaCountInPeriod: mediaInPeriod.length,
    },
    topPosts: topPosts.map((m) => ({
      permalink: m.permalink,
      thumbnailUrl: m.thumbnail_url ?? m.media_url,
      caption: m.caption,
      kind: m.kind,
      productType: m.media_product_type,
      likes: m.latest_insight?.likes ?? null,
      comments: m.latest_insight?.comments ?? null,
      saves: m.latest_insight?.saves ?? null,
      reach: m.latest_insight?.reach ?? null,
      totalInteractions: m.latest_insight?.total_interactions ?? null,
    })),
  };

  // Renderiza o PDF (server-side)
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(MonthlyReport({ data }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao renderizar PDF";
    return { ok: false, error: `Render PDF: ${message}` };
  }

  // Cria a entry no banco primeiro pra ter o ID pro path
  const periodStartDate = periodStart.toISOString().slice(0, 10);
  const periodEndDate = periodEnd.toISOString().slice(0, 10);
  const monthLabel = periodStart.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const title = `${account.ig_username} · ${monthLabel}`;

  const { data: reportRow, error: insertErr } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      ig_account_id: account.id,
      title,
      period_start: periodStartDate,
      period_end: periodEndDate,
    })
    .select()
    .single();

  if (insertErr || !reportRow) {
    return {
      ok: false,
      error: `Falha ao registrar: ${insertErr?.message ?? "desconhecido"}`,
    };
  }

  // Upload pro Storage. Path: {user_id}/{report_id}.pdf
  const storagePath = `${user.id}/${reportRow.id}.pdf`;

  const { error: uploadErr } = await supabase.storage
    .from("reports")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) {
    // Rollback do registro
    await supabase.from("reports").delete().eq("id", reportRow.id);
    return { ok: false, error: `Upload: ${uploadErr.message}` };
  }

  // Atualiza com o path final
  await supabase
    .from("reports")
    .update({ pdf_path: storagePath })
    .eq("id", reportRow.id);

  revalidatePath("/dashboard/relatorios");

  return { ok: true, reportId: reportRow.id, pdfPath: storagePath };
}

/**
 * Form action chamada por <form action={...}>
 */
export async function generateReportFormAction(formData: FormData) {
  const igAccountId = String(formData.get("igAccountId") ?? "");
  if (!igAccountId) redirect("/dashboard/relatorios?error=missing_account");

  const result = await generateReport(igAccountId);
  if (result.ok) {
    redirect(`/dashboard/relatorios?generated=${result.reportId}`);
  } else {
    redirect(
      `/dashboard/relatorios?error=${encodeURIComponent(result.error.slice(0, 100))}`,
    );
  }
}

/**
 * Server action que retorna URL assinada pra download do PDF.
 * Válida por 1 hora.
 */
export async function getReportDownloadUrl(
  reportId: string,
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();
  const { data: report } = await supabase
    .from("reports")
    .select("pdf_path")
    .eq("id", reportId)
    .single();

  if (!report?.pdf_path) return { error: "Relatório não encontrado." };

  const { data, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(report.pdf_path, 3600);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Erro ao gerar link." };
  }
  return { url: data.signedUrl };
}

/**
 * Form action redirect-based pro download (botão que usa <form>).
 */
export async function downloadReportFormAction(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "");
  if (!reportId) redirect("/dashboard/relatorios?error=missing_id");

  const result = await getReportDownloadUrl(reportId);
  if ("error" in result) {
    redirect(`/dashboard/relatorios?error=${encodeURIComponent(result.error)}`);
  }
  redirect(result.url);
}

/**
 * Deleta um relatório (banco + storage).
 */
export async function deleteReportFormAction(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "");
  if (!reportId) redirect("/dashboard/relatorios");

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("reports")
    .select("pdf_path")
    .eq("id", reportId)
    .single();

  if (report?.pdf_path) {
    await supabase.storage.from("reports").remove([report.pdf_path]);
  }
  await supabase.from("reports").delete().eq("id", reportId);

  revalidatePath("/dashboard/relatorios");
  redirect("/dashboard/relatorios");
}
