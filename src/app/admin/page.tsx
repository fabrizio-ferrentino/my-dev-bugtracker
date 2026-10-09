import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  CircleDot,
  Clock,
  Flame,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/admin/logout-button";
import { NavigatingLink } from "@/components/navigating-link";
import {
  PriorityBadge,
  StatusBadge,
  TypeBadge,
} from "@/components/admin/badges";
import { LangToggle } from "@/components/lang-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { createServerSupabase } from "@/lib/supabase/server";
import { getApps, siteName } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { getLangAndDict } from "@/lib/i18n/server";
import type { BugReport, BugPriority, BugStatus, BugType } from "@/types/bug";
import { BUG_PRIORITIES, BUG_STATUSES, BUG_TYPES } from "@/types/bug";

export async function generateMetadata() {
  const { t } = getLangAndDict();
  return { title: t.meta.dashboardTitle, robots: "noindex, nofollow" };
}

interface SearchParams {
  q?: string;
  status?: string;
  priority?: string;
  type?: string;
  app?: string;
  sort?: string;
  page?: string;
}

const PAGE_SIZE = 20;

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { lang, t } = getLangAndDict();
  const locale = lang === "it" ? "it-IT" : "en-US";
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const allowlist = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (allowlist && user.email?.toLowerCase() !== allowlist) redirect("/admin/login");

  // Stats (single source: database).
  const { data: all } = await supabase
    .from("bug_reports")
    .select("status,priority");
  const rows = (all ?? []) as { status: string; priority: string }[];
  const stats = {
    open: rows.filter((r) => r.status === "OPEN").length,
    inProgress: rows.filter((r) => r.status === "IN_PROGRESS").length,
    resolved: rows.filter((r) => r.status === "RESOLVED").length,
    closed: rows.filter((r) => r.status === "CLOSED").length,
    critical: rows.filter(
      (r) => r.priority === "CRITICAL" && r.status !== "CLOSED",
    ).length,
  };

  // Filters.
  const q = (searchParams.q ?? "").trim();
  const status = searchParams.status ?? "";
  const priority = searchParams.priority ?? "";
  const type = searchParams.type ?? "";
  const appFilter = searchParams.app ?? "";
  const sort = searchParams.sort === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const apps = getApps();

  let query = supabase
    .from("bug_reports")
    .select(
      "id,ticket_number,title,type,priority,status,email,app,created_at",
      { count: "exact" },
    );
  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (type) query = query.eq("type", type);
  if (appFilter) query = query.eq("app", appFilter);
  if (q) query = query.or(`ticket_number.ilike.%${q}%,title.ilike.%${q}%`);
  query = query.order("created_at", {
    ascending: sort === "oldest",
  });
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: tickets } = await query;
  const list = (tickets ?? []) as Pick<
    BugReport,
    "id" | "ticket_number" | "title" | "type" | "priority" | "status" | "email" | "app" | "created_at"
  >[];

  function hrefWith(params: Record<string, string>) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (priority) sp.set("priority", priority);
    if (type) sp.set("type", type);
    if (appFilter) sp.set("app", appFilter);
    if (sort !== "newest") sp.set("sort", sort);
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const s = sp.toString();
    return `/admin${s ? `?${s}` : ""}`;
  }

  const statCards = [
    { label: t.statusPlural.OPEN, value: stats.open, icon: CircleDot, tone: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" },
    { label: t.statusPlural.IN_PROGRESS, value: stats.inProgress, icon: Clock, tone: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" },
    { label: t.statusPlural.RESOLVED, value: stats.resolved, icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" },
    { label: t.statusPlural.CLOSED, value: stats.closed, icon: Bug, tone: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" },
    { label: t.dashboard.critical, value: stats.critical, icon: Flame, tone: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400", alert: stats.critical > 0 },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white dark:bg-indigo-500">
              <Bug aria-hidden className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{siteName}</p>
              <p className="text-sm font-bold">{t.dashboard.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <LangToggle lang={lang} t={t.language} />
            <ThemeToggle toLight={t.theme.toLight} toDark={t.theme.toDark} />
            <LogoutButton label={t.dashboard.logout} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <section aria-label="Statistics" className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${s.tone}`}>
                  <s.icon aria-hidden className="size-4" />
                </span>
                <div>
                  <p className="text-2xl font-bold leading-none tabular-nums">{s.value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="mb-4">
          <CardContent className="pt-4">
            <form
              method="get"
              action="/admin"
              className={
                apps.length > 0
                  ? "grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]"
                  : "grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
              }
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q">{t.dashboard.search}</Label>
                <Input
                  id="q"
                  name="q"
                  defaultValue={q}
                  placeholder={t.dashboard.searchPlaceholder}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">{t.dashboard.status}</Label>
                <Select id="status" name="status" defaultValue={status}>
                  <option value="">{t.dashboard.all}</option>
                  {BUG_STATUSES.map((v: BugStatus) => (
                    <option key={v} value={v}>
                      {t.statuses[v]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="priority">{t.dashboard.priority}</Label>
                <Select id="priority" name="priority" defaultValue={priority}>
                  <option value="">{t.dashboard.all}</option>
                  {BUG_PRIORITIES.map((v: BugPriority) => (
                    <option key={v} value={v}>
                      {t.priorities[v]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="type">{t.dashboard.type}</Label>
                <Select id="type" name="type" defaultValue={type}>
                  <option value="">{t.dashboard.all}</option>
                  {BUG_TYPES.map((v: BugType) => (
                    <option key={v} value={v}>
                      {t.types[v]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sort">{t.dashboard.sort}</Label>
                <Select id="sort" name="sort" defaultValue={sort}>
                  <option value="newest">{t.dashboard.newest}</option>
                  <option value="oldest">{t.dashboard.oldest}</option>
                </Select>
              </div>
              {apps.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="app">{t.dashboard.app}</Label>
                  <Select id="app" name="app" defaultValue={appFilter}>
                    <option value="">{t.dashboard.all}</option>
                    {apps.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="flex items-end">
                <Button type="submit">{t.dashboard.filter}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {list.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">
                {t.dashboard.empty}
              </p>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {list.map((ticket) => (
                  <li key={ticket.id}>
                    <NavigatingLink
                      href={`/admin/bugs/${ticket.id}`}
                      overlayText={t.dashboard.openingTicket}
                      className="flex flex-col gap-2 p-4 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-zinc-800/50"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-zinc-500">
                          {ticket.ticket_number}
                        </p>
                        <p className="truncate font-medium">{ticket.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {ticket.email ?? t.dashboard.noEmail} · {formatDateTime(ticket.created_at, locale)}
                          {ticket.app ? ` · ${ticket.app}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <TypeBadge type={ticket.type} label={t.types[ticket.type]} />
                        <PriorityBadge priority={ticket.priority} label={t.priorities[ticket.priority]} />
                        <StatusBadge status={ticket.status} label={t.statuses[ticket.status]} />
                      </div>
                    </NavigatingLink>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {t.dashboard.page} {page}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <NavigatingLink
                href={hrefWith({ page: String(page - 1) })}
                overlayText={t.dashboard.loading}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                {t.dashboard.prev}
              </NavigatingLink>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-1.5 text-sm opacity-40 dark:border-zinc-800">
                {t.dashboard.prev}
              </span>
            )}
            {list.length === PAGE_SIZE ? (
              <NavigatingLink
                href={hrefWith({ page: String(page + 1) })}
                overlayText={t.dashboard.loading}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                {t.dashboard.next}
              </NavigatingLink>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-1.5 text-sm opacity-40 dark:border-zinc-800">
                {t.dashboard.next}
              </span>
            )}
          </div>
        </nav>

        {stats.critical > 0 && (
          <p className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400" role="status">
            <AlertTriangle aria-hidden className="size-4" />
            {stats.critical}{" "}
            {stats.critical === 1 ? t.dashboard.criticalAlertOne : t.dashboard.criticalAlert}
          </p>
        )}
      </main>
    </div>
  );
}
