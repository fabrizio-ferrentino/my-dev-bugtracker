import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  STATUS_LOOKUP_LIMIT,
  checkRateLimit,
} from "@/lib/rate-limit";
import { ticketNumberSchema } from "@/lib/validation";
import { getClientIp } from "@/lib/utils";
import type { PublicTicketInfo } from "@/types/bug";

export const runtime = "nodejs";

/**
 * Public ticket-status lookup (spec §18–19).
 * - ?token=<public_access_token> → fuller public-safe info.
 * - ?ticket=BUG-YYYY-NNNN → minimal info only (number, title, status,
 *   updated_at) so sequential numbers cannot leak anything sensitive.
 * NEVER returns admin_notes, email, user_agent or technical details.
 */
export async function GET(req: Request) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(
    `status:lookup:${ip}`,
    STATUS_LOOKUP_LIMIT.limit,
    STATUS_LOOKUP_LIMIT.windowMs,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      },
    );
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token")?.trim() || "";
  const ticket = searchParams.get("ticket")?.trim().toUpperCase() || "";

  if (!token && !ticket) {
    return NextResponse.json(
      { error: "Provide a ticket number or an access link." },
      { status: 400 },
    );
  }

  let supabase;
  try {
    supabase = createAdminSupabase();
  } catch (err) {
    console.error("[api/status] supabase misconfigured:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  if (token) {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    const { data, error } = await supabase
      .from("bug_reports")
      .select("ticket_number,title,type,priority,status,app,created_at,updated_at")
      .eq("public_access_token", token)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    return NextResponse.json({ ticket: data as PublicTicketInfo });
  }

  const parsed = ticketNumberSchema.safeParse(ticket);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid ticket format. Expected e.g. BUG-2026-0001." },
      { status: 400 },
    );
  }
  const { data, error } = await supabase
    .from("bug_reports")
    .select("ticket_number,title,status,updated_at")
    .eq("ticket_number", parsed.data)
    .single();
  if (error || !data) {
    // Same message as invalid token — do not reveal existence.
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }
  return NextResponse.json({
    ticket: data,
    limited: true,
    hint: "Open your personal status link (received after reporting) to see full details.",
  });
}
