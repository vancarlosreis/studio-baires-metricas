"use client";

import { useTransition } from "react";
import { Sun, Moon } from "lucide-react";
import { setThemeAction } from "@/app/actions/theme";
import type { Theme } from "@/lib/theme";

export function ThemeToggle({ theme }: { theme: Theme }) {
  const [pending, startTransition] = useTransition();
  const next: Theme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  const label = theme === "dark" ? "Modo claro" : "Modo escuro";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={pending}
      onClick={() => startTransition(() => setThemeAction(next))}
      className="grid h-10 w-10 place-items-center rounded-xl text-fg-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-50"
    >
      <Icon size={16} strokeWidth={1.8} />
    </button>
  );
}
