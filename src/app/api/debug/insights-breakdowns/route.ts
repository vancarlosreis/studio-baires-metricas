/**
 * GET /api/debug/insights-breakdowns?handle=duda.macedogr&days=30
 *
 * Testa MÚLTIPLAS variações do endpoint /me/insights pra descobrir qual
 * (se algum) retorna breakdown organic vs paid pra alcance/views/etc.
 *
 * A Reportei mostra "Alcance Pago" da conta — precisamos descobrir de
 * onde vem esse dado. Pode ser:
 *  - Endpoint IG Insights com breakdown específico
 *  - Endpoint legado ainda ativo
 *  - Marketing API agregando
 *
 * Esse debug testa todas as combinações conhecidas e retorna em paralelo.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { isAllowedEmail } from "@/lib/auth/allowlist";

const GRAPH_FB = "https://graph.facebook.com/v23.0";
const GRAPH_IG = "https://graph.instagram.com/v23.0";

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

async function tryFetch(label: string, url: string) {
  try {
    const res = await fetch(url);
    const json = await res.json();
    return {
      label,
      url: url.split("access_token=")[0] + "access_token=…",
      ok: res.ok,
      status: res.status,
      data: json,
    };
  } catch (err) {
    return {
      label,
      url,
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

  const token = decryptAccountToken(account.access_token_encrypted);
  const igId = account.ig_user_id;

  const until = Math.floor(Date.now() / 1000);
  const since = until - days * 86400;

  const base = `${GRAPH_FB}/${igId}/insights`;
  const baseIg = `${GRAPH_IG}/${igId}/insights`;

  // Conjunto de variações pra testar
  const tests = [
    // 1. Baseline (o que já usamos)
    {
      label: "reach (period=day, total_value, sem breakdown)",
      url: `${base}?metric=reach&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${token}`,
    },
    // 2. Breakdown=media_product_type (separa REEL vs FEED vs STORY)
    {
      label: "reach com breakdown=media_product_type",
      url: `${base}?metric=reach&period=day&metric_type=total_value&breakdown=media_product_type&since=${since}&until=${until}&access_token=${token}`,
    },
    // 3. Breakdown=follow_type (FOLLOWER vs NON_FOLLOWER)
    {
      label: "reach com breakdown=follow_type",
      url: `${base}?metric=reach&period=day&metric_type=total_value&breakdown=follow_type&since=${since}&until=${until}&access_token=${token}`,
    },
    // 4. Breakdown=age,gender (demográfico)
    {
      label: "reach com breakdown=age,gender",
      url: `${base}?metric=reach&period=day&metric_type=total_value&breakdown=age,gender&since=${since}&until=${until}&access_token=${token}`,
    },
    // 5. Sem metric_type (default time_series)
    {
      label: "reach (period=day, sem metric_type, time series)",
      url: `${base}?metric=reach&period=day&since=${since}&until=${until}&access_token=${token}`,
    },
    // 6. Legado: impressions (pode dar erro mas vamos ver)
    {
      label: "impressions legado",
      url: `${base}?metric=impressions&period=day&since=${since}&until=${until}&access_token=${token}`,
    },
    // 7. Métrica reach_organic (deprecada mas vale tentar)
    {
      label: "reach_organic (deprecado?)",
      url: `${base}?metric=reach_organic&period=day&since=${since}&until=${until}&access_token=${token}`,
    },
    // 8. Métrica reach_paid (deprecada mas vale tentar)
    {
      label: "reach_paid (deprecado?)",
      url: `${base}?metric=reach_paid&period=day&since=${since}&until=${until}&access_token=${token}`,
    },
    // 9. Views com breakdowns
    {
      label: "views com breakdown=media_product_type",
      url: `${base}?metric=views&period=day&metric_type=total_value&breakdown=media_product_type&since=${since}&until=${until}&access_token=${token}`,
    },
    // 10. Tentar via graph.instagram.com (Business Login endpoint)
    {
      label: "graph.instagram.com /insights reach",
      url: `${baseIg}?metric=reach&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${token}`,
    },
    // 11. ad_attribution (palpite de breakdown)
    {
      label: "reach com breakdown=ad_attribution (palpite)",
      url: `${base}?metric=reach&period=day&metric_type=total_value&breakdown=ad_attribution&since=${since}&until=${until}&access_token=${token}`,
    },
    // 12. type breakdown (organic/paid)
    {
      label: "reach com breakdown=type",
      url: `${base}?metric=reach&period=day&metric_type=total_value&breakdown=type&since=${since}&until=${until}&access_token=${token}`,
    },
    // 13. Lista todas metrics disponíveis (sem pedir nenhuma)
    {
      label: "metadata da conta IG",
      url: `${GRAPH_FB}/${igId}?fields=id,username,name,profile_picture_url&access_token=${token}`,
    },
  ];

  const results = await Promise.all(
    tests.map((t) => tryFetch(t.label, t.url)),
  );

  return NextResponse.json({
    account: {
      ig_username: account.ig_username,
      ig_user_id: account.ig_user_id,
      auth_method: account.auth_method,
    },
    period: {
      since,
      until,
      days,
      since_iso: new Date(since * 1000).toISOString(),
      until_iso: new Date(until * 1000).toISOString(),
    },
    results,
  });
}
