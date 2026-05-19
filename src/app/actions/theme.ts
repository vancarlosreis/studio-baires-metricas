"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

export async function setThemeAction(theme: Theme) {
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    httpOnly: false, // precisa ser lido por JS opcionalmente
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 ano
    path: "/",
  });
  revalidatePath("/", "layout");
}
