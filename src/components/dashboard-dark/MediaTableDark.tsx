import Link from "next/link";
import Image from "next/image";
import type { MediaWithLatestInsight } from "@/lib/queries/ig-accounts";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function fmtDateBR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function typeLabel(p?: string | null, kind?: string | null): string {
  if (p === "REELS" || kind === "REELS") return "Reel";
  if (p === "STORY" || kind === "STORY") return "Story";
  if (kind === "CAROUSEL_ALBUM") return "Carrossel";
  if (kind === "VIDEO") return "Vídeo";
  if (kind === "IMAGE") return "Imagem";
  return "Feed";
}

function firstLine(caption: string | null, n = 60): string {
  if (!caption) return "(sem legenda)";
  const line = caption.split("\n")[0];
  return line.length > n ? line.slice(0, n).trim() + "…" : line;
}

export type MediaSortKey =
  | "views"
  | "reach"
  | "interactions"
  | "engagement"
  | "likes"
  | "comments"
  | "saves"
  | "shares"
  | "profile_visits"
  | "follows"
  | "posted_at";

export type MediaSortOrd = "asc" | "desc";

function getMetric(m: MediaWithLatestInsight, key: MediaSortKey): number {
  const i = m.latest_insight;
  switch (key) {
    case "views":
      return i?.views ?? 0;
    case "reach":
      return i?.reach ?? 0;
    case "interactions":
      return i?.total_interactions ?? 0;
    case "engagement":
      return (i?.reach ?? 0) > 0
        ? ((i?.total_interactions ?? 0) / (i?.reach ?? 1)) * 100
        : 0;
    case "likes":
      return i?.likes ?? 0;
    case "comments":
      return i?.comments ?? 0;
    case "saves":
      return i?.saves ?? 0;
    case "shares":
      return i?.shares ?? 0;
    case "profile_visits":
      return i?.profile_visits ?? 0;
    case "follows":
      return i?.follows ?? 0;
    case "posted_at":
      return new Date(m.posted_at).getTime();
    default:
      return 0;
  }
}

type ColumnDef = {
  key: MediaSortKey | "type" | "post";
  label: string;
  align: "left" | "right" | "center";
  sortable: boolean;
};

const COLUMNS: ColumnDef[] = [
  { key: "post", label: "Postagem", align: "left", sortable: false },
  { key: "type", label: "Tipo", align: "center", sortable: false },
  { key: "views", label: "Visualizações", align: "right", sortable: true },
  { key: "reach", label: "Alcance", align: "right", sortable: true },
  { key: "interactions", label: "Interações", align: "right", sortable: true },
  { key: "engagement", label: "Taxa de Interação", align: "right", sortable: true },
  { key: "likes", label: "Curtidas", align: "right", sortable: true },
  { key: "comments", label: "Comentários", align: "right", sortable: true },
  { key: "saves", label: "Salvo", align: "right", sortable: true },
  { key: "shares", label: "Compart.", align: "right", sortable: true },
  { key: "profile_visits", label: "Visitas perfil", align: "right", sortable: true },
  { key: "follows", label: "Novos seguidores", align: "right", sortable: true },
  { key: "posted_at", label: "Criado em", align: "right", sortable: true },
];

type Props = {
  items: MediaWithLatestInsight[];
  sort?: MediaSortKey;
  ord?: MediaSortOrd;
  /** Path base pra construir URLs do toggle de sort (ex: `/dashboard/contas/foo`). */
  basePath: string;
  /** Search params atuais (precisa preservar aba, periodo, vis, etc). */
  baseParams: Record<string, string | undefined>;
};

function buildSortHref(
  basePath: string,
  baseParams: Record<string, string | undefined>,
  key: MediaSortKey,
  currentSort: MediaSortKey | undefined,
  currentOrd: MediaSortOrd | undefined,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(baseParams)) {
    if (v && k !== "sort" && k !== "ord") params.set(k, v);
  }
  const isCurrent = currentSort === key;
  const nextOrd: MediaSortOrd = isCurrent && currentOrd === "desc" ? "asc" : "desc";
  params.set("sort", key);
  params.set("ord", nextOrd);
  return `${basePath}?${params.toString()}`;
}

