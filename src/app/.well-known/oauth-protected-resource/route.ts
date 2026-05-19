/**
 * RFC 9728 — OAuth 2.0 Protected Resource Metadata.
 * Resource server (= o /api/mcp) anuncia qual Authorization Server confia.
 */
import { NextResponse } from "next/server";
import { baseUrl } from "@/lib/base-url";

export function GET() {
  const issuer = baseUrl();
  return NextResponse.json({
    resource: `${issuer}/api/mcp`,
    authorization_servers: [issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
  });
}
