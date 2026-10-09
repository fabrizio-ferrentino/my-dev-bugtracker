"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { BugEvent } from "@/types/bug";

/** First 4 entries, the rest behind the button. */
const VISIBLE_COUNT = 4;

interface Props {
  events: BugEvent[];
  t: Dict;
  locale: string;
}

export function HistoryList({ events, t, locale }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) {
    return <p className="text-sm text-zinc-500">{t.detail.noEvents}</p>;
  }

  const visible = expanded ? events : events.slice(0, VISIBLE_COUNT);

  return (
    <>
      <ul className="flex flex-col">
        {visible.map((ev, i) => (
          <li key={ev.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < visible.length - 1 && (
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
      {events.length > VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 inline-flex items-center gap-1 font-mono text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {expanded
            ? t.detail.historyLess
            : `${t.detail.historyMore} (${events.length - VISIBLE_COUNT})`}
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
      )}
    </>
  );
}
