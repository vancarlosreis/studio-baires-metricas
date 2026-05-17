"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { syncAccountFull } from "@/app/actions/sync";

export function SyncButtonDark({
  igAccountId,
  label = "Sincronizar",
}: {
  igAccountId: string;
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
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSync}
        disabled={pending}
        className="dark-bg-grad-purple-pink dark-glow-purple inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-60"
      >
        <RefreshCw size={14} className={pending ? "animate-spin" : ""} />
        {pending ? "Sincronizando…" : label}
      </button>
      {error && (
        <span className="max-w-[260px] truncate text-[10px] text-danger-neon">
          {error}
        </span>
      )}
    </div>
  );
}
