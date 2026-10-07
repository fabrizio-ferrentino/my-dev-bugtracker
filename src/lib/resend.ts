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
