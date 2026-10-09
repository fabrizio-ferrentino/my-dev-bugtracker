import { Resend } from "resend";
import { appUrl, siteName } from "./constants";
import type { Dict } from "./i18n/dictionaries";
import type { BugReport } from "@/types/bug";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/**
 * Notify the admin about a new ticket (spec §20). Best-effort:
 * failures are logged but never fail ticket creation.
 */
export async function sendNewTicketEmail(
  ticket: BugReport,
  t: Dict,
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const resend = getResend();

  if (!resend || !adminEmail || !from) {
    console.warn(
      "[email] Resend not configured (RESEND_API_KEY/ADMIN_EMAIL/RESEND_FROM_EMAIL) — skipping notification.",
    );
    return;
  }

  const adminLink = `${appUrl}/admin/bugs/${ticket.id}`;
  const description =
    ticket.description.length > 1200
      ? ticket.description.slice(0, 1200) + "…"
      : ticket.description;
  const e = t.email;

  try {
    await resend.emails.send({
      from,
      to: adminEmail,
      subject: `${e.subjectPrefix} ${ticket.ticket_number} — ${ticket.title}`,
      text: [
        `${e.subjectPrefix} ${ticket.ticket_number}`,
        ``,
        `${e.title} ${ticket.title}`,
        `${e.priority} ${t.priorities[ticket.priority]}`,
        `${e.type} ${t.types[ticket.type]}`,
        ...(ticket.app ? [`${e.application} ${ticket.app}`] : []),
        `${e.reporter} ${ticket.email ?? e.noReporter}`,
        ``,
        `${e.description}`,
        description,
        ``,
        `${e.openTicket} ${adminLink}`,
        ``,
        `--`,
        `${siteName} ${e.footer}`,
      ].join("\n"),
    });
  } catch (err) {
    // Never break ticket creation because of email.
    console.error("[email] failed to send new-ticket notification:", err);
  }
}

/**
 * Notify the reporter about a new public reply (best-effort).
 * Call only when the ticket has a reporter email; failures are logged
 * but never fail the admin action. Returns true only if Resend accepted it.
 */
export async function sendPublicReplyEmail(
  to: string,
  ticket: { ticket_number: string; title: string },
  replyBody: string,
  statusUrl: string,
  t: Dict,
): Promise<boolean> {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const resend = getResend();

  if (!resend || !from) {
    console.warn(
      "[email] Resend not configured (RESEND_API_KEY/RESEND_FROM_EMAIL) — skipping reply notification.",
    );
    return false;
  }

  const e = t.email;
  const excerpt = replyBody.length > 800 ? replyBody.slice(0, 800) + "…" : replyBody;

  try {
    // Resend reports API failures in `error` instead of throwing.
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `${e.replySubject} ${ticket.ticket_number}`,
      text: [
        `${e.replyHeading} ${ticket.ticket_number} — ${ticket.title}`,
        ``,
        excerpt,
        ``,
        `${e.viewReply} ${statusUrl}`,
        ``,
        `--`,
        `${siteName} ${e.footer}`,
      ].join("\n"),
    });
    if (error) {
      console.error("[email] failed to send public-reply notification:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] failed to send public-reply notification:", err);
    return false;
  }
}
