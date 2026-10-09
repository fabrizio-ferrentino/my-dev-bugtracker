import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  STATUS_LOOKUP_LIMIT,
  checkRateLimit,
} from "@/lib/rate-limit";
import { ticketNumberSchema } from "@/lib/validation";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getLang } from "@/lib/i18n/server";
import { getClientIp } from "@/lib/utils";
import type { PublicReply, PublicTicketInfo } from "@/types/bug";

export const runtime = "nodejs";

/**
 * Public ticket-status lookup (spec §18–19).
 * - ?token=<public_access_token> → fuller public-safe info + public replies.
 * - ?ticket=BUG-XXXX-XXXX → minimal info only (number, status, updated_at)
 *   so sequential numbers cannot leak anything sensitive, not even titles.
 * NEVER returns admin_notes, email, user_agent or technical details.
 */
export async function GET(req: Request) {
  const lang = getLang();
  const t = dictionaries[lang];
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(
    `status:lookup:${ip}`,
    STATUS_LOOKUP_LIMIT.limit,
    STATUS_LOOKUP_LIMIT.windowMs,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: t.api.tooManyStatus },
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
    return NextResponse.json({ error: t.api.provideTicket }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminSupabase();
  } catch (err) {
    console.error("[api/status] supabase misconfigured:", err);
    return NextResponse.json({ error: t.api.generic }, { status: 500 });
  }

  if (token) {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json({ error: t.api.notFound }, { status: 404 });
    }
    const { data, error } = await supabase
      .from("bug_reports")
      .select("id,ticket_number,title,type,priority,status,app,created_at,updated_at")
      .eq("public_access_token", token)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: t.api.notFound }, { status: 404 });
    }
    // Public replies: only via the personal link, never via ticket number.
    // Best-effort — a thread read failure must not hide the ticket status.
    const { data: comments, error: repliesError } = await supabase
      .from("bug_comments")
      .select("id,body,created_at")
      .eq("bug_id", data.id)
      .order("created_at", { ascending: true })
      .limit(50);
    if (repliesError) {
      console.error("[api/status] replies lookup failed:", repliesError.message);
    }
    const replies = (comments ?? []) as PublicReply[];
    const { id: _id, ...ticket } = data;
    return NextResponse.json({ ticket: ticket as PublicTicketInfo, replies });
  }

  const parsed = ticketNumberSchema.safeParse(ticket);
  if (!parsed.success) {
    return NextResponse.json({ error: t.api.badFormat }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("bug_reports")
    // No title here: ticket numbers are sequential (BUG-YYYY-NNNN), so
    // anything returned for a bare number can be enumerated. Only the
    // personal link (?token=) reveals the title and details.
    .select("ticket_number,status,updated_at")
    .eq("ticket_number", parsed.data)
    .single();
  if (error || !data) {
    // Same message as invalid token — do not reveal existence.
    return NextResponse.json({ error: t.api.notFound }, { status: 404 });
  }
  return NextResponse.json({
    ticket: data,
    limited: true,
    hint: t.api.statusHint,
  });
}
