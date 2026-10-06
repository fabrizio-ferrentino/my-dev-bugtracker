import Link from "next/link";
import { Bug } from "lucide-react";
import { BugReportForm } from "@/components/public/bug-report-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteName, siteTagline } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900">
            <Bug aria-hidden className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {siteName}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              Report an issue
            </h1>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <p className="mb-6 text-slate-600 dark:text-slate-300">{siteTagline}</p>

      <BugReportForm />

      <footer className="mt-8 text-center text-sm text-slate-500">
        Already reported something?{" "}
        <Link href="/status" className="font-medium underline underline-offset-4">
          Check its status
        </Link>
      </footer>
    </main>
  );
}
