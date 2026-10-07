import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import "./globals.css";
import { siteName } from "@/lib/constants";
import { getLangAndDict } from "@/lib/i18n/server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getLangAndDict();
  return {
    title: {
      default: `${t.meta.homeTitle} | ${siteName}`,
      template: `%s | ${siteName}`,
    },
    description: t.meta.homeDescription,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lang } = getLangAndDict();
  return (
    <html lang={lang} suppressHydrationWarning>
      <body
        className={`${inter.variable} min-h-screen bg-zinc-100 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
