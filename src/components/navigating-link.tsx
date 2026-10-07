"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface NavigatingLinkProps extends React.ComponentProps<typeof Link> {
  overlayText?: string;
}

/**
 * Link that shows a full-screen loading overlay on click.
 * The overlay covers the page (blocking further clicks) until the
 * destination route takes over and unmounts this component.
 */
export function NavigatingLink({
  children,
  overlayText = "Loading…",
  onClick,
  ...rest
}: NavigatingLinkProps) {
  const [pending, setPending] = useState(false);

  return (
    <>
      <Link
        {...rest}
        aria-disabled={pending}
        onClick={(e) => {
          setPending(true);
          onClick?.(e);
        }}
      >
        {children}
      </Link>
      {pending && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex cursor-wait items-center justify-center bg-white/70 dark:bg-slate-950/70"
        >
          <p className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            {overlayText}
          </p>
        </div>
      )}
    </>
  );
}
