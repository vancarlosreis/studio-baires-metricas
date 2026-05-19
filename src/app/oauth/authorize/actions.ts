"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { getClient } from "@/lib/oauth/clients";
import { issueAuthorizationCode } from "@/lib/oauth/codes";

function buildRedirect(
  redirectUri: string,
  params: Record<string, string | null | undefined>,
): string {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function approveAuthorizationAction(formData: FormData) {
  const action = String(formData.get("action") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const redirect_uri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");
  const code_challenge = String(formData.get("code_challenge") ?? "");
  const code_challenge_method = String(
    formData.get("code_challenge_method") ?? "S256",
  );
  const scope = String(formData.get("scope") ?? "") || null;
  const resource = String(formData.get("resource") ?? "") || null;

  // Re-valida client
  const client = await getClient(client_id);
  if (!client || !client.redirect_uris.includes(redirect_uri)) {
    redirect("/oauth/authorize?error=invalid_client");
  }

  // Se negou, retorna error pro client
  if (action !== "approve") {
    redirect(
      buildRedirect(redirect_uri, {
        error: "access_denied",
        error_description: "Usuário negou a autorização",
        state,
      }),
    );
  }

  // Re-checa user (defesa em profundidade)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    redirect(
      buildRedirect(redirect_uri, {
        error: "access_denied",
        error_description: "Usuário não autenticado ou não autorizado",
        state,
      }),
    );
  }

  // After this point user is guaranteed non-null (early return + redirect on null)
  const authenticatedUser = user!;

  // Emite code e redireciona
  const code = await issueAuthorizationCode({
    client_id,
    user_id: authenticatedUser.id,
    user_email: authenticatedUser.email!,
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method: code_challenge_method as "S256" | "plain",
    resource,
  });

  redirect(buildRedirect(redirect_uri, { code, state }));
}
