/**
 * RFC 8414 — OAuth 2.0 Authorization Server Metadata.
 * Anuncia endpoints + capabilities. Clientes (Claude.ai) buscam aqui primeiro.
 */
import { NextResponse } from "next/server";

function baseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "https://studio-baires-metricas.vercel.app";
  return url.replace(/\/$/, "");
}

export function GET() {
  const issuer = baseUrl();
  return NextResponse.json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"], // public clients via PKCE
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mcp"],
    service_documentation: `${issuer}/docs/MCP_SETUP.md`,
  });
}
