import { Badge } from "@/components/ui/badge";
import { PRIORITY_STYLES, STATUS_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { BugPriority, BugStatus, BugType } from "@/types/bug";

export function StatusBadge({ status, label }: { status: BugStatus; label: string }) {
  return <Badge className={cn(STATUS_STYLES[status])}>{label}</Badge>;
}

export function PriorityBadge({
  priority,
  label,
}: {
  priority: BugPriority;
  label: string;
}) {
  return <Badge className={cn(PRIORITY_STYLES[priority])}>{label}</Badge>;
}

export function TypeBadge({ type, label }: { type: BugType; label: string }) {
  return (
    <Badge className="bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/20">
      {label}
    </Badge>
  );
}