export function MediaTableDark({
  items,
  sort = "reach",
  ord = "desc",
  basePath,
  baseParams,
}: Props) {
  const sorted = [...items].sort((a, b) => {
    const av = getMetric(a, sort);
    const bv = getMetric(b, sort);
    return ord === "asc" ? av - bv : bv - av;
  });

  if (sorted.length === 0) {
    return (
      <div className="dark-card grid place-items-center px-6 py-12 text-sm text-white/40">
        Nenhuma mídia disponível no período.
      </div>
    );
  }

  return (
    <div className="dark-card overflow-x-auto p-0">
      <table className="w-full min-w-[1100px] border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.12em] text-white/50">
            {COLUMNS.map((col) => {
              const isSorted = col.sortable && sort === col.key;
              const arrow = isSorted ? (ord === "desc" ? " ↓" : " ↑") : "";
              const alignClass =
                col.align === "right"
                  ? "text-right"
                  : col.align === "center"
                    ? "text-center"
                    : "text-left";
              return (
                <th
                  key={String(col.key)}
                  className={`whitespace-nowrap px-3 py-3 font-semibold ${alignClass} ${
                    isSorted ? "text-neon-pink" : ""
                  }`}
                >
                  {col.sortable ? (
                    <Link
                      href={buildSortHref(
                        basePath,
                        baseParams,
                        col.key as MediaSortKey,
                        sort,
                        ord,
                      )}
                      scroll={false}
                      className="inline-block transition hover:text-white"
                    >
                      {col.label}
                      {arrow}
                    </Link>
                  ) : (
                    <span>{col.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => {
            const i = m.latest_insight;
            const thumb = m.thumbnail_url ?? m.media_url ?? null;
            const engagement =
              (i?.reach ?? 0) > 0
                ? ((i?.total_interactions ?? 0) / (i?.reach ?? 1)) * 100
                : null;
            return (
              <tr
                key={m.id}
                className="border-b border-white/[0.04] text-white/80 transition hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3">
                  <a
                    href={m.permalink ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-white/[0.06]">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt=""
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-base">
                          📷
                        </div>
                      )}
                    </div>
                    <span className="line-clamp-2 max-w-[240px] text-[12px] text-white">
                      {firstLine(m.caption, 80)}
                    </span>
                  </a>
                </td>
                <td className="px-3 py-3 text-center text-white/70">
                  {typeLabel(m.media_product_type, m.kind)}
                </td>
                <NumCell value={i?.views} />
                <NumCell
                  value={i?.reach}
                  highlight={sort === "reach"}
                />
                <NumCell
                  value={i?.total_interactions}
                  highlight={sort === "interactions"}
                />
                <td
                  className={`px-3 py-3 text-right tabular-nums ${
                    sort === "engagement" ? "text-neon-pink" : "text-white/80"
                  }`}
                >
                  {fmtPct(engagement)}
                </td>
                <NumCell value={i?.likes} highlight={sort === "likes"} />
                <NumCell value={i?.comments} highlight={sort === "comments"} />
                <NumCell value={i?.saves} highlight={sort === "saves"} />
                <NumCell value={i?.shares} highlight={sort === "shares"} />
                <NumCell
                  value={i?.profile_visits}
                  highlight={sort === "profile_visits"}
                />
                <NumCell value={i?.follows} highlight={sort === "follows"} />
                <td className="whitespace-nowrap px-3 py-3 text-right text-white/60">
                  {fmtDateBR(m.posted_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NumCell({
  value,
  highlight = false,
}: {
  value: number | null | undefined;
  highlight?: boolean;
}) {
  return (
    <td
      className={`px-3 py-3 text-right tabular-nums ${
        highlight ? "text-neon-pink" : "text-white/80"
      }`}
    >
      {fmt(value)}
    </td>
  );
}
