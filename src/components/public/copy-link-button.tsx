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
