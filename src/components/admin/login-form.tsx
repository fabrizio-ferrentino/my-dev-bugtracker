"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { siteName } from "@/lib/constants";
import type { Dict } from "@/lib/i18n/dictionaries";

export function LoginForm({ t }: { t: Dict }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only same-site admin paths: never redirect to an external URL after login.
  const rawNext = searchParams.get("next") ?? "";
  const next = /^\/admin(\/|\?|$)/.test(rawNext) ? rawNext : "/admin";
  const urlError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    urlError === "unauthorized" ? t.login.unauthorized : null,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(t.login.invalid);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError(t.login.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-10">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 self-start text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t.login.backHome}
      </Link>
      <Card>
        <CardHeader className="items-center text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm dark:bg-indigo-500">
            <LogIn aria-hidden className="size-5" />
          </span>
          <CardTitle className="mt-2">{t.login.title}</CardTitle>
          <CardDescription>
            {siteName} · {t.dashboard.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : (
                <LogIn aria-hidden />
              )}
              {t.login.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
