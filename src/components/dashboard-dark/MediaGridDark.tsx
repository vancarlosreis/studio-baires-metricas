import { Heart, MessageCircle, Bookmark, Share2, Eye } from "lucide-react";
import Image from "next/image";
import type { MediaWithLatestInsight } from "@/lib/queries/ig-accounts";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function typeLabel(p?: string | null, kind?: string | null): string {
  if (p === "REELS" || kind === "REELS") return "Reel";
  if (p === "STORY" || kind === "STORY") return "Story";
  if (kind === "CAROUSEL_ALBUM") return "Carousel";
  if (kind === "VIDEO") return "Video";
  return "Feed";
}

function emoji(p?: string | null, kind?: string | null): string {
  if (p === "REELS" || kind === "REELS" || kind === "VIDEO") return "🎬";
  if (kind === "CAROUSEL_ALBUM") return "🖼️";
  if (p === "STORY" || kind === "STORY") return "📖";
  return "📷";
}

function firstLine(caption: string | null): string {
  if (!caption) return "(sem legenda)";
  return caption.split("\n")[0].slice(0, 90);
}

export function MediaGridDark({ items }: { items: MediaWithLatestInsight[] }) {
  if (items.length === 0) {
    return (
      <div className="dark-card grid place-items-center px-6 py-12 text-sm text-white/40">
        Nenhuma mídia disponível no período.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.slice(0, 12).map((m) => {
        const i = m.latest_insight;
        const thumb = m.thumbnail_url ?? m.media_url ?? null;
        return (
          <a
            key={m.id}
            href={m.permalink ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="dark-card dark-card-hover group flex gap-3 p-3"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-white/[0.06]">
              {thumb ? (
                <Image
                  src={thumb}
                  alt=""
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl">
                  {emoji(m.media_product_type, m.kind)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-neon-pink/15 px-2 py-0.5 text-[10px] font-semibold text-neon-pink">
                  {typeLabel(m.media_product_type, m.kind)}
                </span>
                <span className="text-[10px] text-white/40">
                  {new Date(m.posted_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs text-white/80">
                {firstLine(m.caption)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/60">
                <span className="flex items-center gap-1">
                  <Eye size={11} className="text-neon-blue" /> {fmt(i?.reach)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart size={11} /> {fmt(i?.likes)}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={11} /> {fmt(i?.comments)}
                </span>
                <span className="flex items-center gap-1">
                  <Bookmark size={11} /> {fmt(i?.saves)}
                </span>
                <span className="flex items-center gap-1">
                  <Share2 size={11} /> {fmt(i?.shares)}
                </span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
