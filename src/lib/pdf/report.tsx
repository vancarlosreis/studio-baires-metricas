import path from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Font,
  StyleSheet,
  Svg,
  Path,
  Polygon,
} from "@react-pdf/renderer";

// ============================================================================
// Fonts
// ============================================================================
const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "IvyPresto",
  fonts: [
    { src: path.join(FONTS_DIR, "IvyPrestoDisplay-Light.otf"), fontWeight: 300 },
    { src: path.join(FONTS_DIR, "IvyPrestoDisplay-Regular.otf"), fontWeight: 400 },
    { src: path.join(FONTS_DIR, "IvyPrestoDisplay-SemiBold.otf"), fontWeight: 600 },
  ],
});

// Hyphenation desativa pra preservar layout editorial
Font.registerHyphenationCallback((word) => [word]);

// ============================================================================
// Theme
// ============================================================================
const COLORS = {
  cream: "#ECE3D0",
  paper: "#F5EDD9",
  forest: "#2F4A35",
  burgundy: "#8B2C2C",
  ink: "#2A1F18",
  inkSoft: "#5A4A3A",
  tape: "#F4D35E",
  accentRed: "#C73E2C",
  border: "rgba(42, 31, 24, 0.12)",
};

// ============================================================================
// Helpers
// ============================================================================
function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toString();
}

function formatPeriod(start: Date, end: Date): string {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  // Se for o mesmo mês, formato curto
  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return `${months[start.getMonth()]} · ${start.getFullYear()}`;
  }
  return `${months[start.getMonth()]}/${start.getFullYear()} → ${months[end.getMonth()]}/${end.getFullYear()}`;
}

