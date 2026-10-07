"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove?: (id?: string) => void;
    };
  }
}

interface Props {
  onToken: (token: string | null) => void;
  loadFailedMessage: string;
}

/**
 * Cloudflare Turnstile widget. Renders the checkbox only when a site key
 * is configured; otherwise calls onToken(null) so the server can decide
 * (dev bypass, see lib/turnstile.ts).
 */
export function TurnstileWidget({ onToken, loadFailedMessage }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const cbRef = useRef(onToken);
  cbRef.current = onToken;

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile) return;
    if (widgetId.current) return;
    try {
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: (token: string) => cbRef.current(token),
        "expired-callback": () => cbRef.current(null),
        "error-callback": () => {
          cbRef.current(null);
          setFailed(true);
        },
      });
    } catch {
      setFailed(true);
    }
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey) {
      onToken(null);
      return;
    }
    if (window.turnstile) {
      renderWidget();
      return;
    }
    const t = setInterval(() => {
      if (window.turnstile) {
        clearInterval(t);
        renderWidget();
      }
    }, 300);
    const timeout = setTimeout(() => {
      clearInterval(t);
      if (!widgetId.current) setFailed(true);
    }, 15000);
    return () => {
      clearInterval(t);
      clearTimeout(timeout);
    };
  }, [siteKey, renderWidget, onToken]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
      <div className="flex min-h-16 items-center">
        <div ref={containerRef} />
        {failed && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {loadFailedMessage}
          </p>
        )}
      </div>
    </>
  );
}
