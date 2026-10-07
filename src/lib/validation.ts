import { z } from "zod";
import {
  ALLOWED_SCREENSHOT_MIME,
  MAX_SCREENSHOT_BYTES,
} from "./constants";
import type { Dict, Lang } from "./i18n/dictionaries";
import { dictionaries } from "./i18n/dictionaries";
import { BUG_PRIORITIES, BUG_STATUSES, BUG_TYPES } from "@/types/bug";

export function createBugSchema(lang: Lang) {
  const v: Dict["validation"] = dictionaries[lang].validation;
  return z.object({
    title: z
      .string()
      .trim()
      .min(5, v.titleMin)
      .max(150, v.titleMax),
    description: z
      .string()
      .trim()
      .min(20, v.descriptionMin)
      .max(5000, v.descriptionMax),
    type: z.enum(BUG_TYPES).default("BUG"),
    priority: z.enum(BUG_PRIORITIES).default("MEDIUM"),
    email: z
      .string()
      .trim()
      .max(254)
      .optional()
      .transform((val) => (val === "" ? undefined : val))
      .pipe(z.string().email(v.emailInvalid).optional()),
    // Raw application value; membership in the configured list is enforced
    // in the route (the list comes from env, so the schema stays static).
    app: z.string().trim().max(100).optional(),
    // May be empty when no site key is configured (dev bypass) or when the
    // widget hasn't produced a token yet. Emptiness is handled in the route:
    // verifyTurnstile() rejects it unless the dev bypass applies.
    turnstileToken: z.string().max(2048).optional().default(""),
    // Collected client-side, all optional, length-capped.
    browser: z.string().max(100).optional(),
    os: z.string().max(100).optional(),
    viewport: z.string().max(30).optional(),
    userAgent: z.string().max(500).optional(),
    language: z.string().max(20).optional(),
    sourceUrl: z.string().max(500).optional(),
  });
}

export type CreateBugInput = z.infer<ReturnType<typeof createBugSchema>>;

export function validateScreenshot(file: File, lang: Lang): string | null {
  const v: Dict["validation"] = dictionaries[lang].validation;
  if (!ALLOWED_SCREENSHOT_MIME.includes(file.type as (typeof ALLOWED_SCREENSHOT_MIME)[number])) {
    return v.screenshotType;
  }
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return v.screenshotSize;
  }
  if (file.size === 0) {
    return v.screenshotEmpty;
  }
  return null;
}

export const adminUpdateSchema = z.object({
  status: z.enum(BUG_STATUSES),
  priority: z.enum(BUG_PRIORITIES),
  type: z.enum(BUG_TYPES),
  adminNotes: z.string().trim().max(5000).nullable(),
});

export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;

export const ticketNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^BUG-\d{4}-\d{4}$/, "Invalid ticket format. Expected e.g. BUG-2026-0001.");
