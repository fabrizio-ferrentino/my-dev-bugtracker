import { Badge } from "@/components/ui/badge";
import {
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { BugPriority, BugStatus, BugType } from "@/types/bug";

export function StatusBadge({ status }: { status: BugStatus }) {
  return (
    <Badge className={cn(STATUS_STYLES[status])}>{STATUS_LABELS[status]}</Badge>
  );
}

export function PriorityBadge({ priority }: { priority: BugPriority }) {
  return (
    <Badge className={cn(PRIORITY_STYLES[priority])}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: BugType }) {
  return (
    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {TYPE_LABELS[type]}
    </Badge>
  );
}
