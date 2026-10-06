import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  PUBLIC_CREATE_LIMIT,
  checkRateLimit,
} from "@/lib/rate-limit";
import { createBugSchema, validateScreenshot } from "@/lib/validation";
import { newBugId, newPublicAccessToken } from "@/lib/ticket";
import { sendNewTicketEmail } from "@/lib/resend";
import { getClientIp } from "@/lib/utils";

export const runtime = "nodejs";

const SCREENSHOT_BUCKET = "screenshots";

function extFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function POST(req: Request) {
  const ip = getClientIp(req.headers);

  // 1. Rate limit (per IP, server-side).
  const rl = checkRateLimit(
    `bugs:create:${ip}`,
    PUBLIC_CREATE_LIMIT.limit,
    PUBLIC_CREATE_LIMIT.windowMs,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many reports from this device. Please wait a while and try again.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      },
    );
  }

  // 2. Parse multipart form.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Please try again." },
      { status: 400 },
    );
  }

  const raw = {
    title: form.get("title"),
    description: form.get("description"),
    type: form.get("type"),
    priority: form.get("priority"),
    email: form.get("email"),
    turnstileToken: form.get("turnstileToken"),
    browser: form.get("browser") || undefined,
    os: form.get("os") || undefined,
    viewport: form.get("viewport") || undefined,
    userAgent: form.get("userAgent") || undefined,
    language: form.get("language") || undefined,
    sourceUrl: form.get("sourceUrl") || undefined,
  };

  const parsed = createBugSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!(key in fields)) fields[key] = issue.message;
    }
    return NextResponse.json(
      { error: "Please check the highlighted fields.", fields },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Validate optional screenshot early (before spending Turnstile/DB calls).
  const screenshot = form.get("screenshot");
  const file: File | null =
    screenshot instanceof File && screenshot.size > 0 ? screenshot : null;
  if (file) {
    const fileError = validateScreenshot(file);
    if (fileError) {
      return NextResponse.json(
        { error: fileError, fields: { screenshot: fileError } },
        { status: 400 },
      );
    }
  }

  // 3. Turnstile server-side verification. Ticket is NOT created on failure.
  const human = await verifyTurnstile(input.turnstileToken, ip);
  if (!human) {
    return NextResponse.json(
      { error: "Could not verify the request. Please try again." },
      { status: 400 },
    );
  }

  // 4. Persist via service-role (anon key has INSERT-only RLS, but the
  //    server needs the generated ticket_number + token back).
  let supabase;
  try {
    supabase = createAdminSupabase();
  } catch (err) {
    console.error("[api/bugs] supabase misconfigured:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  const id = newBugId();
  const publicAccessToken = newPublicAccessToken();

  // Mint a human-readable ticket number. Uses the mint_ticket_number()
  // RPC (atomic per-year counter); falls back to a unique random suffix
  // if the RPC is unavailable.
  let ticketNumber: string | null = null;
  try {
    const { data, error } = await supabase.rpc("mint_ticket_number");
    if (!error && typeof data === "string") ticketNumber = data;
  } catch {
    // fall through to fallback below
  }
  if (!ticketNumber) {
    const year = new Date().getUTCFullYear();
    for (let attempt = 0; attempt < 5 && !ticketNumber; attempt++) {
      const candidate = `BUG-${year}-${String(
        Math.floor(1000 + Math.random() * 9000),
      )}`;
      const { error } = await supabase.from("bug_reports").insert({
        id,
        ticket_number: candidate,
        public_access_token: publicAccessToken,
        title: input.title,
        description: input.description,
        type: input.type,
        priority: input.priority,
        status: "OPEN",
        email: input.email ?? null,
        browser: input.browser || null,
        os: input.os || null,
        viewport: input.viewport || null,
        user_agent: input.userAgent || null,
        language: input.language || null,
        source_url: input.sourceUrl || null,
      });
      if (!error) {
        ticketNumber = candidate;
      } else if (error.code !== "23505") {
        console.error("[api/bugs] insert failed:", error.message);
        return NextResponse.json(
          { error: "Something went wrong. Please try again." },
          { status: 500 },
        );
      }
    }
    if (!ticketNumber) {
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }
    // Ticket already inserted by the fallback loop — continue to screenshot.
    await supabase.from("bug_events").insert({
      bug_id: id,
      event_type: "TICKET_CREATED",
    });
    const created = await finishTicket(supabase, id, file);
    return NextResponse.json({
      ok: true,
      ticketNumber,
      statusUrl: publicAccessToken,
      screenshotSaved: created,
    });
  }

  const { error: insertError } = await supabase.from("bug_reports").insert({
    id,
    ticket_number: ticketNumber,
    public_access_token: publicAccessToken,
    title: input.title,
    description: input.description,
    type: input.type,
    priority: input.priority,
    status: "OPEN",
    email: input.email ?? null,
    browser: input.browser || null,
    os: input.os || null,
    viewport: input.viewport || null,
    user_agent: input.userAgent || null,
    language: input.language || null,
    source_url: input.sourceUrl || null,
  });

  if (insertError) {
    console.error("[api/bugs] insert failed:", insertError.message);
    // Extremely rare race on ticket_number — ask the user to retry.
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  await supabase.from("bug_events").insert({
    bug_id: id,
    event_type: "TICKET_CREATED",
  });

  const screenshotSaved = await finishTicket(supabase, id, file);

  return NextResponse.json({
    ok: true,
    ticketNumber,
    statusUrl: publicAccessToken,
    screenshotSaved,
  });
}

/**
 * Upload screenshot (if any), attach path to the ticket, notify admin.
 * Best-effort after the ticket exists — never fails the request.
 */
async function finishTicket(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  id: string,
  file: File | null,
): Promise<boolean> {
  let screenshotSaved = false;
  if (file) {
    try {
      const year = new Date().getUTCFullYear();
      const path = `${year}/${id}.${extFor(file.type)}`;
      const bytes = Buffer.from(await file.arrayBuffer());
      const { error: upError } = await supabase.storage
        .from(SCREENSHOT_BUCKET)
        .upload(path, bytes, {
          contentType: file.type,
          upsert: false,
        });
      if (upError) {
        console.error("[api/bugs] screenshot upload failed:", upError.message);
      } else {
        const { error: updError } = await supabase
          .from("bug_reports")
          .update({ screenshot_path: path })
          .eq("id", id);
        if (updError) {
          console.error("[api/bugs] screenshot path update failed:", updError.message);
        } else {
          screenshotSaved = true;
        }
      }
    } catch (err) {
      console.error("[api/bugs] screenshot handling failed:", err);
    }
  }

  // Notify admin (best-effort inside the helper).
  try {
    const { data } = await supabase
      .from("bug_reports")
      .select("*")
      .eq("id", id)
      .single();
    if (data) await sendNewTicketEmail(data);
  } catch (err) {
    console.error("[api/bugs] post-create notification failed:", err);
  }

  return screenshotSaved;
}
