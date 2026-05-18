"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectInstagramAccount } from "@/app/actions/instagram";

export function DisconnectAccountButton({
  igAccountId,
  igUsername,
}: {
  igAccountId: string;
  igUsername: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const ok = window.confirm(
      `Desconectar @${igUsername}?\n\nA conta vai sumir do dashboard. Os dados sincronizados (snapshots, mídias, insights) ficam no banco, mas não aparecem mais. Você pode reconectar a qualquer momento via "Conectar conta".`,
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        await disconnectInstagramAccount(igAccountId);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        window.alert(`Falha ao desconectar: ${msg}`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs font-medium text-burgundy underline-offset-2 hover:underline disabled:opacity-50"
    >
      {pending ? "Desconectando…" : "Desconectar"}
    </button>
  );
}
