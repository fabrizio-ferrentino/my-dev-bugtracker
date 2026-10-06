export const BUG_TYPES = [
  "BUG",
  "UI_UX",
  "PERFORMANCE",
  "FEATURE_REQUEST",
  "SECURITY",
  "OTHER",
] as const;
export type BugType = (typeof BUG_TYPES)[number];

export const BUG_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type BugPriority = (typeof BUG_PRIORITIES)[number];

export const BUG_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

export const BUG_EVENT_TYPES = [
  "TICKET_CREATED",
  "STATUS_CHANGED",
  "PRIORITY_CHANGED",
  "TYPE_CHANGED",
  "NOTE_ADDED",
] as const;
export type BugEventType = (typeof BUG_EVENT_TYPES)[number];

export interface BugReport {
  id: string;
  ticket_number: string;
  public_access_token: string;
  title: string;
  description: string;
  type: BugType;
  priority: BugPriority;
  status: BugStatus;
  email: string | null;
  browser: string | null;
  os: string | null;
  viewport: string | null;
  user_agent: string | null;
  language: string | null;
  source_url: string | null;
  screenshot_path: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Public-safe subset — NEVER add admin_notes / user_agent here. */
export interface PublicTicketInfo {
  ticket_number: string;
  title: string;
  type: BugType;
  priority: BugPriority;
  status: BugStatus;
  created_at: string;
  updated_at: string;
}

export interface BugEvent {
  id: string;
  bug_id: string;
  event_type: BugEventType;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  created_by: string | null;
}
