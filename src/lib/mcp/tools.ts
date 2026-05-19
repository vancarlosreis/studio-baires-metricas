/**
 * Tools MCP — definição (schema JSONSchema) + handler.
 *
 * As tools são pensadas pro Claude conversar com a plataforma:
 * - list_accounts / sync_account: descoberta + atualização
 * - get_account_overview / list_top_posts / list_stories / get_demographics
 *   / get_evolution: consultas analíticas
 * - list_recent_syncs: diagnóstico
 *
 * Cada handler retorna um objeto JSON-serializável (não string formatada),
 * pra que o Claude tenha estrutura clara pra analisar.
 */
import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getIgAccountByHandle,
  listAccountSnapshots,
  listMediaWithInsights,
  countMediaByType,
} from "@/lib/queries/ig-accounts";
import { getLatestDemographics } from "@/lib/queries/demographics";
import { getMediaAggregates } from "@/lib/queries/aggregates";
import { getPaidAggregatesForPeriod } from "@/lib/queries/paid";
import {
  fetchAccountKpisForPeriod,
  fetchAccountMetricDailySeries,
} from "@/lib/queries/account-kpis";
import {
  listStoriesForPeriod,
  getStoriesAggregates,
} from "@/lib/queries/stories";
import { syncAccountFull } from "@/app/actions/sync";
import { resolvePeriod } from "@/lib/period";

export type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
};

function periodFromArgs(args: Record<string, unknown>) {
  const period = (args.period as string | undefined) ?? "30d";
  const customStart = args.custom_start as string | undefined;
  const customEnd = args.custom_end as string | undefined;
  return resolvePeriod(period, customStart, customEnd);
}

async function requireAccount(handle: string) {
  const supabase = createServiceClient();
  const account = await getIgAccountByHandle(supabase, handle);
  if (!account) throw new Error(`Conta não encontrada: ${handle}`);
  return { supabase, account };
}

// ============================================================================
// Tools
// ============================================================================

