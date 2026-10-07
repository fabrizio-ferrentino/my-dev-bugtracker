import { Resend } from "resend";
import { appUrl, siteName } from "./constants";
import type { BugReport } from "@/types/bug";
import { PRIORITY_LABELS, TYPE_LABELS } from "./constants";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/**
 * Notify the admin about a new ticket (spec §20). Best-effort:
 * failures are logged but never fail ticket creation.
 */
export async function sendNewTicketEmail(ticket: BugReport): Promise<void> {
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

  try {
    await resend.emails.send({
      from,
      to: adminEmail,
      subject: `New report ${ticket.ticket_number} — ${ticket.title}`,
      text: [
        `New report ${ticket.ticket_number}`,
        ``,
        `Title: ${ticket.title}`,
        `Priority: ${PRIORITY_LABELS[ticket.priority]}`,
        `Type: ${TYPE_LABELS[ticket.type]}`,
        ...(ticket.app ? [`Application: ${ticket.app}`] : []),
        ticket.email ? `Reporter: ${ticket.email}` : `Reporter: (no email)`,
        ``,
        `Description:`,
        description,
        ``,
        `Open ticket: ${adminLink}`,
        ``,
        `--`,
        `${siteName} notifications`,
      ].join("\n"),
    });
  } catch (err) {
    // Never break ticket creation because of email.
    console.error("[email] failed to send new-ticket notification:", err);
  }
}
