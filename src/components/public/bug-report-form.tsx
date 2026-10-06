"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TurnstileWidget } from "./turnstile-widget";
import { collectTechInfo } from "./tech-info";
import { MAX_SCREENSHOT_BYTES } from "@/lib/constants";
import type { BugPriority, BugType } from "@/types/bug";

interface SuccessPayload {
  ticketNumber: string;
  statusUrl: string;
}

const TYPE_OPTIONS: { value: BugType; label: string }[] = [
  { value: "BUG", label: "Bug" },
  { value: "UI_UX", label: "UI / UX" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "FEATURE_REQUEST", label: "Feature Request" },
  { value: "SECURITY", label: "Security" },
  { value: "OTHER", label: "Other" },
];

const PRIORITY_OPTIONS: { value: BugPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export function BugReportForm() {
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
          setFieldErrors({ screenshot: "Screenshot must be at most 5 MB." });
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
        setError(err.error || "Something went wrong. Please try again.");
        if (err.fields) setFieldErrors(err.fields);
        return;
      }

      const ok = json as SuccessPayload & { ok: true };
      router.push(
        `/success?ticket=${encodeURIComponent(ok.ticketNumber)}&token=${encodeURIComponent(ok.statusUrl)}`,
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              required
              minLength={5}
              maxLength={150}
              placeholder="Save button does nothing"
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
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              required
              minLength={20}
              maxLength={5000}
              rows={6}
              placeholder={"What happened?\nWhat did you expect to happen?\nHow can we reproduce it?"}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={fieldErrors.description ? "description-error" : undefined}
            />
            {fieldErrors.description ? (
              <p id="description-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.description}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Describe what happened, what you expected, and how to reproduce it (min. 20 characters).
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="type">Type *</Label>
              <Select id="type" name="type" defaultValue="BUG">
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select id="priority" name="priority" defaultValue="MEDIUM">
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              maxLength={254}
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby="email-hint"
            />
            <p id="email-hint" className="text-xs text-slate-500">
              Only used if we need to contact you about this report.
            </p>
            {fieldErrors.email && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="screenshot">Screenshot (optional)</Label>
            <label
              htmlFor="screenshot"
              className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <Upload aria-hidden className="size-4 shrink-0" />
              <span className="truncate">
                {fileName ?? "PNG, JPG or WEBP — max 5 MB"}
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

          <TurnstileWidget onToken={setTurnstileToken} />

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={submitting || captchaPending}>
            {submitting ? (
              <>
                <Loader2 aria-hidden className="animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <CheckCircle2 aria-hidden />
                Send report
              </>
            )}
          </Button>
          {captchaPending && (
            <p className="text-center text-xs text-slate-500">
              Complete the verification above to enable sending.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
