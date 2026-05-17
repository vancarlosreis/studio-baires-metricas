import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Bell, Share2 } from "lucide-react";
import { PeriodSelectorDark } from "./PeriodSelectorDark";
import { SyncButtonDark } from "./SyncButtonDark";

type Props = {
  username: string;
  displayName: string;
  profilePictureUrl?: string | null;
  initials: string;
  accountTypeLabel: string;
  lastSyncedLabel: string;
  igAccountId: string;
};

export function Topbar({
  username,
  displayName,
  profilePictureUrl,
  initials,
  accountTypeLabel,
  lastSyncedLabel,
  igAccountId,
}: Props) {
  return (
    <header className="flex flex-col gap-4">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1 text-xs font-medium text-white/60 transition hover:text-white"
      >
        <ArrowLeft size={12} /> Voltar à visão geral
      </Link>

      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-neon-purple/50">
            {profilePictureUrl ? (
              <Image
                src={profilePictureUrl}
                alt={displayName}
                width={56}
                height={56}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="dark-bg-grad-purple-pink grid h-full w-full place-items-center text-base font-semibold text-white">
                {initials}
              </div>
            )}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
              {accountTypeLabel} · @{username}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
              {displayName.split(" ")[0]}{" "}
              <span className="dark-text-grad">{displayName.split(" ").slice(1).join(" ") || "Overview"}</span>
            </h1>
            <p className="mt-0.5 text-xs text-white/40">
              Última sync · {lastSyncedLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PeriodSelectorDark />
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.06] bg-surface/60 text-white/70 transition hover:text-white"
            aria-label="Notificações"
          >
            <Bell size={16} />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-surface/60 px-4 py-2 text-sm font-medium text-white/70 transition hover:text-white"
          >
            <Share2 size={14} /> Compartilhar
          </button>
          <SyncButtonDark igAccountId={igAccountId} />
        </div>
      </div>
    </header>
  );
}
