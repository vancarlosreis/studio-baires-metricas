/**
 * GET /api/debug/story-insights?handle=duda.macedogr
 *
 * Pra cada story ativo da conta, mostra:
 * 1. Os campos básicos (id, media_type, timestamp)
 * 2. Resposta crua do batch de métricas (reach/views/etc)
 * 3. Resposta crua do breakdown navigation (story_navigation_action_type)
 *
 * Pra investigar por que Avançar/Voltar/Sair/Próximo seguem zero.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import {
  contextForAccount,
  getStoriesList,
  fetchNavigationBreakdown,
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

async function rawBatch(token: string, storyId: string, apiBase: string) {
  const metrics = [
    "reach",
    "views",
    "total_interactions",
    "replies",
    "shares",
    "navigation",
    "profile_activity",
    "taps_forward",
    "taps_back",
    "exits",
  ];
  const params = new URLSearchParams({
    metric: metrics.join(","),
    access_token: token,
  });
  const res = await fetch(`${apiBase}/${storyId}/insights?${params}`, {
    cache: "no-store",
  });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text.slice(0, 500) };
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
  const apiBase = ctx.apiBase ?? "https://graph.instagram.com/v23.0";

  let stories: Awaited<ReturnType<typeof getStoriesList>>;
  try {
    stories = await getStoriesList(decrypt.token, ctx);
  } catch (err) {
    return NextResponse.json(
      { error: "getStoriesList failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  if (stories.length === 0) {
    return NextResponse.json({
      account: { handle, ig_user_id: account.ig_user_id },
      message: "Nenhum story ativo no momento (API só expõe <24h).",
    });
  }

  const results = await Promise.all(
    stories.map(async (s) => {
      const [batch, nav] = await Promise.all([
        rawBatch(decrypt.token, s.id, apiBase),
        fetchNavigationBreakdown(decrypt.token, s.id, ctx),
      ]);
      return { story: s, batch, nav };
    }),
  );

  return NextResponse.json({
    account: {
      handle,
      auth_method: account.auth_method,
      ig_user_id: account.ig_user_id,
    },
    api_base: apiBase,
    stories_count: stories.length,
    results,
  });
}
