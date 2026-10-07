"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANG_COOKIE, type Dict, type Lang } from "@/lib/i18n/dictionaries";

/** Language switcher. Persists to a cookie and re-renders server-side. */
export function LangToggle({ lang, t }: { lang: Lang; t: Dict["language"] }) {
  const router = useRouter();
  const next: Lang = lang === "it" ? "en" : "it";

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      aria-label={lang === "it" ? t.switchToEnglish : t.switchToItalian}
      title={lang === "it" ? t.switchToEnglish : t.switchToItalian}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
        router.refresh();
      }}
    >
      <span className="flex items-center gap-1 text-xs font-bold">
        <Languages aria-hidden className="size-4" />
        {next.toUpperCase()}
      </span>
    </Button>
  );
}
