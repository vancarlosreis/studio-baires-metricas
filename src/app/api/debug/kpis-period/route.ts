/**
 * GET /api/debug/kpis-period?handle=duda.macedogr&days=30
 *
 * Executa fetchAccountKpisForPeriod e mostra exatamente o que retornou
 * + diagnóstico de cada step (decrypt, contexto, cada chamada API).
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import {
  contextForAccount,
  getAccountInsights,
  getAccountMetricWithProductTypeBreakdown,
} from "@/lib/instagram/api";
import { fetchAccountKpisForPeriod } from "@/lib/queries/account-kpis";

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

  const end = new Date();
  const start = new Date(end.getTime() - days * 86400_000);

  // Step 1: decrypt
  const decrypt = decryptAccountToken(account.access_token_encrypted);

  // Step 2: context
  const ctx = contextForAccount(account);

  // Step 3: chamar a função real
  const kpisResult = await fetchAccountKpisForPeriod(account, start, end).catch(
    (err) => ({ __error: err instanceof Error ? err.message : String(err) }),
  );

  // Step 4: tentar individualmente cada chamada interna pra ver qual falha
  const breakdownResults: Record<string, unknown> = {};
  if (decrypt.ok) {
    const since = Math.floor(start.getTime() / 1000);
    const until = Math.floor(end.getTime() / 1000);
    try {
      breakdownResults.reach = await getAccountMetricWithProductTypeBreakdown(
        decrypt.token,
        "reach",
        { since, until },
        ctx,
      );
    } catch (err) {
      breakdownResults.reach = {
        __error: err instanceof Error ? err.message : String(err),
      };
    }
    try {
      breakdownResults.views = await getAccountMetricWithProductTypeBreakdown(
        decrypt.token,
        "views",
        { since, until },
        ctx,
      );
    } catch (err) {
      breakdownResults.views = {
        __error: err instanceof Error ? err.message : String(err),
      };
    }
    try {
      breakdownResults.total_interactions =
        await getAccountMetricWithProductTypeBreakdown(
          decrypt.token,
          "total_interactions",
          { since, until },
          ctx,
        );
    } catch (err) {
      breakdownResults.total_interactions = {
        __error: err instanceof Error ? err.message : String(err),
      };
    }
    try {
      breakdownResults.profile_links_taps = await getAccountInsights(
        decrypt.token,
        ["profile_links_taps"],
        { since, until },
        ctx,
      );
    } catch (err) {
      breakdownResults.profile_links_taps = {
        __error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return NextResponse.json({
    account: {
      handle: account.ig_username,
      auth_method: account.auth_method,
      ig_user_id: account.ig_user_id,
    },
    period: { start: start.toISOString(), end: end.toISOString(), days },
    decrypt: decrypt.ok ? { ok: true } : { ok: false, error: decrypt.error },
    context: ctx,
    kpisResultFromFunction: kpisResult,
    individualCalls: breakdownResults,
  });
}
