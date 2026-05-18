/**
 * Rota debug pra inspecionar o que cada endpoint da Marketing API retorna
 * pra uma conta IG conectada via Facebook Login.
 *
 * Uso: GET /api/debug/ad-accounts?handle=maqservexpress
 *
 * Retorna JSON com:
 * - businesses (lista de /me/businesses)
 * - direct (lista de /me/adaccounts)
 * - assigned (lista de /me/assigned_ad_accounts)
 * - byBusiness[bizId] (owned + client de cada BM)
 * - errors (qualquer falha)
 *
 * Protegido por allowlist (isAllowedEmail) e RLS automática do Supabase.
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

async function fetchJson(
  url: string,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: `${res.status}: ${JSON.stringify(json)}` };
    }
    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
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

  const handle = new URL(request.url).searchParams.get("handle");
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

  let token: string;
  try {
    token = decryptAccountToken(account.access_token_encrypted);
  } catch (err) {
    return NextResponse.json(
      { error: `decrypt: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 },
    );
  }

  const fields = "id,name,currency,timezone_name,account_status";
  const params = new URLSearchParams({ fields, limit: "100", access_token: token });

  // 1. Direct
  const direct = await fetchJson(`${GRAPH_BASE}/me/adaccounts?${params}`);

  // 2. Assigned
  const assigned = await fetchJson(`${GRAPH_BASE}/me/assigned_ad_accounts?${params}`);

  // 3. Businesses
  const businessesParams = new URLSearchParams({
    fields: "id,name",
    limit: "100",
    access_token: token,
  });
  const businesses = await fetchJson(
    `${GRAPH_BASE}/me/businesses?${businessesParams}`,
  );

  // 4. Pra cada business, owned + client
  const byBusiness: Record<
    string,
    {
      name: string;
      owned: unknown;
      client: unknown;
    }
  > = {};

  if (businesses.ok) {
    const bizList = ((businesses.data as { data?: Array<{ id: string; name?: string }> }).data ?? []);
    for (const biz of bizList) {
      const owned = await fetchJson(`${GRAPH_BASE}/${biz.id}/owned_ad_accounts?${params}`);
      const client = await fetchJson(`${GRAPH_BASE}/${biz.id}/client_ad_accounts?${params}`);
      byBusiness[biz.id] = {
        name: biz.name ?? "(sem nome)",
        owned: owned.ok ? owned.data : { error: owned.error },
        client: client.ok ? client.data : { error: client.error },
      };
    }
  }

  return NextResponse.json({
    account: {
      ig_username: account.ig_username,
      auth_method: account.auth_method,
      connected_at: account.connected_at,
    },
    direct: direct.ok ? direct.data : { error: direct.error },
    assigned: assigned.ok ? assigned.data : { error: assigned.error },
    businesses: businesses.ok ? businesses.data : { error: businesses.error },
    byBusiness,
  });
}
