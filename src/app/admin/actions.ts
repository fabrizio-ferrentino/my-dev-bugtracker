"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { adminReplySchema, adminUpdateSchema } from "@/lib/validation";
import { sendPublicReplyEmail } from "@/lib/resend";
import { appUrl } from "@/lib/constants";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getLang } from "@/lib/i18n/server";
import type { BugComment } from "@/types/bug";

async function requireAdmin() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const allowlist = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (allowlist && user.email?.toLowerCase() !== allowlist) {
    throw new Error("Not authorized.");
  }
  return { supabase, user };
}

export interface UpdateTicketResult {
  ok: boolean;
  error?: string;
}

/** Update status / priority / type / internal notes + write audit events. */
export async function updateTicket(
  id: string,
  input: unknown,
): Promise<UpdateTicketResult> {
  const t = dictionaries[getLang()];
  const parsed = adminUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.detail.invalid };
  }
  const next = parsed.data;

  let ctx;
  try {
    ctx = await requireAdmin();
  } catch {
    return { ok: false, error: t.api.generic };
  }
  const { supabase, user } = ctx;

  const { data: current, error: fetchError } = await supabase
    .from("bug_reports")
    .select("status,priority,type,admin_notes")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return { ok: false, error: t.api.notFound };
  }

  const { error: updateError } = await supabase
    .from("bug_reports")
    .update({
      status: next.status,
      priority: next.priority,
      type: next.type,
      admin_notes: next.adminNotes,
    })
    .eq("id", id);

  if (updateError) {
    console.error("[admin] update failed:", updateError.message);
    return { ok: false, error: t.detail.saveError };
  }

  const events: {
    bug_id: string;
    event_type: "STATUS_CHANGED" | "PRIORITY_CHANGED" | "TYPE_CHANGED" | "NOTE_ADDED";
    old_value: string | null;
    new_value: string | null;
    created_by: string;
  }[] = [];
  if (current.status !== next.status) {
    events.push({
      bug_id: id,
      event_type: "STATUS_CHANGED",
      old_value: current.status,
      new_value: next.status,
      created_by: user.id,
    });
  }
  if (current.priority !== next.priority) {
    events.push({
      bug_id: id,
      event_type: "PRIORITY_CHANGED",
      old_value: current.priority,
      new_value: next.priority,
      created_by: user.id,
    });
  }
  if (current.type !== next.type) {
    events.push({
      bug_id: id,
      event_type: "TYPE_CHANGED",
      old_value: current.type,
      new_value: next.type,
      created_by: user.id,
    });
  }
  if ((current.admin_notes ?? null) !== next.adminNotes) {
    events.push({
      bug_id: id,
      event_type: "NOTE_ADDED",
      old_value: null,
      new_value: "Internal notes updated",
      created_by: user.id,
    });
  }
  if (events.length > 0) {
    const { error: eventError } = await supabase.from("bug_events").insert(events);
    if (eventError) {
      console.error("[admin] audit insert failed:", eventError.message);
    }
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/bugs/${id}`);
  return { ok: true };
}

export interface AddPublicReplyResult extends UpdateTicketResult {
  /** The stored row, so the client can render (and delete) it right away. */
  reply?: BugComment;
  /** True only if the reporter notification email was accepted. */
  notified?: boolean;
}

/**
 * Publish an admin reply visible on the personal status page + audit event.
 * Notifies the reporter by email when an address is present (best-effort,
 * never fails the action).
 */
export async function addPublicReply(
  id: string,
  input: unknown,
): Promise<AddPublicReplyResult> {
  const t = dictionaries[getLang()];
  const parsed = adminReplySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.detail.invalid };
  }
  const body = parsed.data.body;

  let ctx;
  try {
    ctx = await requireAdmin();
  } catch {
    return { ok: false, error: t.api.generic };
  }
  const { supabase, user } = ctx;

  const { data: ticket, error: fetchError } = await supabase
    .from("bug_reports")
    .select("id,ticket_number,title,email,public_access_token")
    .eq("id", id)
    .single();

  if (fetchError || !ticket) {
    return { ok: false, error: t.api.notFound };
  }

  const { data: reply, error: insertError } = await supabase
    .from("bug_comments")
    .insert({
      bug_id: id,
      body,
      author: "ADMIN",
      created_by: user.id,
    })
    .select("*")
    .single();

  if (insertError || !reply) {
    console.error("[admin] public reply insert failed:", insertError?.message);
    return { ok: false, error: t.detail.saveError };
  }

  const { error: eventError } = await supabase.from("bug_events").insert({
    bug_id: id,
    event_type: "PUBLIC_REPLY_ADDED",
    old_value: null,
    new_value: body.length > 200 ? body.slice(0, 200) + "…" : body,
    created_by: user.id,
  });
  if (eventError) {
    console.error("[admin] audit insert failed:", eventError.message);
  }

  // Notify the reporter (best-effort; sendPublicReplyEmail never throws).
  let notified = false;
  if (ticket.email) {
    const statusUrl = `${appUrl}/status?token=${encodeURIComponent(ticket.public_access_token)}`;
    notified = await sendPublicReplyEmail(
      ticket.email,
      { ticket_number: ticket.ticket_number, title: ticket.title },
      body,
      statusUrl,
      dictionaries[process.env.EMAIL_LANG === "en" ? "en" : "it"],
    );
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/bugs/${id}`);
  return { ok: true, reply: reply as BugComment, notified };
}

