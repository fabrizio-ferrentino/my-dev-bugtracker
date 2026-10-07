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
import { ThemeToggle } from "@/components/theme-toggle";
import { createServerSupabase } from "@/lib/supabase/server";
import { siteName } from "@/lib/constants";
import type { BugReport } from "@/types/bug";

export const metadata = {
  title: "Dashboard",
  robots: "noindex, nofollow",
};

interface SearchParams {
  q?: string;
  status?: string;
  priority?: string;
  type?: string;
  sort?: string;
  page?: string;
}

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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
  const sort = searchParams.sort === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  let query = supabase
    .from("bug_reports")
    .select(
      "id,ticket_number,title,type,priority,status,email,created_at",
      { count: "exact" },
    );
  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (type) query = query.eq("type", type);
  if (q) query = query.or(`ticket_number.ilike.%${q}%,title.ilike.%${q}%`);
  query = query.order("created_at", {
    ascending: sort === "oldest",
  });
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: tickets } = await query;
  const list = (tickets ?? []) as Pick<
    BugReport,
    "id" | "ticket_number" | "title" | "type" | "priority" | "status" | "email" | "created_at"
  >[];

  function hrefWith(params: Record<string, string>) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (priority) sp.set("priority", priority);
    if (type) sp.set("type", type);
    if (sort !== "newest") sp.set("sort", sort);
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const s = sp.toString();
    return `/admin${s ? `?${s}` : ""}`;
  }

  const statCards = [
    { label: "Open", value: stats.open, icon: CircleDot },
    { label: "In Progress", value: stats.inProgress, icon: Clock },
    { label: "Resolved", value: stats.resolved, icon: CheckCircle2 },
    { label: "Closed", value: stats.closed, icon: Bug },
    { label: "Critical", value: stats.critical, icon: Flame, alert: stats.critical > 0 },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{siteName}</p>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <section aria-label="Statistics" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <s.icon
                aria-hidden
                className={`size-5 shrink-0 ${s.alert ? "text-red-600" : "text-slate-400"}`}
              />
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="mt-1 text-xs text-slate-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mb-4">
        <CardContent className="pt-4">
          <form method="get" action="/admin" className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
            <div className="flex flex-col gap-1">
              <Label htmlFor="q">Search</Label>
              <Input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Ticket number or title…"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="priority">Priority</Label>
              <Select id="priority" name="priority" defaultValue={priority}>
                <option value="">All</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="type">Type</Label>
              <Select id="type" name="type" defaultValue={type}>
                <option value="">All</option>
                <option value="BUG">Bug</option>
                <option value="UI_UX">UI / UX</option>
                <option value="PERFORMANCE">Performance</option>
                <option value="FEATURE_REQUEST">Feature Request</option>
                <option value="SECURITY">Security</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="sort">Sort</Label>
              <Select id="sort" name="sort" defaultValue={sort}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit">Filter</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              No tickets found. Adjust filters or wait for new reports.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {list.map((t) => (
                <li key={t.id}>
                  <NavigatingLink
                    href={`/admin/bugs/${t.id}`}
                    overlayText="Opening ticket…"
                    className="flex flex-col gap-2 p-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-900"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-slate-500">
                        {t.ticket_number}
                      </p>
                      <p className="truncate font-medium">{t.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t.email ?? "No email"} · {formatDate(t.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <TypeBadge type={t.type} />
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </NavigatingLink>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">Page {page}</p>
        <div className="flex gap-2">
          {page > 1 ? (
            <NavigatingLink
              href={hrefWith({ page: String(page - 1) })}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              ← Previous
            </NavigatingLink>
          ) : (
            <span className="cursor-not-allowed rounded-md border border-slate-200 px-3 py-1.5 text-sm opacity-40 dark:border-slate-800">
              ← Previous
            </span>
          )}
          {list.length === PAGE_SIZE ? (
            <NavigatingLink
              href={hrefWith({ page: String(page + 1) })}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Next →
            </NavigatingLink>
          ) : (
            <span className="cursor-not-allowed rounded-md border border-slate-200 px-3 py-1.5 text-sm opacity-40 dark:border-slate-800">
              Next →
            </span>
          )}
        </div>
      </nav>

      {stats.critical > 0 && (
        <p className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400" role="status">
          <AlertTriangle aria-hidden className="size-4" />
          {stats.critical} open critical ticket{stats.critical === 1 ? "" : "s"} need{stats.critical === 1 ? "s" : ""} attention.
        </p>
      )}
    </main>
  );
}