export const TOOLS: ToolDef[] = [
  {
    name: "list_accounts",
    description:
      "Lista todas as contas Instagram conectadas à plataforma. Retorna handle, nome, tipo da conta, último sync, e contadores básicos (followers, posts).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("ig_accounts")
        .select(
          "id, ig_username, ig_account_name, account_type, auth_method, last_synced_at, created_at",
        )
        .order("ig_username", { ascending: true });
      if (error) throw new Error(error.message);

      // Anexa último snapshot (pra ter followers/posts atuais sem consulta extra)
      const ids = (data ?? []).map((a) => a.id);
      let snapshots: Record<
        string,
        { followers: number | null; media_count: number | null }
      > = {};
      if (ids.length > 0) {
        const { data: snaps } = await supabase
          .from("account_snapshots")
          .select("ig_account_id, followers_count, media_count, snapshot_date")
          .in("ig_account_id", ids)
          .order("snapshot_date", { ascending: false });
        for (const s of snaps ?? []) {
          if (!snapshots[s.ig_account_id]) {
            snapshots[s.ig_account_id] = {
              followers: s.followers_count,
              media_count: s.media_count,
            };
          }
        }
      }

      return {
        accounts: (data ?? []).map((a) => ({
          handle: a.ig_username,
          name: a.ig_account_name,
          account_type: a.account_type,
          auth_method: a.auth_method,
          last_synced_at: a.last_synced_at,
          connected_at: a.created_at,
          followers: snapshots[a.id]?.followers ?? null,
          posts: snapshots[a.id]?.media_count ?? null,
        })),
      };
    },
  },

  {
    name: "sync_account",
    description:
      "Força sync completo de uma conta IG: perfil, métricas, posts, stories e tráfego pago. Pode demorar 20-60s. Use antes de pedir análise se 'last_synced_at' estiver desatualizado.",
    inputSchema: {
      type: "object",
      properties: {
        handle: {
          type: "string",
          description: "Username Instagram (sem @). Ex: 'duda.macedogr'",
        },
      },
      required: ["handle"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const handle = String(args.handle);
      const { account } = await requireAccount(handle);
      const result = await syncAccountFull(account.id);
      return {
        ok: result.ok,
        error: result.error ?? null,
        warnings: result.warnings,
        synced_at: new Date().toISOString(),
      };
    },
  },

  {
    name: "get_account_overview",
    description:
      "Snapshot completo de uma conta no período: perfil + KPIs (alcance, visualizações, interações, toques no link) + breakdown orgânico vs pago + agregados de feed e reels. Use isso primeiro pra ter contexto antes de aprofundar.",
    inputSchema: {
      type: "object",
      properties: {
        handle: { type: "string" },
        period: {
          type: "string",
          description: "Período pré-definido: '7d', '30d', '90d', 'custom'. Default '30d'.",
          enum: ["7d", "30d", "90d", "custom"],
        },
        custom_start: {
          type: "string",
          description: "ISO date (YYYY-MM-DD). Obrigatório se period='custom'.",
        },
        custom_end: { type: "string", description: "ISO date (YYYY-MM-DD)." },
      },
      required: ["handle"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const handle = String(args.handle);
      const { supabase, account } = await requireAccount(handle);
      const period = periodFromArgs(args);

      const [kpis, feedAgg, reelsAgg, storiesAgg, paidFeed, paidReels, snapshots] =
        await Promise.all([
          fetchAccountKpisForPeriod(account, period.start, period.end),
          getMediaAggregates(supabase, account.id, "FEED", period.start, period.end),
          getMediaAggregates(supabase, account.id, "REELS", period.start, period.end),
          getStoriesAggregates(supabase, account.id, period.start, period.end),
          getPaidAggregatesForPeriod(supabase, account.id, period.start, period.end, "FEED"),
          getPaidAggregatesForPeriod(supabase, account.id, period.start, period.end, "REELS"),
          listAccountSnapshots(supabase, account.id, 60),
        ]);

      const latest = snapshots[snapshots.length - 1];

      return {
        account: {
          handle: account.ig_username,
          name: account.ig_account_name,
          account_type: account.account_type,
          last_synced_at: account.last_synced_at,
        },
        period: {
          label: period.label,
          start: period.start.toISOString(),
          end: period.end.toISOString(),
        },
        current_followers: latest?.followers_count ?? null,
        account_kpis: kpis,
        feed: { ...feedAgg, paid: paidFeed },
        reels: { ...reelsAgg, paid: paidReels },
        stories: storiesAgg,
      };
    },
  },

  {
    name: "list_top_posts",
    description:
      "Lista posts (feed/reels) do período ordenados por uma métrica. Inclui todas as interações (likes, comments, saves, shares, reposts), reach, views, profile_visits, follows.",
    inputSchema: {
      type: "object",
      properties: {
        handle: { type: "string" },
        period: { type: "string", enum: ["7d", "30d", "90d", "custom"] },
        custom_start: { type: "string" },
        custom_end: { type: "string" },
        product_type: {
          type: "string",
          description: "Filtra por tipo. 'FEED' (posts) ou 'REELS'. Omitir = ambos.",
          enum: ["FEED", "REELS"],
        },
        sort_by: {
          type: "string",
          description: "Métrica de ordenação. Default 'reach'.",
          enum: [
            "reach",
            "views",
            "total_interactions",
            "likes",
            "comments",
            "saves",
            "shares",
            "reposts",
            "profile_visits",
            "follows",
          ],
        },
        limit: {
          type: "number",
          description: "Quantos retornar (max 50). Default 10.",
        },
      },
      required: ["handle"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const handle = String(args.handle);
      const { supabase, account } = await requireAccount(handle);
      const period = periodFromArgs(args);
      const productType = args.product_type as "FEED" | "REELS" | undefined;
      const sortBy = (args.sort_by as string | undefined) ?? "reach";
      const limit = Math.min(Number(args.limit ?? 10), 50);

      const all = await listMediaWithInsights(supabase, account.id, {
        limit: 200,
        productType,
      });
      const inPeriod = all.filter((m) => {
        const t = new Date(m.posted_at).getTime();
        return t >= period.start.getTime() && t <= period.end.getTime();
      });

      const getValue = (m: (typeof inPeriod)[number], key: string): number => {
        const i = m.latest_insight;
        if (!i) return 0;
        const v = (i as unknown as Record<string, unknown>)[key];
        return typeof v === "number" ? v : 0;
      };

      inPeriod.sort((a, b) => getValue(b, sortBy) - getValue(a, sortBy));

      return {
        period: {
          label: period.label,
          start: period.start.toISOString(),
          end: period.end.toISOString(),
        },
        sort_by: sortBy,
        total_in_period: inPeriod.length,
        posts: inPeriod.slice(0, limit).map((m) => {
          const i = m.latest_insight;
          return {
            ig_media_id: m.ig_media_id,
            type: m.media_product_type ?? m.kind,
            posted_at: m.posted_at,
            permalink: m.permalink,
            caption: m.caption?.slice(0, 280) ?? null,
            metrics: {
              reach: i?.reach ?? null,
              views: i?.views ?? null,
              total_interactions: i?.total_interactions ?? null,
              likes: i?.likes ?? null,
              comments: i?.comments ?? null,
              saves: i?.saves ?? null,
              shares: i?.shares ?? null,
              reposts: i?.reposts ?? null,
              profile_visits: i?.profile_visits ?? null,
              follows: i?.follows ?? null,
            },
          };
        }),
      };
    },
  },

  {
    name: "list_stories",
    description:
      "Lista stories do período com todas as métricas: visualizações, alcance, interações, visitas ao perfil, respostas, compartilhamentos, navegação (avançar/voltar/sair/próximo) e retenção calculada.",
    inputSchema: {
      type: "object",
      properties: {
        handle: { type: "string" },
        period: { type: "string", enum: ["7d", "30d", "90d", "custom"] },
        custom_start: { type: "string" },
        custom_end: { type: "string" },
      },
      required: ["handle"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const handle = String(args.handle);
      const { supabase, account } = await requireAccount(handle);
      const period = periodFromArgs(args);

      const [stories, agg] = await Promise.all([
        listStoriesForPeriod(supabase, account.id, period.start, period.end, 200),
        getStoriesAggregates(supabase, account.id, period.start, period.end),
      ]);

      return {
        period: {
          label: period.label,
          start: period.start.toISOString(),
          end: period.end.toISOString(),
        },
        aggregates: agg,
        stories: stories.map((s) => {
          const retention =
            s.reach && s.reach > 0
              ? Math.max(
                  0,
                  (s.reach - (s.exits ?? 0) - (s.swipe_forward ?? 0)) / s.reach,
                )
              : null;
          return {
            ig_media_id: s.ig_media_id,
            posted_at: s.posted_at,
            permalink: s.permalink,
            caption: s.caption?.slice(0, 200) ?? null,
            media_type: s.media_type,
            metrics: {
              views: s.views,
              reach: s.reach,
              total_interactions: s.total_interactions,
              profile_visits: s.profile_visits,
              replies: s.replies,
              shares: s.shares,
              taps_forward: s.taps_forward,
              taps_back: s.taps_back,
              swipe_forward: s.swipe_forward,
              exits: s.exits,
              navigation_total: s.navigation,
              retention,
            },
          };
        }),
      };
    },
  },

  {
    name: "get_demographics",
    description:
      "Demografia da audiência: seguidores, alcançados, engajados — quebrados por idade, gênero, cidade e país. Útil pra recomendações de público.",
    inputSchema: {
      type: "object",
      properties: { handle: { type: "string" } },
      required: ["handle"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const handle = String(args.handle);
      const { supabase, account } = await requireAccount(handle);
      const demo = await getLatestDemographics(supabase, account.id);
      return {
        follower: demo.follower ?? null,
        reached: demo.reached ?? null,
        engaged: demo.engaged ?? null,
      };
    },
  },

  {
    name: "get_evolution",
    description:
      "Série temporal diária de uma métrica account-level (reach, views, total_interactions). Útil pra identificar picos, tendências e correlacionar com ações de conteúdo.",
    inputSchema: {
      type: "object",
      properties: {
        handle: { type: "string" },
        metric: {
          type: "string",
          enum: ["reach", "views", "total_interactions"],
        },
        period: { type: "string", enum: ["7d", "30d", "90d", "custom"] },
        custom_start: { type: "string" },
        custom_end: { type: "string" },
      },
      required: ["handle", "metric"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const handle = String(args.handle);
      const metric = String(args.metric) as
        | "reach"
        | "views"
        | "total_interactions";
      const { account } = await requireAccount(handle);
      const period = periodFromArgs(args);
      const series = await fetchAccountMetricDailySeries(
        account,
        metric,
        period.start,
        period.end,
      );
      const total = series.reduce((s, p) => s + (p.value ?? 0), 0);
      const avg = series.length > 0 ? total / series.length : 0;
      const peak = series.reduce<{ date: string | null; value: number }>(
        (best, p) => (p.value > best.value ? { date: p.date, value: p.value } : best),
        { date: null, value: 0 },
      );
      return {
        period: {
          label: period.label,
          start: period.start.toISOString(),
          end: period.end.toISOString(),
        },
        metric,
        series,
        summary: { total, daily_average: avg, peak },
      };
    },
  },

  {
    name: "list_recent_syncs",
    description:
      "Histórico dos últimos jobs de sincronização (success/failed) — útil pra diagnosticar quando uma conta está desatualizada ou quando o sync falha consistentemente.",
    inputSchema: {
      type: "object",
      properties: {
        handle: {
          type: "string",
          description: "Filtra por conta. Omitir = todos.",
        },
        limit: { type: "number", description: "Default 20, max 100." },
      },
      additionalProperties: false,
    },
    handler: async (args) => {
      const supabase = createServiceClient();
      const limit = Math.min(Number(args.limit ?? 20), 100);
      const handle = args.handle as string | undefined;

      let igAccountId: string | undefined;
      if (handle) {
        const { account } = await requireAccount(handle);
        igAccountId = account.id;
      }

      let q = supabase
        .from("sync_jobs")
        .select(
          "id, ig_account_id, kind, status, started_at, finished_at, error_message, metadata",
        )
        .order("started_at", { ascending: false })
        .limit(limit);
      if (igAccountId) q = q.eq("ig_account_id", igAccountId);

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { jobs: data ?? [] };
    },
  },
];

export function findTool(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}
