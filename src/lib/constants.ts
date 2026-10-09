import type { BugPriority, BugStatus } from "@/types/bug";

/**
 * Centralized visual mapping for priorities (spec §9) and statuses.
 * Hues carry meaning; rings keep them calm on both themes.
 */
export const PRIORITY_STYLES: Record<BugPriority, string> = {
  LOW: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/20",
  MEDIUM: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20",
  HIGH: "bg-amber-50 text-amber-700 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  CRITICAL: "bg-red-50 text-red-700 ring-red-600/25 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20",
};

/** Centralized visual mapping for statuses. */
export const STATUS_STYLES: Record<BugStatus, string> = {
  OPEN: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
  IN_PROGRESS:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20",
  RESOLVED:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  CLOSED:
    "bg-zinc-100 text-zinc-500 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-400/20",
};

/** Service privacy policy (src/app/privacy/page.tsx). */
export const privacyUrl = "/privacy";

export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_SCREENSHOT_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const siteName =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Bug Tracker";
export const siteTaglineEnv = process.env.NEXT_PUBLIC_SITE_TAGLINE?.trim() || "";
export const appUrl = (
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
).replace(/\/$/, "");

/**
 * Optional list of applications the reporter can pick from, configured via
 * NEXT_PUBLIC_APPS="Website,Mobile App,API". Empty = field hidden everywhere.
 */
export function getApps(): string[] {
  const raw = process.env.NEXT_PUBLIC_APPS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 50);
}
