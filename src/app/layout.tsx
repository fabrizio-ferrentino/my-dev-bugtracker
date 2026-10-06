import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { siteName } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `Report an issue | ${siteName}`,
    template: `%s | ${siteName}`,
  },
  description: "Report a bug or an issue you found in the application.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