/** Delete a public reply + audit event. The public thread updates live. */
export async function deletePublicReply(
  bugId: string,
  commentId: string,
): Promise<UpdateTicketResult> {
  const t = dictionaries[getLang()];
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch {
    return { ok: false, error: t.api.generic };
  }
  const { supabase, user } = ctx;

  const { data: comment, error: fetchError } = await supabase
    .from("bug_comments")
    .select("id,bug_id")
    .eq("id", commentId)
    .eq("bug_id", bugId)
    .single();

  if (fetchError || !comment) {
    return { ok: false, error: t.api.notFound };
  }

  const { error: deleteError } = await supabase
    .from("bug_comments")
    .delete()
    .eq("id", commentId);

  if (deleteError) {
    console.error("[admin] public reply delete failed:", deleteError.message);
    return { ok: false, error: t.detail.saveError };
  }

  const { error: eventError } = await supabase.from("bug_events").insert({
    bug_id: bugId,
    event_type: "PUBLIC_REPLY_DELETED",
    old_value: null,
    new_value: null,
    created_by: user.id,
  });
  if (eventError) {
    console.error("[admin] audit insert failed:", eventError.message);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/bugs/${bugId}`);
  return { ok: true };
}

/** Signed URL for the ticket screenshot (bucket is private). */
export async function getScreenshotUrl(
  path: string,
): Promise<{ url: string | null }> {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase.storage
      .from("screenshots")
      .createSignedUrl(path, 300);
    if (error || !data) return { url: null };
    return { url: data.signedUrl };
  } catch {
    return { url: null };
  }
}

/** Permanently delete a ticket, its screenshot and its history. */
export async function deleteTicket(
  id: string,
): Promise<UpdateTicketResult> {
  const t = dictionaries[getLang()];
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch {
    return { ok: false, error: t.api.generic };
  }
  const { supabase } = ctx;

  const { data: current, error: fetchError } = await supabase
    .from("bug_reports")
    .select("id,screenshot_path")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return { ok: false, error: t.api.notFound };
  }

  // Delete the row first: if it fails, the ticket keeps its screenshot.
  // bug_events / bug_comments rows are removed automatically (ON DELETE CASCADE).
  const { error: deleteError } = await supabase
    .from("bug_reports")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[admin] delete failed:", deleteError.message);
    return { ok: false, error: t.detail.saveError };
  }

  // Remove the screenshot via service-role (no authenticated delete policy).
  // Best-effort: an orphaned file is harmless, the ticket is already gone.
  if (current.screenshot_path) {
    try {
      const admin = createAdminSupabase();
      const { error: rmError } = await admin.storage
        .from("screenshots")
        .remove([current.screenshot_path]);
      if (rmError) {
        console.error("[admin] screenshot delete failed:", rmError.message);
      }
    } catch (err) {
      console.error("[admin] screenshot delete failed:", err);
    }
  }

  revalidatePath("/admin");
  return { ok: true };
}
