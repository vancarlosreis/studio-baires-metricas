"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAllowedEmail } from "@/lib/auth/allowlist";

export type AuthState = { error?: string; sent?: boolean };

const NOT_CONFIGURED =
  "Supabase ainda não foi configurado. Preencha as keys em .env.local.";

const EMAIL_NOT_ALLOWED =
  "Este e-mail não está autorizado a acessar o sistema.";

/** Aceita só paths internos (começa com /) pra evitar open redirect. */
function sanitizeNext(raw: string | null | undefined): string {
  if (!raw) return "/dashboard";
  if (typeof raw !== "string") return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function signInWithMagicLink(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe seu e-mail." };

  // Bloqueia ANTES de chamar Supabase pra evitar até a tentativa de envio
  if (!isAllowedEmail(email)) return { error: EMAIL_NOT_ALLOWED };

  const next = sanitizeNext(String(formData.get("next") ?? ""));

  const supabase = await createClient();
  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    `${headersList.get("x-forwarded-proto") ?? "http"}://${headersList.get("host")}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { error: error.message };
  return { sent: true };
}

export async function signInWithGoogle(formData?: FormData) {
  if (!isSupabaseConfigured()) {
    throw new Error(NOT_CONFIGURED);
  }
  const next = sanitizeNext(
    formData ? String(formData.get("next") ?? "") : null,
  );

  const supabase = await createClient();
  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    `${headersList.get("x-forwarded-proto") ?? "http"}://${headersList.get("host")}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) throw new Error(error.message);
  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
