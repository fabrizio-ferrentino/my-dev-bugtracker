import { NavigatingLink } from "@/components/navigating-link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/components/admin/logout-button";
import { DeleteTicketButton } from "@/components/admin/delete-ticket-button";
import { TicketEditor } from "@/components/admin/ticket-editor";
import {
  PriorityBadge,
  StatusBadge,
  TypeBadge,
} from "@/components/admin/badges";
import { getScreenshotUrl } from "@/app/admin/actions";
import { createServerSupabase } from "@/lib/supabase/server";
import type { BugEvent, BugReport } from "@/types/bug";

export const metadata = {
  title: "Ticket",
  robots: "noindex, nofollow",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
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
      <dt className="w-36 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-sm">{value}</dd>
    </div>
  );
}

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
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
  const t = ticket as BugReport;

  const { data: events } = await supabase
    .from("bug_events")
    .select("*")
    .eq("bug_id", t.id)
    .order("created_at", { ascending: false });
  const timeline = (events ?? []) as BugEvent[];

  const { url: screenshotUrl } = t.screenshot_path
    ? await getScreenshotUrl(t.screenshot_path)
    : { url: null };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <NavigatingLink
          href="/admin"
          overlayText="Loading dashboard…"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to dashboard
        </NavigatingLink>
        <div className="flex items-center gap-2">
          <DeleteTicketButton id={t.id} ticketNumber={t.ticket_number} />
          <LogoutButton />
        </div>
      </header>

      <p className="font-mono text-sm font-bold text-slate-500">
        {t.ticket_number}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{t.title}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge status={t.status} />
        <PriorityBadge priority={t.priority} />
        <TypeBadge type={t.type} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{t.description}</p>
            <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
              <Dl label="Reporter" value={t.email ?? "—"} />
              {t.app && <Dl label="Application" value={t.app} />}
              <Dl label="Created" value={formatDateTime(t.created_at)} />
              <Dl label="Updated" value={formatDateTime(t.updated_at)} />
              <Dl label="Browser" value={t.browser ?? "—"} />
              <Dl label="OS" value={t.os ?? "—"} />
              <Dl label="Viewport" value={t.viewport ?? "—"} />
              <Dl label="Language" value={t.language ?? "—"} />
              <Dl label="Source URL" value={t.source_url ?? "—"} />
              <Dl
                label="User agent"
                value={
                  <span className="break-all font-mono text-xs">
                    {t.user_agent ?? "—"}
                  </span>
                }
              />
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manage</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketEditor
                id={t.id}
                initial={{
                  status: t.status,
                  priority: t.priority,
                  type: t.type,
                  adminNotes: t.admin_notes ?? "",
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Screenshot</CardTitle>
            </CardHeader>
            <CardContent>
              {screenshotUrl ? (
                <a href={screenshotUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshotUrl}
                    alt={`Screenshot for ${t.ticket_number}`}
                    className="max-h-80 w-full rounded-md border border-slate-200 object-contain dark:border-slate-800"
                  />
                </a>
              ) : (
                <p className="text-sm text-slate-500">No screenshot attached.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-500">No events recorded.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {timeline.map((ev) => (
                <li key={ev.id} className="flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="font-mono text-xs font-semibold">
                    {ev.event_type}
                  </span>
                  {ev.old_value && (
                    <span className="text-slate-500">
                      {ev.old_value} → {ev.new_value}
                    </span>
                  )}
                  {!ev.old_value && ev.new_value && (
                    <span className="text-slate-500">{ev.new_value}</span>
                  )}
                  <span className="ml-auto text-xs text-slate-400">
                    {formatDateTime(ev.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
