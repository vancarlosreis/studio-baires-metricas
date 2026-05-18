/**
 * GET /api/debug/ads?handle=duda.macedogr&account=act_1814731736579636&days=90
 *
 * Mostra os ads (com creative + insights) de uma ad account específica
 * usando o token da conta IG informada.
 *
 * Útil pra diagnosticar:
 * - Se há ads no período
 * - Que campo de creative vem (object_story_id, instagram_permalink_url)
 * - Se as métricas (reach, impressions) vêm > 0
 * - Como a heurística de matching com mídia funcionaria
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { isAllowedEmail } from "@/lib/auth/allowlist";

const GRAPH_BASE = "https://graph.facebook.com/v23.0";

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

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const handle = url.searchParams.get("handle");
  const adAccount = url.searchParams.get("account");
  const days = parseInt(url.searchParams.get("days") ?? "90", 10);

  if (!handle || !adAccount) {
    return NextResponse.json(
      { error: "missing ?handle=X&account=act_YYY" },
      { status: 400 },
    );
  }

  const { data: account } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("ig_username", handle)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "account not found" }, { status: 404 });
  }

  const token = decryptAccountToken(account.access_token_encrypted);

  const until = new Date();
  const since = new Date(until.getTime() - days * 86400_000);
  const sinceStr = since.toISOString().slice(0, 10);
  const untilStr = until.toISOString().slice(0, 10);

  // Tenta com insights time-ranged primeiro
  const fields = [
    "id",
    "name",
    "effective_status",
    "created_time",
    "creative{id,object_story_id,effective_object_story_id,instagram_permalink_url,thumbnail_url}",
    `insights.time_range({"since":"${sinceStr}","until":"${untilStr}"}){reach,impressions,clicks,spend,actions,video_play_actions,date_start,date_stop}`,
  ].join(",");

  const params = new URLSearchParams({
    fields,
    limit: "100",
    access_token: token,
  });

  // Tenta sem filtro de status primeiro (pra ver tudo)
  const url1 = `${GRAPH_BASE}/${adAccount}/ads?${params}`;

  let result: unknown;
  try {
    const res = await fetch(url1);
    const json = await res.json();
    result = res.ok ? json : { httpStatus: res.status, body: json };
  } catch (err) {
    result = { fetchError: err instanceof Error ? err.message : "unknown" };
  }

  // Também tenta pegar ad account info pra confirmar acesso
  let accountInfo: unknown;
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${adAccount}?fields=id,name,currency,account_status,age,balance&access_token=${token}`,
    );
    accountInfo = await res.json();
  } catch (err) {
    accountInfo = { error: err instanceof Error ? err.message : "unknown" };
  }

  return NextResponse.json({
    query: {
      handle,
      adAccount,
      sinceStr,
      untilStr,
      days,
    },
    accountInfo,
    ads: result,
  });
}
