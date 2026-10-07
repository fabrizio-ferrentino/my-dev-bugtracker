import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/components/admin/logout-button";
import { DeleteTicketButton } from "@/components/admin/delete-ticket-button";
import { NavigatingLink } from "@/components/navigating-link";
import { TicketEditor } from "@/components/admin/ticket-editor";
import {
  PriorityBadge,
  StatusBadge,
  TypeBadge,
} from "@/components/admin/badges";
import { getScreenshotUrl } from "@/app/admin/actions";
import { createServerSupabase } from "@/lib/supabase/server";
import { getLangAndDict } from "@/lib/i18n/server";
import type { BugEvent, BugReport } from "@/types/bug";

export async function generateMetadata() {
  const { t } = getLangAndDict();
  return { title: t.meta.ticketTitle, robots: "noindex, nofollow" };
}

function formatDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Dl({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-36 shrink-0 text-sm text-zinc-500">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-sm">{value}</dd>
    </div>
  );
}

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { lang, t } = getLangAndDict();
  const locale = lang === "it" ? "it-IT" : "en-US";
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: ticket } = await supabase
    .from("bug_reports")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!ticket) notFound();
  const ticketData = ticket as BugReport;

  const { data: events } = await supabase
    .from("bug_events")
    .select("*")
    .eq("bug_id", ticketData.id)
    .order("created_at", { ascending: false });
  const timeline = (events ?? []) as BugEvent[];

  const { url: screenshotUrl } = ticketData.screenshot_path
    ? await getScreenshotUrl(ticketData.screenshot_path)
    : { url: null };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <NavigatingLink
          href="/admin"
          overlayText={t.dashboard.loadingDashboard}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {t.detail.back}
        </NavigatingLink>
        <div className="flex items-center gap-2">
          <DeleteTicketButton id={ticketData.id} ticketNumber={ticketData.ticket_number} t={t.detail} />
          <LogoutButton label={t.dashboard.logout} />
        </div>
      </header>

      <p className="font-mono text-sm font-bold text-zinc-500">
        {ticketData.ticket_number}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{ticketData.title}</h1>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusBadge status={ticketData.status} label={t.statuses[ticketData.status]} />
        <PriorityBadge priority={ticketData.priority} label={t.priorities[ticketData.priority]} />
        <TypeBadge type={ticketData.type} label={t.types[ticketData.type]} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.detail.report}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticketData.description}</p>
            <dl className="mt-4 divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
              <Dl label={t.detail.reporter} value={ticketData.email ?? "—"} />
              {ticketData.app && <Dl label={t.detail.application} value={ticketData.app} />}
              <Dl label={t.detail.created} value={formatDateTime(ticketData.created_at, locale)} />
              <Dl label={t.detail.updated} value={formatDateTime(ticketData.updated_at, locale)} />
              <Dl label={t.detail.browser} value={ticketData.browser ?? "—"} />
              <Dl label={t.detail.os} value={ticketData.os ?? "—"} />
              <Dl label={t.detail.viewport} value={ticketData.viewport ?? "—"} />
              <Dl label={t.detail.language} value={ticketData.language ?? "—"} />
              <Dl label={t.detail.sourceUrl} value={ticketData.source_url ?? "—"} />
              <Dl
                label={t.detail.userAgent}
                value={
                  <span className="break-all font-mono text-xs">
                    {ticketData.user_agent ?? "—"}
                  </span>
                }
              />
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.detail.manage}</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketEditor
                id={ticketData.id}
                t={t}
                initial={{
                  status: ticketData.status,
                  priority: ticketData.priority,
                  type: ticketData.type,
                  adminNotes: ticketData.admin_notes ?? "",
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.detail.screenshot}</CardTitle>
            </CardHeader>
            <CardContent>
              {screenshotUrl ? (
                <a
                  href={screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshotUrl}
                    alt={`${ticketData.ticket_number}`}
                    className="max-h-80 w-full object-contain transition-transform duration-200 hover:scale-[1.02]"
                  />
                </a>
              ) : (
                <p className="text-sm text-zinc-500">{t.detail.noScreenshot}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">{t.detail.history}</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-zinc-500">{t.detail.noEvents}</p>
          ) : (
            <ul className="flex flex-col">
              {timeline.map((ev, i) => (
                <li key={ev.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < timeline.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[5px] top-4 h-full w-px bg-zinc-200 dark:bg-zinc-800"
                    />
                  )}
                  <span
                    aria-hidden
                    className="mt-1.5 size-[11px] shrink-0 rounded-full bg-indigo-500 ring-4 ring-indigo-500/15"
                  />
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
                    <span className="font-mono text-xs font-semibold">
                      {ev.event_type}
                    </span>
                    {ev.old_value && (
                      <span className="text-sm text-zinc-500">
                        {ev.old_value} → {ev.new_value}
                      </span>
                    )}
                    {!ev.old_value && ev.new_value && (
                      <span className="text-sm text-zinc-500">{ev.new_value}</span>
                    )}
                    <span className="ml-auto text-xs text-zinc-400">
                      {formatDateTime(ev.created_at, locale)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
