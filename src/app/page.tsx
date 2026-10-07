import Link from "next/link";
import { Bug } from "lucide-react";
import { BugReportForm } from "@/components/public/bug-report-form";
import { LangToggle } from "@/components/lang-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteName, siteTaglineEnv } from "@/lib/constants";
import { getLangAndDict } from "@/lib/i18n/server";

export default function HomePage() {
  const { lang, t } = getLangAndDict();
  const tagline = siteTaglineEnv || t.home.tagline;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm dark:bg-indigo-500">
            <Bug aria-hidden className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {siteName}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              {t.home.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LangToggle lang={lang} t={t.language} />
          <ThemeToggle toLight={t.theme.toLight} toDark={t.theme.toDark} />
        </div>
      </header>

      <p className="mb-6 leading-relaxed text-zinc-600 dark:text-zinc-300">
        {tagline}
      </p>

      <BugReportForm t={t} />

      <footer className="mt-8 text-center text-sm text-zinc-500">
        {t.home.footerPrefix}{" "}
        <Link
          href="/status"
          className="font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
        >
          {t.home.footerLink}
        </Link>
      </footer>
    </main>
  );
}
