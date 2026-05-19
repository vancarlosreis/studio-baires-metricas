/**
 * Token endpoint — RFC 6749 § 3.2.
 * Grants suportados: authorization_code (com PKCE) e refresh_token.
 * Aceita application/x-www-form-urlencoded (padrão OAuth) e application/json.
 */
import { NextResponse, type NextRequest } from "next/server";
import { consumeAuthorizationCode } from "@/lib/oauth/codes";
import { issueTokenPair, rotateRefreshToken } from "@/lib/oauth/tokens";

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

function error(
  code: string,
  description: string,
  status = 400,
): NextResponse {
  return NextResponse.json(
    { error: code, error_description: description },
    {
      status,
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    },
  );
}

export async function POST(request: NextRequest) {
  const body = await parseBody(request);
  const grant_type = body.grant_type;

  if (!grant_type) {
    return error("invalid_request", "grant_type ausente");
  }

  try {
    if (grant_type === "authorization_code") {
      if (!body.code || !body.client_id || !body.redirect_uri || !body.code_verifier) {
        return error(
          "invalid_request",
          "code, client_id, redirect_uri e code_verifier obrigatórios",
        );
      }
      const consumed = await consumeAuthorizationCode({
        code: body.code,
        client_id: body.client_id,
        redirect_uri: body.redirect_uri,
        code_verifier: body.code_verifier,
      });
      const tokens = await issueTokenPair({
        client_id: consumed.client_id,
        user_id: consumed.user_id,
        user_email: consumed.user_email,
        scope: consumed.scope,
      });
      return NextResponse.json(tokens, {
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
    }

    if (grant_type === "refresh_token") {
      if (!body.refresh_token || !body.client_id) {
        return error(
          "invalid_request",
          "refresh_token e client_id obrigatórios",
        );
      }
      const tokens = await rotateRefreshToken(body.refresh_token, body.client_id);
      return NextResponse.json(tokens, {
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
    }

    return error("unsupported_grant_type", `grant_type não suportado: ${grant_type}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // invalid_grant é o "padrão" da Meta — começa com isso quando o code/refresh é inválido
    if (message.startsWith("invalid_grant")) {
      return error("invalid_grant", message.replace(/^invalid_grant:?\s*/, ""));
    }
    console.error("[oauth/token] erro:", message);
    return error("server_error", message, 500);
  }
}
