/**
 * RFC 9728 — OAuth 2.0 Protected Resource Metadata.
 * Resource server (= o /api/mcp) anuncia qual Authorization Server confia.
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
    resource: `${issuer}/api/mcp`,
    authorization_servers: [issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
  });
}
