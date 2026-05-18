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
  profile_links_taps: number | null;
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
  const since = Math.floor(start.getTime() / 1000);
  const until = Math.floor(end.getTime() / 1000);

  // 4 chamadas em paralelo — 3 com breakdown e 1 sem (profile_links_taps)
  const [reachBd, viewsBd, interactionsBd, linkTapsInsights] = await Promise.all(
    [
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
    ],
  );

  const linkTaps = readInsightValue(linkTapsInsights[0]);

  return {
    reach: reachBd?.total ?? null,
    views: viewsBd?.total ?? null,
    total_interactions: interactionsBd?.total ?? null,
    profile_links_taps: linkTaps,
    paid_reach: reachBd?.paid ?? null,
    paid_views: viewsBd?.paid ?? null,
    paid_total_interactions: interactionsBd?.paid ?? null,
    organic_reach: reachBd?.organic ?? null,
    organic_views: viewsBd?.organic ?? null,
    organic_total_interactions: interactionsBd?.organic ?? null,
  };
}
