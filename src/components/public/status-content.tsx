"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { NavigatingLink } from "@/components/navigating-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { PublicReply, PublicTicketInfo } from "@/types/bug";

interface StatusResponse {
  ticket?: Partial<PublicTicketInfo> & {
    ticket_number: string;
    status: PublicTicketInfo["status"];
    updated_at: string;
  };
  replies?: PublicReply[];
  limited?: boolean;
  hint?: string;
  error?: string;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function StatusContent({ t, locale }: { t: Dict; locale: string }) {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") ?? "";
  const [token, setToken] = useState(initialToken);
  const [ticketInput, setTicketInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StatusResponse | null>(null);
  const autoLoaded = useRef(false);

  async function lookup(url: string) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(url);
      const json = (await res.json()) as StatusResponse;
      setResult(json);
    } catch {
      setResult({ error: t.api.generic });
    } finally {
      setLoading(false);
    }
  }

  // Auto-load when opened via the personal status link.
  useEffect(() => {
    if (initialToken && !autoLoaded.current) {
      autoLoaded.current = true;
      void lookup(`/api/status?token=${encodeURIComponent(initialToken)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-10">
      <NavigatingLink
        href="/"
        overlayText={t.dashboard.loading}
        className="mb-4 inline-flex items-center gap-1 self-start text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t.success.backHome}
      </NavigatingLink>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t.statusPage.title}</CardTitle>
          <CardDescription>
            {initialToken ? t.statusPage.statusOf : t.statusPage.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!initialToken && (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (ticketInput.trim()) {
                  void lookup(
                    `/api/status?ticket=${encodeURIComponent(ticketInput.trim())}`,
                  );
                }
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="ticket">{t.statusPage.ticketLabel}</Label>
                <div className="flex gap-2">
                  <Input
                    id="ticket"
                    value={ticketInput}
                    onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                    placeholder="BUG-7K3M-Q9TD"
                    className="font-mono"
                    aria-describedby="ticket-hint"
                  />
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 aria-hidden className="animate-spin" />
                    ) : (
                      <Search aria-hidden />
                    )}
                    <span className="sr-only sm:not-sr-only">{t.statusPage.search}</span>
                  </Button>
                </div>
                <p id="ticket-hint" className="text-xs text-zinc-500">
                  {t.statusPage.ticketHint}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="token">{t.statusPage.tokenLabel}</Label>
                <div className="flex gap-2">
                  <Input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value.trim())}
                    placeholder={t.statusPage.tokenPlaceholder}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={loading || !token}
                    onClick={() =>
                      void lookup(`/api/status?token=${encodeURIComponent(token)}`)
                    }
                  >
                    {t.statusPage.open}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {loading && (
            <p className="flex items-center gap-2 text-sm text-zinc-500" role="status">
              <Loader2 aria-hidden className="animate-spin" /> {t.statusPage.loading}
            </p>
          )}

          {result?.error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-300">
              {result.error}
            </p>
          )}

          {result?.ticket && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="font-mono text-sm font-bold text-zinc-500">
                {result.ticket.ticket_number}
              </p>
              {/* Only present with the personal link (?token=). */}
              {result.ticket.title && (
                <p className="mt-1 text-lg font-semibold">{result.ticket.title}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-zinc-500">{t.statusPage.statusIs}</span>
                <Badge className={cn(STATUS_STYLES[result.ticket.status])}>
                  {t.statuses[result.ticket.status]}
                </Badge>
              </div>
              {"type" in result.ticket && result.ticket.type && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {t.detail.type}: {t.types[result.ticket.type as PublicTicketInfo["type"]]} · {t.detail.priority}:{" "}
                  {t.priorities[result.ticket.priority as PublicTicketInfo["priority"]]}
                  {"app" in result.ticket && result.ticket.app ? ` · ${result.ticket.app}` : ""}
                </p>
              )}
              <p className="mt-2 text-sm text-zinc-500">
                {t.statusPage.lastUpdated} {formatDate(result.ticket.updated_at, locale)}
              </p>
              {result.replies && result.replies.length > 0 && (
                <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <p className="text-sm font-semibold">{t.statusPage.repliesTitle}</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {result.replies.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg bg-white px-3 py-2.5 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.body}</p>
                        <p className="mt-1.5 font-mono text-xs text-zinc-400">
                          {formatDate(r.created_at, locale)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.limited && result.hint && (
                <p className="mt-3 text-xs text-zinc-500">{result.hint}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function StatusPage({ t, locale }: { t: Dict; locale: string }) {
  return (
    <Suspense>
      <StatusContent t={t} locale={locale} />
    </Suspense>
  );
}
