"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { adminUpdateSchema } from "@/lib/validation";

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
  const parsed = adminUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid values provided." };
  }
  const next = parsed.data;

  let ctx;
  try {
    ctx = await requireAdmin();
  } catch {
    return { ok: false, error: "Not authenticated." };
  }
  const { supabase, user } = ctx;

  const { data: current, error: fetchError } = await supabase
    .from("bug_reports")
    .select("status,priority,type,admin_notes")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return { ok: false, error: "Ticket not found." };
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
    return { ok: false, error: "Could not save changes. Please try again." };
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
