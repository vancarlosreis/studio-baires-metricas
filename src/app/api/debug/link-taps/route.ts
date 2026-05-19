/**
 * GET /api/debug/link-taps?handle=maqservexpress&days=30
 *
 * Diagnóstica `profile_links_taps`:
 * 1. O que a IG API retorna direto pro período (since/until)
 * 2. O que está no snapshot mais recente do banco
 * 3. Testa também `website_clicks` (métrica depreciada v21, mas vale checar)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import {
  contextForAccount,
  getAccountInsights,
  readInsightValue,
} from "@/lib/instagram/api";

function decryptAccountToken(blob: unknown): { ok: true; token: string } | { ok: false; error: string } {
  try {
    let buffer: Buffer;
    if (typeof blob === "string") {
      const hex = blob.startsWith("\\x") ? blob.slice(2) : blob;
      buffer = Buffer.from(hex, "hex");
    } else {
      buffer = Buffer.from(blob as Uint8Array);
    }
    return { ok: true, token: decryptToken(buffer) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
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
  const days = parseInt(url.searchParams.get("days") ?? "30", 10);

  if (!handle) {
    return NextResponse.json({ error: "missing ?handle=" }, { status: 400 });
  }

  const { data: account } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("ig_username", handle)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "account not found" }, { status: 404 });
  }

  const decrypt = decryptAccountToken(account.access_token_encrypted);
  if (!decrypt.ok) {
    return NextResponse.json(
      { error: "decrypt failed", detail: decrypt.error },
      { status: 500 },
    );
  }

  const ctx = contextForAccount(account);
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400_000);
  const until = Math.floor(end.getTime() / 1000);
  // Meta limita 30d exatos — capeia
  const MAX = 30 * 86400;
  const sinceRaw = Math.floor(start.getTime() / 1000);
  const since = Math.max(sinceRaw, until - MAX);

  // 1. profile_links_taps direto
  let linkTapsRaw: unknown = null;
  let linkTapsValue: number | null = null;
  let linkTapsError: string | null = null;
  try {
    const data = await getAccountInsights(
      decrypt.token,
      ["profile_links_taps"],
      { since, until },
      ctx,
    );
    linkTapsRaw = data;
    linkTapsValue = readInsightValue(data[0]);
  } catch (err) {
    linkTapsError = err instanceof Error ? err.message : String(err);
  }

  // 2. website_clicks (depreciado v21 — vale testar)
  let websiteClicksRaw: unknown = null;
  let websiteClicksValue: number | null = null;
  let websiteClicksError: string | null = null;
  try {
    const data = await getAccountInsights(
      decrypt.token,
      ["website_clicks"],
      { since, until },
      ctx,
    );
    websiteClicksRaw = data;
    websiteClicksValue = readInsightValue(data[0]);
  } catch (err) {
    websiteClicksError = err instanceof Error ? err.message : String(err);
  }

  // 3. Último snapshot no banco
  const { data: snapshot } = await supabase
    .from("account_snapshots")
    .select("snapshot_date, profile_links_taps, website_clicks")
    .eq("ig_account_id", account.id)
    .order("snapshot_date", { ascending: false })
    .limit(5);

  return NextResponse.json({
    account: {
      handle: account.ig_username,
      auth_method: account.auth_method,
      ig_user_id: account.ig_user_id,
      account_type: account.account_type,
    },
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
      since,
      until,
      days,
    },
    profile_links_taps_api: {
      value: linkTapsValue,
      error: linkTapsError,
      raw: linkTapsRaw,
    },
    website_clicks_api: {
      value: websiteClicksValue,
      error: websiteClicksError,
      raw: websiteClicksRaw,
    },
    recent_snapshots: snapshot,
  });
}