function pct(diff: number | null | undefined): string {
  if (diff == null) return "—";
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}%`;
}

// ============================================================================
// Data shape
// ============================================================================
export type ReportData = {
  accountName: string;
  accountHandle: string;
  profilePictureUrl?: string | null;
  accountType?: string | null;
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;

  kpis: {
    followers: number | null;
    followersDelta?: number | null; // % vs período anterior
    reach: number | null;
    engaged: number | null;
    interactions: number | null;
    mediaCountInPeriod: number;
  };

  topPosts: Array<{
    permalink: string | null;
    thumbnailUrl: string | null;
    caption: string | null;
    kind: string;
    productType?: string | null;
    likes: number | null;
    comments: number | null;
    saves: number | null;
    reach: number | null;
    totalInteractions: number | null;
  }>;
};

// ============================================================================
// Components
// ============================================================================

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.cream,
    padding: 48,
    color: COLORS.ink,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
  },
  // Header / wordmark
  wordmark: {
    fontFamily: "IvyPresto",
    fontWeight: 600,
    fontSize: 18,
    color: COLORS.ink,
  },
});

function Sparkle({
  size = 16,
  color = COLORS.forest,
  top,
  bottom,
  left,
  right,
}: {
  size?: number;
  color?: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ position: "absolute", top, bottom, left, right }}
    >
      <Polygon
        points="12,0 13.5,9.5 24,12 13.5,14.5 12,24 10.5,14.5 0,12 10.5,9.5"
        fill={color}
      />
    </Svg>
  );
}

function PaperGrid() {
  // Pequeno grid sutil — uns 8 linhas horizontais + 6 verticais
  return (
    <Svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
      viewBox="0 0 595 842"
    >
      {[...Array(35)].map((_, i) => (
        <Path
          key={`h-${i}`}
          d={`M0 ${(i + 1) * 24} L595 ${(i + 1) * 24}`}
          stroke="rgba(42,31,24,0.04)"
          strokeWidth="1"
        />
      ))}
      {[...Array(25)].map((_, i) => (
        <Path
          key={`v-${i}`}
          d={`M${(i + 1) * 24} 0 L${(i + 1) * 24} 842`}
          stroke="rgba(42,31,24,0.04)"
          strokeWidth="1"
        />
      ))}
    </Svg>
  );
}

// ============================================================================
// Page 1 — Cover
// ============================================================================
function CoverPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={styles.page}>
      <PaperGrid />
      <Sparkle size={28} color={COLORS.forest} top={64} right={72} />
      <Sparkle size={20} color={COLORS.accentRed} top={110} right={130} />
      <Sparkle size={22} color={COLORS.burgundy} bottom={200} left={64} />

      {/* Topo */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Text style={styles.wordmark}>Studio Baires</Text>
        <Text
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 2,
            color: COLORS.inkSoft,
          }}
        >
          RELATÓRIO MENSAL
        </Text>
      </View>

      {/* Centro */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          marginTop: -40,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 3,
            color: COLORS.inkSoft,
            marginBottom: 12,
          }}
        >
          MÉTRICAS DE
        </Text>
        <Text
          style={{
            fontFamily: "IvyPresto",
            fontWeight: 600,
            fontSize: 64,
            lineHeight: 1,
            color: COLORS.ink,
            marginBottom: 4,
          }}
        >
          {data.accountName}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: COLORS.inkSoft,
            marginBottom: 28,
          }}
        >
          @{data.accountHandle}
        </Text>
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            paddingTop: 16,
            width: 260,
          }}
        >
          <Text
            style={{
              fontFamily: "IvyPresto",
              fontWeight: 400,
              fontSize: 22,
              color: COLORS.burgundy,
            }}
          >
            {formatPeriod(data.periodStart, data.periodEnd)}
          </Text>
        </View>
      </View>

      {/* Rodapé */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <Text style={{ fontSize: 8, color: COLORS.inkSoft }}>
          Gerado em {data.generatedAt.toLocaleDateString("pt-BR")}
        </Text>
        <Text
          style={{
            fontSize: 8,
            color: COLORS.inkSoft,
            fontStyle: "italic",
          }}
        >
          studio-baires-metricas.com
        </Text>
      </View>
    </Page>
  );
}

// ============================================================================
// Page 2 — KPIs do período
// ============================================================================
function KpiPage({ data }: { data: ReportData }) {
  const k = data.kpis;
  return (
    <Page size="A4" style={styles.page}>
      <PaperGrid />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <Text style={styles.wordmark}>Studio Baires</Text>
        <Text style={{ fontSize: 9, color: COLORS.inkSoft }}>
          @{data.accountHandle} · {formatPeriod(data.periodStart, data.periodEnd)}
        </Text>
      </View>

      {/* Title */}
      <Text
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 3,
          color: COLORS.inkSoft,
          marginBottom: 8,
        }}
      >
        O MÊS EM
      </Text>
      <Text
        style={{
          fontFamily: "IvyPresto",
          fontWeight: 600,
          fontSize: 56,
          lineHeight: 1,
          color: COLORS.ink,
          marginBottom: 36,
        }}
      >
        Números.
      </Text>

      {/* KPI grid */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <KpiBox
          label="Seguidores"
          value={formatNumber(k.followers)}
          hint={k.followersDelta != null ? pct(k.followersDelta) : undefined}
          color={COLORS.ink}
        />
        <KpiBox
          label="Alcance (7d)"
          value={formatNumber(k.reach)}
          color={COLORS.forest}
        />
        <KpiBox
          label="Contas engajadas (7d)"
          value={formatNumber(k.engaged)}
          color={COLORS.forest}
        />
        <KpiBox
          label="Interações (7d)"
          value={formatNumber(k.interactions)}
          color={COLORS.burgundy}
        />
        <KpiBox
          label="Posts no período"
          value={String(k.mediaCountInPeriod)}
          color={COLORS.ink}
        />
      </View>

      {/* Comentário editorial */}
      <View
        style={{
          marginTop: 48,
          paddingTop: 24,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <Text
          style={{
            fontFamily: "IvyPresto",
            fontWeight: 400,
            fontSize: 18,
            lineHeight: 1.4,
            color: COLORS.ink,
            marginBottom: 12,
          }}
        >
          Resumo do período
        </Text>
        <Text style={{ fontSize: 11, color: COLORS.inkSoft, lineHeight: 1.6 }}>
          O perfil <Text style={{ fontWeight: 700 }}>@{data.accountHandle}</Text>{" "}
          publicou {k.mediaCountInPeriod}{" "}
          {k.mediaCountInPeriod === 1 ? "conteúdo" : "conteúdos"} no período
          analisado, alcançando {formatNumber(k.reach)} pessoas únicas e gerando{" "}
          {formatNumber(k.interactions)} interações totais. O engajamento ativo
          foi de {formatNumber(k.engaged)} contas únicas — a base de potenciais
          seguidores que pode ser convertida nos próximos ciclos.
        </Text>
      </View>
    </Page>
  );
}

function KpiBox({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  color: string;
}) {
  return (
    <View
      style={{
        width: "31%",
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        backgroundColor: COLORS.paper,
        padding: 18,
      }}
    >
      <Text
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 1.5,
          color: COLORS.inkSoft,
          marginBottom: 8,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          fontFamily: "IvyPresto",
          fontWeight: 600,
          fontSize: 36,
          lineHeight: 1,
          color,
        }}
      >
        {value}
      </Text>
      {hint && (
        <Text
          style={{
            fontSize: 9,
            color: COLORS.inkSoft,
            marginTop: 6,
          }}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// Page 3 — Top posts
// ============================================================================
function TopPostsPage({ data }: { data: ReportData }) {
  if (data.topPosts.length === 0) return null;

  return (
    <Page size="A4" style={styles.page}>
      <PaperGrid />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <Text style={styles.wordmark}>Studio Baires</Text>
        <Text style={{ fontSize: 9, color: COLORS.inkSoft }}>
          @{data.accountHandle} · {formatPeriod(data.periodStart, data.periodEnd)}
        </Text>
      </View>

      <Text
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 3,
          color: COLORS.inkSoft,
          marginBottom: 8,
        }}
      >
        OS POSTS QUE MAIS
      </Text>
      <Text
        style={{
          fontFamily: "IvyPresto",
          fontWeight: 600,
          fontSize: 56,
          lineHeight: 1,
          color: COLORS.burgundy,
          marginBottom: 36,
        }}
      >
        Bombaram.
      </Text>

      <View style={{ gap: 16 }}>
        {data.topPosts.slice(0, 4).map((p, i) => (
          <TopPostRow key={i} post={p} rank={i + 1} />
        ))}
      </View>
    </Page>
  );
}

function TopPostRow({
  post,
  rank,
}: {
  post: ReportData["topPosts"][number];
  rank: number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        backgroundColor: COLORS.paper,
        padding: 14,
      }}
    >
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 8,
          backgroundColor: "rgba(42,31,24,0.08)",
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {post.thumbnailUrl ? (
          <Image
            src={post.thumbnailUrl}
            style={{ width: 88, height: 88, objectFit: "cover" }}
          />
        ) : (
          <Text style={{ color: COLORS.inkSoft }}>—</Text>
        )}
      </View>

      <View style={{ flex: 1, justifyContent: "space-between" }}>
        <View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                fontFamily: "IvyPresto",
                fontWeight: 600,
                fontSize: 22,
                color: COLORS.ink,
              }}
            >
              #{rank}
            </Text>
            <View
              style={{
                backgroundColor: COLORS.ink,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
              }}
            >
              <Text
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: COLORS.cream,
                }}
              >
                {post.productType === "REELS" ? "REEL" : post.kind === "CAROUSEL_ALBUM" ? "CARROSSEL" : "POST"}
              </Text>
            </View>
          </View>
          <Text
            style={{
              fontSize: 9,
              color: COLORS.inkSoft,
              lineHeight: 1.4,
            }}
          >
            {(post.caption ?? "").slice(0, 140)}
            {(post.caption ?? "").length > 140 ? "…" : ""}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 16,
            marginTop: 8,
          }}
        >
          <MetricMini label="Alcance" value={formatNumber(post.reach)} />
          <MetricMini label="Curtidas" value={formatNumber(post.likes)} />
          <MetricMini label="Coments" value={formatNumber(post.comments)} />
          <MetricMini label="Salvos" value={formatNumber(post.saves)} />
          <MetricMini
            label="Interações"
            value={formatNumber(post.totalInteractions)}
            highlight
          />
        </View>
      </View>
    </View>
  );
}

function MetricMini({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: 7,
          fontWeight: 700,
          letterSpacing: 1,
          color: COLORS.inkSoft,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          fontFamily: "IvyPresto",
          fontWeight: 600,
          fontSize: 16,
          color: highlight ? COLORS.forest : COLORS.ink,
          marginTop: 2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================================
// Page 4 — Back cover
// ============================================================================
function BackCoverPage() {
  return (
    <Page size="A4" style={styles.page}>
      <PaperGrid />

      <Sparkle size={32} color={COLORS.forest} top={100} left={80} />
      <Sparkle size={20} color={COLORS.accentRed} top={140} left={130} />
      <Sparkle size={24} color={COLORS.burgundy} bottom={200} right={80} />

      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 9,
            letterSpacing: 4,
            color: COLORS.inkSoft,
            marginBottom: 16,
          }}
        >
          FEITO COM CUIDADO POR
        </Text>
        <Text
          style={{
            fontFamily: "IvyPresto",
            fontWeight: 600,
            fontSize: 80,
            lineHeight: 1,
            color: COLORS.ink,
          }}
        >
          Studio
        </Text>
        <Text
          style={{
            fontFamily: "IvyPresto",
            fontWeight: 600,
            fontSize: 80,
            lineHeight: 1,
            color: COLORS.burgundy,
          }}
        >
          Baires.
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: COLORS.inkSoft,
            marginTop: 36,
            fontStyle: "italic",
          }}
        >
          Métricas de Instagram que parecem revista.
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <Text style={{ fontSize: 8, color: COLORS.inkSoft }}>
          © {new Date().getFullYear()} Studio Baires
        </Text>
        <Text
          style={{
            fontSize: 8,
            color: COLORS.inkSoft,
            fontStyle: "italic",
          }}
        >
          Made in Brasil
        </Text>
      </View>
    </Page>
  );
}

// ============================================================================
// Document principal
// ============================================================================
export function MonthlyReport({ data }: { data: ReportData }) {
  return (
    <Document
      title={`Studio Baires · ${data.accountName} · ${formatPeriod(data.periodStart, data.periodEnd)}`}
      author="Studio Baires"
    >
      <CoverPage data={data} />
      <KpiPage data={data} />
      {data.topPosts.length > 0 && <TopPostsPage data={data} />}
      <BackCoverPage />
    </Document>
  );
}
