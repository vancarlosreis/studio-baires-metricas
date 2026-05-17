"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl, isInstagramConfigured } from "@/lib/instagram/oauth";

const STATE_COOKIE = "ig_oauth_state";
const STATE_MAX_AGE = 600; // 10 minutos

/**
 * Inicia o fluxo OAuth do Instagram Business Login.
 * Gera um state pra CSRF, salva em cookie httpOnly e redireciona pro Instagram.
 */
export async function startInstagramOAuth() {
  if (!isInstagramConfigured()) {
    throw new Error(
      "Instagram não configurado. Preencha INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET e INSTAGRAM_REDIRECT_URI.",
    );
  }

  // Exige usuário autenticado no app
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?error=not_authenticated");
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE,
  });

  redirect(buildAuthUrl(state));
}

/**
 * Desconecta uma conta IG (mantém histórico no banco mas marca como inativa).
 */
export async function disconnectInstagramAccount(igAccountId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?error=not_authenticated");
  }

  const { error } = await supabase
    .from("ig_accounts")
    .update({ is_active: false })
    .eq("id", igAccountId);

  if (error) {
    throw new Error(`Falha ao desconectar conta: ${error.message}`);
  }

  redirect("/dashboard");
}
