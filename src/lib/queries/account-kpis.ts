/**
 * Busca KPIs agregados da conta IG pra um período arbitrário, direto
 * da IG Insights API. Usado pra que os KPIs do topo respondam ao
 * seletor de período (em vez de mostrar o valor fixo do último snapshot).
 *
 * Cache: cada fetch usa next.revalidate=300 (5min), então mesma combinação
 * de account+período é deduplicada em renders próximos.
 */
import "server-only";
import { decryptToken } from "@/lib/crypto";
import {
  contextForAccount,
  getAccountInsights,
  getAccountMetricWithProductTypeBreakdown,
  readInsightValue,
  type GraphContext,
} from "@/lib/instagram/api";

export type AccountKpisForPeriod = {
  reach: number | null;
  views: number | null;
  total_interactions: number | null;
  /**
   * Toques nos botões CTA business (Ligar, Email, Endereço, SMS). NÃO inclui
   * link da bio — esse é `website_clicks`.
   */
  profile_links_taps: number | null;
  /** Toques no link da bio (= "Toques no link" do Reportei). */
  website_clicks: number | null;
  paid_reach: number | null;
  paid_views: number | null;
  paid_total_interactions: number | null;
  organic_reach: number | null;
  organic_views: number | null;
  organic_total_interactions: number | null;
};

const EMPTY: AccountKpisForPeriod = {
  reach: null,
  views: null,
  total_interactions: null,
  profile_links_taps: null,
  website_clicks: null,
  paid_reach: null,
  paid_views: null,
  paid_total_interactions: null,
  organic_reach: null,
  organic_views: null,
  organic_total_interactions: null,
};

function decryptAccountToken(blob: unknown): string {
  let buffer: Buffer;
  if (typeof blob === "string") {
    const hex = blob.startsWith("\\x") ? blob.slice(2) : blob;
    buffer = Buffer.from(hex, "hex");
  } else {
    buffer = Buffer.from(blob as Uint8Array);
  }
  return decryptToken(buffer);
}

export async function fetchAccountKpisForPeriod(
  account: {
    access_token_encrypted: unknown;
    auth_method: "business_login" | "facebook_login";
    ig_user_id: string;
  },
  start: Date,
  end: Date,
): Promise<AccountKpisForPeriod> {
  let token: string;
  try {
    token = decryptAccountToken(account.access_token_encrypted);
  } catch {
    return EMPTY;
  }

  const ctx: GraphContext = contextForAccount(account);
  // Meta API limita o range a 30 dias EXATOS (2592000s) entre since/until.
  // resolvePeriod("30d") dá 30 dias + 23h59min (startOfDay zera horas,
  // endOfDay vai até 23:59:59) ≈ 31 dias, que dispara erro #100.
  // Capeia em 30d ajustando o since pra trás (mantém o final do período).
  const MAX_RANGE_SEC = 30 * 86400;
  const untilRaw = Math.floor(end.getTime() / 1000);
  const sinceRaw = Math.floor(start.getTime() / 1000);
  const until = untilRaw;
  const since = Math.max(sinceRaw, untilRaw - MAX_RANGE_SEC);

  // 5 chamadas em paralelo — 3 com breakdown e 2 sem
  // (profile_links_taps + website_clicks são pedidas separadas porque
  // websiteclicks é depreciada na docs mas ainda retorna pra contas BUSINESS,
  // e profile_links_taps NÃO inclui link da bio).
  const [
    reachBd,
    viewsBd,
    interactionsBd,
    linkTapsInsights,
    websiteClicksInsights,
  ] = await Promise.all([
    getAccountMetricWithProductTypeBreakdown(
      token,
      "reach",
      { since, until },
      ctx,
    ),
    getAccountMetricWithProductTypeBreakdown(
      token,
      "views",
      { since, until },
      ctx,
    ),
    getAccountMetricWithProductTypeBreakdown(
      token,
      "total_interactions",
      { since, until },
      ctx,
    ),
    getAccountInsights(
      token,
      ["profile_links_taps"],
      { since, until },
      ctx,
    ).catch(() => []),
    getAccountInsights(
      token,
      ["website_clicks"],
      { since, until },
      ctx,
    ).catch(() => []),
  ]);

  const linkTaps = readInsightValue(linkTapsInsights[0]);
  const websiteClicks = readInsightValue(websiteClicksInsights[0]);

  return {
    reach: reachBd?.total ?? null,
    views: viewsBd?.total ?? null,
    total_interactions: interactionsBd?.total ?? null,
    profile_links_taps: linkTaps,
    website_clicks: websiteClicks,
    paid_reach: reachBd?.paid ?? null,
    paid_views: viewsBd?.paid ?? null,
    paid_total_interactions: interactionsBd?.paid ?? null,
    organic_reach: reachBd?.organic ?? null,
    organic_views: viewsBd?.organic ?? null,
    organic_total_interactions: interactionsBd?.organic ?? null,
  };
}
