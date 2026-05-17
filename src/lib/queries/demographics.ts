import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

export type DemographicRow =
  Database["public"]["Tables"]["audience_demographics"]["Row"];
export type AudienceType = "follower" | "reached" | "engaged";
export type Breakdown = "age" | "gender" | "city" | "country";

/**
 * Busca o snapshot mais recente de demographics da conta, agrupado por
 * audience_type × breakdown. Retorna { follower: { age: {...}, gender: {...}, city: {...}, country: {...} }, ... }
 */
export type GroupedDemographics = Partial<
  Record<AudienceType, Partial<Record<Breakdown, Record<string, number>>>>
>;

export async function getLatestDemographics(
  supabase: DB,
  igAccountId: string,
): Promise<GroupedDemographics> {
  const { data, error } = await supabase
    .from("audience_demographics")
    .select("*")
    .eq("ig_account_id", igAccountId)
    .order("snapshot_date", { ascending: false });

  if (error || !data || data.length === 0) return {};

  // Pega snapshot mais recente
  const latestDate = data[0].snapshot_date;
  const latest = data.filter((r) => r.snapshot_date === latestDate);

  const grouped: GroupedDemographics = {};
  for (const row of latest) {
    const aud = row.audience_type as AudienceType;
    const brk = row.breakdown as Breakdown;
    if (!grouped[aud]) grouped[aud] = {};
    grouped[aud]![brk] = row.breakdown_values as Record<string, number>;
  }
  return grouped;
}

/**
 * Ordena um objeto {chave: valor} por valor descendente e pega top N.
 */
export function topEntries(
  values: Record<string, number> | undefined,
  limit = 10,
): Array<{ key: string; value: number }> {
  if (!values) return [];
  return Object.entries(values)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * Soma todos os valores de um breakdown (pra calcular percentuais).
 */
export function sumValues(
  values: Record<string, number> | undefined,
): number {
  if (!values) return 0;
  return Object.values(values).reduce((s, v) => s + v, 0);
}

/**
 * Mapeia código ISO de país pra emoji bandeira.
 */
export function countryFlag(iso: string): string {
  if (iso.length !== 2) return "🌐";
  const codePoints = iso
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - "A".charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Mapeia código ISO de país pra nome (português, principais países).
 */
const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil",
  AR: "Argentina",
  PY: "Paraguai",
  UY: "Uruguai",
  CL: "Chile",
  PE: "Peru",
  BO: "Bolívia",
  CO: "Colômbia",
  EC: "Equador",
  VE: "Venezuela",
  US: "Estados Unidos",
  CA: "Canadá",
  MX: "México",
  PT: "Portugal",
  ES: "Espanha",
  IT: "Itália",
  FR: "França",
  GB: "Reino Unido",
  DE: "Alemanha",
  JP: "Japão",
  CN: "China",
  IN: "Índia",
  AU: "Austrália",
  NZ: "Nova Zelândia",
  RU: "Rússia",
  ZA: "África do Sul",
  AO: "Angola",
  NG: "Nigéria",
};

export function countryName(iso: string): string {
  return COUNTRY_NAMES[iso.toUpperCase()] ?? iso;
}

/**
 * Mapeia gênero da API (F/M/U) pra label PT-BR.
 */
export function genderLabel(code: string): string {
  if (code === "F") return "Feminino";
  if (code === "M") return "Masculino";
  if (code === "U") return "Não informado";
  return code;
}

/**
 * Ordena faixas etárias (Instagram retorna em ordem variável).
 */
const AGE_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
export function sortAgeBuckets(
  values: Record<string, number> | undefined,
): Array<{ key: string; value: number }> {
  if (!values) return [];
  return AGE_ORDER.filter((k) => k in values).map((k) => ({
    key: k,
    value: values[k],
  }));
}
