import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// IvyPresto Display — voz tipográfica oficial da marca Studio Baires
const ivyPresto = localFont({
  src: [
    {
      path: "../../public/fonts/IvyPrestoDisplay-Thin.otf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../public/fonts/IvyPrestoDisplay-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/IvyPrestoDisplay-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/IvyPrestoDisplay-SemiBold.otf",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-ivypresto",
  display: "swap",
});

// Plus Jakarta Sans — fallback geométrica próxima da JUST Sans
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Inter — usada apenas no dark scope (/dashboard/contas/[handle])
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Studio Baires — Métricas que parecem revista",
  description:
    "Análise de Instagram para agências que entregam relatórios com cara de editorial, não de planilha.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${ivyPresto.variable} ${jakarta.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
