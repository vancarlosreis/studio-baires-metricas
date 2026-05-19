/**
 * Token revocation — RFC 7009.
 * Aceita access_token ou refresh_token. Sempre retorna 200 (mesmo se token
 * for inválido, conforme spec — pra não vazar informação).
 */
import { NextResponse, type NextRequest } from "next/server";
import { sha256Hex } from "@/lib/oauth/crypto";
import { revokeTokenByHash } from "@/lib/oauth/tokens";

async function parseBody(req: NextRequest): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await req.json()) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(json)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }
  const text = await req.text();
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const token = body.token;
    if (token) {
      await revokeTokenByHash(sha256Hex(token));
    }
  } catch (err) {
    console.error("[oauth/revoke] erro:", err);
  }
  // RFC 7009 — sempre retorna 200 mesmo se token inválido.
  return new NextResponse(null, { status: 200 });
}
