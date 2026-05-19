/**
 * RFC 7591 — Dynamic Client Registration.
 * Claude.ai (e outros clientes) POST aqui pra criar um client_id.
 */
import { NextResponse, type NextRequest } from "next/server";
import { registerClient } from "@/lib/oauth/clients";

type RegistrationRequest = {
  client_name?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
};

export async function POST(request: NextRequest) {
  let body: RegistrationRequest;
  try {
    body = (await request.json()) as RegistrationRequest;
  } catch {
    return NextResponse.json(
      { error: "invalid_request", error_description: "JSON inválido" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.redirect_uris) || body.redirect_uris.length === 0) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description: "redirect_uris obrigatório",
      },
      { status: 400 },
    );
  }

  try {
    const client = await registerClient({
      client_name: body.client_name,
      redirect_uris: body.redirect_uris,
      grant_types: body.grant_types,
      response_types: body.response_types,
      token_endpoint_auth_method: body.token_endpoint_auth_method,
      scope: body.scope,
    });

    // RFC 7591 § 3.2.1 — resposta
    return NextResponse.json(
      {
        client_id: client.client_id,
        client_id_issued_at: Math.floor(
          new Date(client.created_at).getTime() / 1000,
        ),
        client_secret_expires_at: 0, // public client, sem secret
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
        grant_types: client.grant_types,
        response_types: client.response_types,
        token_endpoint_auth_method: client.token_endpoint_auth_method,
        scope: client.scope,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro";
    console.error("[oauth/register] erro:", message);
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: message },
      { status: 400 },
    );
  }
}
