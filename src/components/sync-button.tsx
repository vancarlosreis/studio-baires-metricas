"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncAccountFull } from "@/app/actions/sync";

/**
 * Botão de sync que dispara a server action e força refresh dos RSCs.
 * Resolve o problema de "precisa apertar F5" pra ver dados novos.
 */
export function SyncButton({
  igAccountId,
  variant = "primary",
  label = "Sincronizar agora ↻",
}: {
  igAccountId: string;
  variant?: "primary" | "link";
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSync() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await syncAccountFull(igAccountId);
        if (!result.ok) {
          setError(result.error ?? "Erro ao sincronizar");
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao sincronizar");
        return;
      }
      // Força revalidação dos Server Components (sem F5)
      router.refresh();
    });
  }

  const baseClasses =
    variant === "primary"
      ? "inline-flex h-10 items-center rounded-full bg-forest px-5 text-sm font-semibold text-cream transition-colors hover:bg-forest-soft disabled:opacity-60"
      : "text-xs font-semibold text-forest underline-offset-2 hover:underline disabled:opacity-60";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSync}
        disabled={pending}
        className={baseClasses}
      >
        {pending ? "Sincronizando…" : label}
      </button>
      {error && (
        <span className="text-[10px] text-burgundy">{error.slice(0, 80)}</span>
      )}
    </div>
  );
}
