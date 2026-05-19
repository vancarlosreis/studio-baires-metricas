import "server-only";
import { cookies } from "next/headers";

export type Theme = "dark" | "light";
export const THEME_COOKIE = "theme";

/** Lê o tema do cookie. Default: dark. */
export async function getThemeFromCookie(): Promise<Theme> {
  const store = await cookies();
  const v = store.get(THEME_COOKIE)?.value;
  return v === "light" ? "light" : "dark";
}
