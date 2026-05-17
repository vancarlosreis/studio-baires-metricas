import Image from "next/image";
import type { MediaWithLatestInsight } from "@/lib/queries/ig-accounts";

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toString();
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
  IMAGE: "Post",
  CAROUSEL_ALBUM: "Carrossel",
};

export function MediaCard({ media }: { media: MediaWithLatestInsight }) {
  const ins = media.latest_insight;
  const thumb = media.thumbnail_url || media.media_url;
  const kindLabel = KIND_LABEL[media.kind] ?? media.kind;

  return (
    <a
      href={media.permalink ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-2xl border border-ink/10 bg-paper transition-all hover:border-ink/30 hover:shadow-md"
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
          <div className="flex h-full items-center justify-center text-ink-soft">
            ⊘
          </div>
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
          <p className="line-clamp-2 text-xs text-ink-soft">
            {media.caption}
          </p>
        )}
        <div className="mt-3 grid grid-cols-3 gap-1 border-t border-ink/10 pt-3">
          <Metric label="❤" value={ins?.likes} />
          <Metric label="💬" value={ins?.comments} />
          <Metric label="🔖" value={ins?.saves} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <Metric label="Alcance" value={ins?.reach} small />
          <Metric label="Interações" value={ins?.total_interactions} small />
        </div>
      </div>
    </a>
  );
}

function Metric({
  label,
  value,
  small = false,
}: {
  label: string;
  value: number | null | undefined;
  small?: boolean;
}) {
  if (small) {
    return (
      <div className="text-[10px] text-ink-soft">
        <span className="uppercase tracking-wider">{label}: </span>
        <span className="font-semibold text-ink">{formatNumber(value)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-1 text-xs text-ink-soft">
      <span>{label}</span>
      <span className="font-semibold text-ink">{formatNumber(value)}</span>
    </div>
  );
}

export function MediaGrid({ items }: { items: MediaWithLatestInsight[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/20 bg-paper/50 p-8 text-center">
        <p className="text-sm text-ink-soft">
          <span className="italic">Sem posts sincronizados ainda.</span>{" "}
          Clique em &ldquo;Sincronizar agora&rdquo; pra puxar as últimas mídias.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((m) => (
        <MediaCard key={m.id} media={m} />
      ))}
    </div>
  );
}
