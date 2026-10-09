"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2, Send, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TurnstileWidget } from "./turnstile-widget";
import { collectTechInfo } from "./tech-info";
import { MAX_SCREENSHOT_BYTES, getApps, privacyUrl } from "@/lib/constants";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { BugPriority, BugType } from "@/types/bug";
import { BUG_PRIORITIES, BUG_TYPES } from "@/types/bug";

interface SuccessPayload {
  ticketNumber: string;
  statusUrl: string;
}

export function BugReportForm({ t }: { t: Dict }) {
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string | null>(null);
  // When a site key is configured the captcha must be solved first —
  // otherwise the server rejects the request. (No site key = dev bypass.)
  const turnstileRequired = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
  const captchaPending = turnstileRequired && !turnstileToken;
  // Optional application picker, configured via NEXT_PUBLIC_APPS.
  const apps = getApps();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const form = e.currentTarget;
      const data = new FormData(form);
      const tech = collectTechInfo();

      const payload = new FormData();
      payload.set("title", String(data.get("title") ?? ""));
      payload.set("description", String(data.get("description") ?? ""));
      payload.set("type", String(data.get("type") ?? "BUG"));
      payload.set("priority", String(data.get("priority") ?? "MEDIUM"));
      payload.set("email", String(data.get("email") ?? ""));
      if (apps.length > 0) {
        payload.set("app", String(data.get("app") ?? ""));
      }
      payload.set("turnstileToken", turnstileToken ?? "");
      payload.set("browser", tech.browser);
      payload.set("os", tech.os);
      payload.set("viewport", tech.viewport);
      payload.set("userAgent", tech.userAgent);
      payload.set("language", tech.language);
      payload.set("sourceUrl", tech.sourceUrl);

      const fileInput = form.elements.namedItem("screenshot") as HTMLInputElement | null;
      const file = fileInput?.files?.[0];
      if (file && file.size > 0) {
        if (file.size > MAX_SCREENSHOT_BYTES) {
          setFieldErrors({ screenshot: t.validation.screenshotSize });
          setSubmitting(false);
          return;
        }
        payload.set("screenshot", file);
      }

      const res = await fetch("/api/bugs", { method: "POST", body: payload });
      const json = (await res.json()) as
        | (SuccessPayload & { ok: true })
        | { ok?: false; error: string; fields?: Record<string, string> };

      if (!res.ok || !("ok" in json) || json.ok !== true) {
        const err = json as { error: string; fields?: Record<string, string> };
        setError(err.error || t.api.generic);
        if (err.fields) setFieldErrors(err.fields);
        return;
      }

      const ok = json as SuccessPayload & { ok: true };
      router.push(
        `/success?ticket=${encodeURIComponent(ok.ticketNumber)}&token=${encodeURIComponent(ok.statusUrl)}`,
      );
    } catch {
      setError(t.api.generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">
              {t.form.titleLabel} <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              required
              minLength={5}
              maxLength={150}
              placeholder={t.form.titlePlaceholder}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? "title-error" : undefined}
            />
            {fieldErrors.title && (
              <p id="title-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.title}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">
              {t.form.descriptionLabel} <span aria-hidden="true">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              required
              minLength={20}
              maxLength={5000}
              rows={6}
              placeholder={t.form.descriptionPlaceholder}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={fieldErrors.description ? "description-error" : "description-hint"}
            />
            {fieldErrors.description ? (
              <p id="description-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.description}
              </p>
            ) : (
              <p id="description-hint" className="text-xs text-zinc-500">
                {t.form.descriptionHint}
              </p>
            )}
          </div>

          {apps.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="app">
                {t.form.appLabel} <span aria-hidden="true">*</span>
              </Label>
              <Select
                id="app"
                name="app"
                defaultValue={apps[0]}
                aria-invalid={Boolean(fieldErrors.app)}
                aria-describedby={fieldErrors.app ? "app-error" : undefined}
              >
                {apps.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
              {fieldErrors.app && (
                <p id="app-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {fieldErrors.app}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="type">
                {t.form.typeLabel} <span aria-hidden="true">*</span>
              </Label>
              <Select id="type" name="type" defaultValue="BUG">
                {BUG_TYPES.map((v: BugType) => (
                  <option key={v} value={v}>
                    {t.types[v]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="priority">{t.form.priorityLabel}</Label>
              <Select id="priority" name="priority" defaultValue="MEDIUM">
                {BUG_PRIORITIES.map((v: BugPriority) => (
                  <option key={v} value={v}>
                    {t.priorities[v]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t.form.emailLabel}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              maxLength={254}
              autoComplete="email"
              placeholder={t.form.emailPlaceholder}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby="email-hint"
            />
            <p id="email-hint" className="text-xs text-zinc-500">
              {t.form.emailHint}
            </p>
            {fieldErrors.email && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="screenshot">{t.form.screenshotLabel}</Label>
            <label
              htmlFor="screenshot"
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10"
            >
              <Upload aria-hidden className="size-4 shrink-0" />
              <span className="truncate">
                {fileName ?? t.form.screenshotDrop}
              </span>
            </label>
            <input
              id="screenshot"
              name="screenshot"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(ev) => setFileName(ev.target.files?.[0]?.name ?? null)}
            />
            {fieldErrors.screenshot && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.screenshot}
              </p>
            )}
          </div>

          <TurnstileWidget onToken={setTurnstileToken} loadFailedMessage={t.turnstile.loadFailed} />

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={submitting || captchaPending}>
            {submitting ? (
              <>
                <Loader2 aria-hidden className="animate-spin" />
                {t.form.sending}
              </>
            ) : (
              <>
                <Send aria-hidden />
                {t.form.submit}
              </>
            )}
          </Button>
          {captchaPending && (
            <p className="text-center text-xs text-zinc-500">
              {t.form.captchaPending}
            </p>
          )}
          <p className="text-center text-xs text-zinc-500">
            {t.form.privacyLead}{" "}
            <a
              href={privacyUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
            >
              {t.form.privacyLink}
            </a>
            .
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
