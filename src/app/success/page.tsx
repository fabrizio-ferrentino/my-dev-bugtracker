import Link from "next/link";
import { ArrowLeft, CheckCircle2, Link2 } from "lucide-react";
import { NavigatingLink } from "@/components/navigating-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  searchParams: { ticket?: string; token?: string };
}

export const metadata = { title: "Report received" };

export default function SuccessPage({ searchParams }: Props) {
  const ticket = searchParams.ticket ?? "";
  const token = searchParams.token ?? "";
  const statusHref = token ? `/status?token=${encodeURIComponent(token)}` : "/status";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 py-10">
      <NavigatingLink
        href="/"
        overlayText="Loading…"
        className="mb-4 inline-flex items-center gap-1 self-start text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to home
      </NavigatingLink>
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <CheckCircle2 aria-hidden className="size-12 text-emerald-600" />
          <CardTitle className="text-2xl">Report received</CardTitle>
          <CardDescription>
            Thanks — your report has been saved and will be reviewed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {ticket && (
            <p className="rounded-md bg-slate-100 px-4 py-2 font-mono text-lg font-bold tracking-wide dark:bg-slate-800">
              {ticket}
            </p>
          )}
          {token ? (
            <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Link2 aria-hidden className="mt-0.5 size-4 shrink-0" />
              Save your personal status link — it is the only way to check
              this report later:
            </p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3">
            {token && (
              <Link href={statusHref} className={cn(buttonVariants())}>
                Check status
              </Link>
            )}
            <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
              Send another report
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
