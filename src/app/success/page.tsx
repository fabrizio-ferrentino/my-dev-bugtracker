import { CheckCircle2, Link2 } from "lucide-react";
import { CopyLinkButton } from "@/components/public/copy-link-button";
import { NavigatingLink } from "@/components/navigating-link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appUrl } from "@/lib/constants";
import { getLangAndDict } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

interface Props {
  searchParams: { ticket?: string; token?: string };
}

export async function generateMetadata() {
  const { t } = getLangAndDict();
  return { title: t.meta.successTitle };
}

export default function SuccessPage({ searchParams }: Props) {
  const { t } = getLangAndDict();
  const ticket = searchParams.ticket ?? "";
  const token = searchParams.token ?? "";
  const statusHref = token ? `/status?token=${encodeURIComponent(token)}` : "/status";
  const statusUrl = token ? `${appUrl}/status?token=${token}` : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 py-10">
      <NavigatingLink
        href="/"
        overlayText={t.dashboard.loading}
        className="mb-4 inline-flex items-center gap-1 self-start text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <span aria-hidden>←</span> {t.success.backHome}
      </NavigatingLink>
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
            <CheckCircle2 aria-hidden className="size-7 text-emerald-600 dark:text-emerald-400" />
          </span>
          <CardTitle className="mt-2 text-2xl">{t.success.title}</CardTitle>
          <CardDescription>{t.success.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {ticket && (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-2 font-mono text-lg font-bold tracking-wide dark:border-zinc-700 dark:bg-zinc-900">
              {ticket}
            </p>
          )}
          {token && (
            <>
              <p className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <Link2 aria-hidden className="mt-0.5 size-4 shrink-0" />
                {t.success.saveLink}
              </p>
              <CopyLinkButton
                url={statusUrl}
                copyLabel={t.success.copyLink}
                copiedLabel={t.success.copied}
              />
            </>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            {token && (
              <NavigatingLink
                href={statusHref}
                overlayText={t.dashboard.loading}
                className={cn(buttonVariants())}
              >
                {t.success.checkStatus}
              </NavigatingLink>
            )}
            <NavigatingLink
              href="/"
              overlayText={t.dashboard.loading}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {t.success.sendAnother}
            </NavigatingLink>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
