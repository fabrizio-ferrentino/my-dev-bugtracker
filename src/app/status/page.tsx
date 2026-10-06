"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PublicTicketInfo } from "@/types/bug";

interface StatusResponse {
  ticket?: Partial<PublicTicketInfo> & {
    ticket_number: string;
    title: string;
    status: PublicTicketInfo["status"];
    updated_at: string;
  };
  limited?: boolean;
  hint?: string;
  error?: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function StatusContent() {
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
      setResult({ error: "Something went wrong. Please try again." });
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
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Check report status</CardTitle>
          <CardDescription>
            {initialToken
              ? "Status of your report:"
              : "Enter your ticket number (e.g. BUG-2026-0001). For full details, open the personal status link you received after reporting."}
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
                <Label htmlFor="ticket">Ticket number</Label>
                <div className="flex gap-2">
                  <Input
                    id="ticket"
                    value={ticketInput}
                    onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                    placeholder="BUG-2026-0001"
                    className="font-mono"
                    aria-describedby="ticket-hint"
                  />
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 aria-hidden className="animate-spin" />
                    ) : (
                      <Search aria-hidden />
                    )}
                    <span className="sr-only sm:not-sr-only">Search</span>
                  </Button>
                </div>
                <p id="ticket-hint" className="text-xs text-slate-500">
                  Looking up by ticket number shows only basic info, to protect
                  everyone&apos;s privacy.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="token">Or paste your personal access token</Label>
                <div className="flex gap-2">
                  <Input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value.trim())}
                    placeholder="64-character token from your status link"
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
                    Open
                  </Button>
                </div>
              </div>
            </form>
          )}

          {loading && (
            <p className="flex items-center gap-2 text-sm text-slate-500" role="status">
              <Loader2 aria-hidden className="animate-spin" /> Loading…
            </p>
          )}

          {result?.error && (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {result.error}
            </p>
          )}

          {result?.ticket && (
            <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
              <p className="font-mono text-sm font-bold">
                {result.ticket.ticket_number}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {result.ticket.title}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-500">Status:</span>
                <Badge className={cn(STATUS_STYLES[result.ticket.status])}>
                  {STATUS_LABELS[result.ticket.status]}
                </Badge>
              </div>
              {"type" in result.ticket && result.ticket.type && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Type: {TYPE_LABELS[result.ticket.type as PublicTicketInfo["type"]]} · Priority:{" "}
                  {PRIORITY_LABELS[result.ticket.priority as PublicTicketInfo["priority"]]}
                </p>
              )}
              <p className="mt-2 text-sm text-slate-500">
                Last updated: {formatDate(result.ticket.updated_at)}
              </p>
              {result.limited && result.hint && (
                <p className="mt-3 text-xs text-slate-500">{result.hint}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function StatusPage() {
  return (
    <Suspense>
      <StatusContent />
    </Suspense>
  );
}
