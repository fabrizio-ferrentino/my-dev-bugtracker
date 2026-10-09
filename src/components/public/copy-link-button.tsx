"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({
  url,
  copyLabel,
  copiedLabel,
}: {
  url: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard unavailable — the link is still visible below.
    }
  }

  return (
    <Button variant="outline" size="sm" type="button" onClick={handleCopy}>
      {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
      {copied ? copiedLabel : copyLabel}
    </Button>
  );
}

/** Minimal text-only variant (e.g. table rows): "Copy" / "Copied!". */
export function SimpleCopyButton({
  text,
  copyLabel,
  copiedLabel,
}: {
  text: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — nothing to do.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="font-mono text-xs font-semibold uppercase tracking-wide text-indigo-600 hover:underline dark:text-indigo-400"
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}
