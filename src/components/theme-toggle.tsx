"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ toLight, toDark }: { toLight: string; toDark: string }) {
  const { theme, setTheme } = useTheme();
  // Theme is unknown until client mount — render a stable placeholder
  // before that, otherwise server/client HTML differs (hydration error).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" type="button" disabled aria-hidden>
        <Moon aria-hidden />
      </Button>
    );
  }

  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      aria-label={isDark ? toLight : toDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
