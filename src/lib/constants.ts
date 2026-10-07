import type { BugPriority, BugStatus, BugType } from "@/types/bug";

/** Centralized visual mapping for priorities (spec §9). */
export const PRIORITY_STYLES: Record<BugPriority, string> = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  HIGH: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

/** Centralized visual mapping for statuses. */
export const STATUS_STYLES: Record<BugStatus, string> = {
  OPEN: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  IN_PROGRESS:
    "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  RESOLVED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CLOSED: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export const TYPE_LABELS: Record<BugType, string> = {
  BUG: "Bug",
  UI_UX: "UI / UX",
  PERFORMANCE: "Performance",
  FEATURE_REQUEST: "Feature Request",
  SECURITY: "Security",
  OTHER: "Other",
};

export const PRIORITY_LABELS: Record<BugPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const STATUS_LABELS: Record<BugStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_SCREENSHOT_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const siteName =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Bug Tracker";
export const siteTagline =
  process.env.NEXT_PUBLIC_SITE_TAGLINE?.trim() ||
  "Found a bug or something that doesn't work? Send a report and we'll take care of it.";
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
