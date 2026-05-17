"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import type { MediaWithLatestInsight } from "@/lib/queries/ig-accounts";
import { MediaDetailModal } from "@/components/media-detail-modal";

type ViewMode = "card" | "lista";

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

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function relativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (d === 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 7) return `${d}d`;
  if (d < 30) return `${Math.floor(d / 7)}sem`;
  return `${Math.floor(d / 30)}m`;
}

const KIND_LABEL: Record<string, string> = {
  REELS: "Reel",
  STORY: "Story",
  VIDEO: "Vídeo",
  IMAGE: "Imagem",
  CAROUSEL_ALBUM: "Carrossel",
};

function getKindLabel(m: MediaWithLatestInsight): string {
  if (m.media_product_type === "REELS") return "Reel";
  return KIND_LABEL[m.kind] ?? m.kind;
}

function getEngagementRate(m: MediaWithLatestInsight): number | null {
  const ins = m.latest_insight;
  if (!ins) return null;
  const interactions = ins.total_interactions ?? 0;
  const reach = ins.reach ?? 0;
  if (reach === 0) return null;
  return (interactions / reach) * 100;
}

type SortKey =
  | "posted_at"
  | "views"
  | "reach"
  | "interactions"
  | "rate"
  | "likes"
  | "comments"
  | "saves"
  | "shares"
  | "profile_visits"
  | "follows";

const COLUMNS: Array<{ key: SortKey; label: string; align?: "right" }> = [
  { key: "views", label: "Visualizações", align: "right" },
  { key: "reach", label: "Alcance", align: "right" },
  { key: "interactions", label: "Interações", align: "right" },
  { key: "rate", label: "Taxa de Interação", align: "right" },
  { key: "likes", label: "Curtidas", align: "right" },
  { key: "comments", label: "Comentários", align: "right" },
  { key: "saves", label: "Salvo", align: "right" },
  { key: "shares", label: "Compart.", align: "right" },
  { key: "profile_visits", label: "Visitas perfil", align: "right" },
  { key: "follows", label: "Começaram a seguir", align: "right" },
  { key: "posted_at", label: "Criado em", align: "right" },
];

function getSortValue(m: MediaWithLatestInsight, key: SortKey): number {
  if (key === "posted_at") return new Date(m.posted_at).getTime();
  if (key === "rate") return getEngagementRate(m) ?? -1;
  const ins = m.latest_insight;
  if (!ins) return -1;
  switch (key) {
    case "views":
      return ins.views ?? -1;
    case "reach":
      return ins.reach ?? -1;
    case "interactions":
      return ins.total_interactions ?? -1;
    case "likes":
      return ins.likes ?? -1;
    case "comments":
      return ins.comments ?? -1;
    case "saves":
      return ins.saves ?? -1;
    case "shares":
      return ins.shares ?? -1;
    case "profile_visits":
      return ins.profile_visits ?? -1;
    case "follows":
      return ins.follows ?? -1;
    default:
      return -1;
  }
}

export function MediaDisplay({ items }: { items: MediaWithLatestInsight[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedMedia, setSelectedMedia] = useState<MediaWithLatestInsight | null>(
    null,
  );

  const view: ViewMode =
    searchParams.get("vis") === "lista" ? "lista" : "card";
  const sortKey = (searchParams.get("sort") ?? "reach") as SortKey;
  const sortDir = searchParams.get("ord") === "asc" ? "asc" : "desc";

  function setView(v: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("vis", v);
    router.push(`?${params.toString()}`);
  }

  function setSort(k: SortKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("sort") === k) {
      params.set("ord", params.get("ord") === "asc" ? "desc" : "asc");
    } else {
      params.set("sort", k);
      params.set("ord", "desc");
    }
    router.push(`?${params.toString()}`);
  }

  // Ordena
  const sorted = [...items].sort((a, b) => {
    const va = getSortValue(a, sortKey);
    const vb = getSortValue(b, sortKey);
    return sortDir === "desc" ? vb - va : va - vb;
  });

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/20 bg-paper/50 p-8 text-center">
        <p className="text-sm text-ink-soft italic">
          Sem mídias sincronizadas nesse filtro.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Toggle Card / Lista */}
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-full border border-ink/15 bg-paper p-1">
          <button
            type="button"
            onClick={() => setView("card")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              view === "card" ? "bg-ink text-cream" : "text-ink-soft hover:text-ink"
            }`}
          >
            Cards
          </button>
          <button
            type="button"
            onClick={() => setView("lista")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              view === "lista" ? "bg-ink text-cream" : "text-ink-soft hover:text-ink"
            }`}
          >
            Tabela
          </button>
        </div>
      </div>

      {view === "card" ? (
        <CardView items={sorted} onSelect={setSelectedMedia} />
      ) : (
        <TableView
          items={sorted}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={setSort}
          onSelect={setSelectedMedia}
        />
      )}

      <MediaDetailModal
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </>
  );
}

// ============================================================================
// CARD VIEW (clickável → modal)
// ============================================================================
function CardView({
  items,
  onSelect,
}: {
  items: MediaWithLatestInsight[];
  onSelect: (m: MediaWithLatestInsight) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((m) => (
        <MediaCard key={m.id} media={m} onClick={() => onSelect(m)} />
      ))}
    </div>
  );
}

