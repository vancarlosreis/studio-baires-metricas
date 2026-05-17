"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { MediaWithLatestInsight } from "@/lib/queries/ig-accounts";

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toString();
}

function formatPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const KIND_LABEL: Record<string, string> = {
  REELS: "Reel",
  STORY: "Story",
  VIDEO: "Vídeo",
  IMAGE: "Imagem",
  CAROUSEL_ALBUM: "Carrossel",
};

function computeEngagementRate(
  m: MediaWithLatestInsight,
): number | null {
  const ins = m.latest_insight;
  if (!ins) return null;
  const interactions = ins.total_interactions ?? 0;
  const reach = ins.reach ?? 0;
  if (reach === 0) return null;
  return (interactions / reach) * 100;
}

export function MediaDetailModal({
  media,
  onClose,
}: {
  media: MediaWithLatestInsight | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!media) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [media, onClose]);

  if (!media) return null;

  const ins = media.latest_insight;
  const thumb = media.thumbnail_url || media.media_url;
  const kindLabel =
    media.media_product_type === "REELS"
      ? "Reel"
      : KIND_LABEL[media.kind] ?? media.kind;
  const engagementRate = computeEngagementRate(media);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-ink/10 bg-cream shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink hover:bg-paper/70"
        >
          ✕
        </button>

        <div className="grid gap-0 md:grid-cols-[280px_1fr]">
          {/* Thumbnail */}
          <div className="relative aspect-square w-full overflow-hidden bg-ink/5 md:aspect-auto md:h-full">
            {thumb ? (
              <Image
                src={thumb}
                alt={media.caption?.slice(0, 80) ?? "Mídia"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 280px"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-ink-soft">
                ⊘
              </div>
            )}
            <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-cream">
              {kindLabel}
            </span>
          </div>

          {/* Detalhes */}
          <div className="p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Postado em {formatDate(media.posted_at)}
            </p>
            <h3 className="headline-display mt-2 text-3xl text-ink">
              Métricas do {kindLabel.toLowerCase()}
            </h3>

            {media.caption && (
              <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-ink-soft">
                {media.caption}
              </p>
            )}

            {media.permalink && (
              <a
                href={media.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs font-semibold text-forest underline-offset-2 hover:underline"
              >
                Ver no Instagram ↗
              </a>
            )}

            {/* KPIs grandes */}
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-ink/10 pt-6">
              <Stat
                label="Alcance"
                value={formatNumber(ins?.reach)}
                accent="forest"
              />
              <Stat
                label="Visualizações"
                value={formatNumber(ins?.views)}
                accent="forest"
              />
              <Stat
                label="Interações"
                value={formatNumber(ins?.total_interactions)}
                accent="burgundy"
              />
            </div>

            {/* Taxa de interação */}
            <div className="mt-4 rounded-2xl border border-ink/10 bg-paper p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                Taxa de interação
              </div>
              <div className="headline-display mt-1 text-3xl text-ink">
                {formatPct(engagementRate)}
              </div>
              <div className="mt-0.5 text-[10px] text-ink-soft italic">
                interações ÷ alcance × 100
              </div>
            </div>

            {/* Engagement detalhado */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Row icon="❤" label="Curtidas" value={formatNumber(ins?.likes)} />
              <Row icon="💬" label="Comentários" value={formatNumber(ins?.comments)} />
              <Row icon="🔖" label="Salvamentos" value={formatNumber(ins?.saves)} />
              <Row icon="↗" label="Compartilhamentos" value={formatNumber(ins?.shares)} />
            </div>

            {/* Métricas avançadas */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ink/10 pt-4 text-sm">
              {media.media_product_type === "REELS" && ins?.plays != null && (
                <Row icon="▶" label="Plays" value={formatNumber(ins.plays)} />
              )}
              <Row
                icon="👁"
                label="Visitas ao perfil"
                value={formatNumber(ins?.profile_visits)}
              />
              <Row
                icon="➕"
                label="Novos seguidores"
                value={formatNumber(ins?.follows)}
              />
              <Row
                icon="⚙"
                label="Atividades no perfil"
                value={formatNumber(ins?.profile_activity)}
              />
              {ins?.navigation != null && (
                <Row icon="↔" label="Navegações" value={formatNumber(ins.navigation)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "ink" | "forest" | "burgundy";
}) {
  const color =
    accent === "forest"
      ? "text-forest"
      : accent === "burgundy"
        ? "text-burgundy"
        : "text-ink";
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-3 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-ink-soft">
        {label}
      </div>
      <div className={`headline-display mt-1 text-2xl ${color}`}>{value}</div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-paper/50 px-3 py-2">
      <span className="flex items-center gap-2 text-ink-soft">
        <span>{icon}</span>
        <span className="text-xs">{label}</span>
      </span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}
