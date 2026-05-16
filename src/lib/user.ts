import type { User } from "@supabase/supabase-js";

/** Extrai o nome de exibição a partir de um user do Supabase. */
export function getDisplayName(user: User | null): string {
  if (!user) return "Visitante";
  const meta = user.user_metadata ?? {};
  return (
    meta.full_name ||
    meta.name ||
    meta.preferred_username ||
    user.email?.split("@")[0] ||
    "Usuário"
  );
}

/** Pega o primeiro nome (pra saudações). */
export function getFirstName(user: User | null): string {
  return getDisplayName(user).split(" ")[0];
}

/** Gera iniciais (máx 2 letras) a partir do nome. */
export function getInitials(user: User | null): string {
  const name = getDisplayName(user);
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** URL do avatar (do Google OAuth, se houver). */
export function getAvatarUrl(user: User | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return meta.avatar_url || meta.picture || null;
}