function MediaCard({
  media,
  onClick,
}: {
  media: MediaWithLatestInsight;
  onClick: () => void;
}) {
  const ins = media.latest_insight;
  const thumb = media.thumbnail_url || media.media_url;
  const kindLabel = getKindLabel(media);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group block overflow-hidden rounded-2xl border border-ink/10 bg-paper text-left transition-all hover:border-ink/30 hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-ink/5">
        {thumb ? (
          <Image
            src={thumb}
            alt={media.caption?.slice(0, 80) ?? "Mídia"}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-soft">⊘</div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cream">
          {kindLabel}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-paper/90 px-2 py-0.5 text-[10px] font-semibold text-ink">
          {relativeDate(media.posted_at)}
        </span>
      </div>

      <div className="p-4">
        {media.caption && (
          <p className="line-clamp-2 text-xs text-ink-soft">{media.caption}</p>
        )}
        <div className="mt-3 grid grid-cols-3 gap-1 border-t border-ink/10 pt-3">
          <Metric label="❤" value={ins?.likes} />
          <Metric label="💬" value={ins?.comments} />
          <Metric label="🔖" value={ins?.saves} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <MetricRow label="Alcance" value={ins?.reach} />
          <MetricRow label="Interações" value={ins?.total_interactions} />
        </div>
      </div>
    </button>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="flex items-center justify-center gap-1 text-xs text-ink-soft">
      <span>{label}</span>
      <span className="font-semibold text-ink">{formatNumber(value)}</span>
    </div>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="text-[10px] text-ink-soft">
      <span className="uppercase tracking-wider">{label}: </span>
      <span className="font-semibold text-ink">{formatNumber(value)}</span>
    </div>
  );
}

// ============================================================================
// TABLE VIEW (todas as colunas + sort + clickável → modal)
// ============================================================================
function TableView({
  items,
  sortKey,
  sortDir,
  onSort,
  onSelect,
}: {
  items: MediaWithLatestInsight[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  onSelect: (m: MediaWithLatestInsight) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-paper">
      <table className="w-full min-w-[1100px]">
        <thead className="border-b border-ink/10">
          <tr>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Postagem
            </th>
            <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Tipo
            </th>
            {COLUMNS.map((c) => {
              const isActive = sortKey === c.key;
              return (
                <th
                  key={c.key}
                  className={`px-3 py-3 text-[10px] font-semibold uppercase tracking-wider ${
                    c.align === "right" ? "text-right" : "text-left"
                  } ${isActive ? "text-forest" : "text-ink-soft"}`}
                >
                  <button
                    type="button"
                    onClick={() => onSort(c.key)}
                    className="inline-flex items-center gap-1 hover:text-ink"
                  >
                    {c.label}
                    {isActive && (sortDir === "desc" ? " ↓" : " ↑")}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.map((m) => {
            const ins = m.latest_insight;
            const rate = getEngagementRate(m);
            return (
              <tr
                key={m.id}
                onClick={() => onSelect(m)}
                className="cursor-pointer border-b border-ink/5 transition-colors last:border-b-0 hover:bg-cream/40"
              >
                <td className="max-w-[260px] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-ink/10">
                      {(m.thumbnail_url || m.media_url) && (
                        <Image
                          src={m.thumbnail_url || m.media_url || ""}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                          unoptimized
                        />
                      )}
                    </div>
                    <span className="truncate text-xs text-forest underline-offset-2 hover:underline">
                      {m.caption?.slice(0, 50) ?? "(sem legenda)"}
                      {(m.caption?.length ?? 0) > 50 ? "…" : ""}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-xs text-ink">
                  {getKindLabel(m)}
                </td>
                <td className="px-3 py-3 text-right text-xs text-ink tabular-nums">
                  {formatNumber(ins?.views)}
                </td>
                <td className="px-3 py-3 text-right text-xs font-semibold text-forest tabular-nums">
                  {formatNumber(ins?.reach)}
                </td>
                <td className="px-3 py-3 text-right text-xs text-ink tabular-nums">
                  {formatNumber(ins?.total_interactions)}
                </td>
                <td className="px-3 py-3 text-right text-xs text-ink tabular-nums">
                  {formatPct(rate)}
                </td>
                <td className="px-3 py-3 text-right text-xs text-ink tabular-nums">
                  {formatNumber(ins?.likes)}
                </td>
                <td className="px-3 py-3 text-right text-xs text-ink tabular-nums">
                  {formatNumber(ins?.comments)}
                </td>
                <td className="px-3 py-3 text-right text-xs text-ink tabular-nums">
                  {formatNumber(ins?.saves)}
                </td>
                <td className="px-3 py-3 text-right text-xs text-ink tabular-nums">
                  {formatNumber(ins?.shares)}
                </td>
                <td className="px-3 py-3 text-right text-xs text-ink tabular-nums">
                  {formatNumber(ins?.profile_visits)}
                </td>
                <td className="px-3 py-3 text-right text-xs text-ink tabular-nums">
                  {formatNumber(ins?.follows)}
                </td>
                <td className="px-3 py-3 text-right text-xs text-ink-soft tabular-nums">
                  {formatShortDate(m.posted_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
