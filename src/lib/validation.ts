import { z } from "zod";
import {
  ALLOWED_SCREENSHOT_MIME,
  MAX_SCREENSHOT_BYTES,
} from "./constants";
import { BUG_PRIORITIES, BUG_STATUSES, BUG_TYPES } from "@/types/bug";

export const createBugSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters.")
    .max(150, "Title must be at most 150 characters."),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters.")
    .max(5000, "Description must be at most 5000 characters."),
  type: z.enum(BUG_TYPES).default("BUG"),
  priority: z.enum(BUG_PRIORITIES).default("MEDIUM"),
  email: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(z.string().email("Invalid email address.").optional()),
  turnstileToken: z.string().min(1, "Captcha token is missing."),
  // Collected client-side, all optional, length-capped.
  browser: z.string().max(100).optional(),
  os: z.string().max(100).optional(),
  viewport: z.string().max(30).optional(),
  userAgent: z.string().max(500).optional(),
  language: z.string().max(20).optional(),
  sourceUrl: z.string().max(500).optional(),
});

export type CreateBugInput = z.infer<typeof createBugSchema>;

export function validateScreenshot(file: File): string | null {
  if (!ALLOWED_SCREENSHOT_MIME.includes(file.type as (typeof ALLOWED_SCREENSHOT_MIME)[number])) {
    return "Only PNG, JPG or WEBP images are allowed.";
  }
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return "Screenshot must be at most 5 MB.";
  }
  if (file.size === 0) {
    return "Screenshot file is empty.";
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
