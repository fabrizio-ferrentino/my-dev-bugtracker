"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateTicket } from "@/app/admin/actions";
import type { BugPriority, BugStatus, BugType } from "@/types/bug";

interface Props {
  id: string;
  initial: {
    status: BugStatus;
    priority: BugPriority;
    type: BugType;
    adminNotes: string;
  };
}

export function TicketEditor({ id, initial }: Props) {
  const [status, setStatus] = useState<BugStatus>(initial.status);
  const [priority, setPriority] = useState<BugPriority>(initial.priority);
  const [type, setType] = useState<BugType>(initial.type);
  const [adminNotes, setAdminNotes] = useState(initial.adminNotes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty =
    status !== initial.status ||
    priority !== initial.priority ||
    type !== initial.type ||
    adminNotes !== initial.adminNotes;

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const result = await updateTicket(id, {
      status,
      priority,
      type,
      adminNotes: adminNotes.trim() === "" ? null : adminNotes,
    });
    setSaving(false);
    if (result.ok) {
      setMessage({ ok: true, text: "Changes saved." });
    } else {
      setMessage({ ok: false, text: result.error ?? "Could not save changes." });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-status">Status</Label>
          <Select
            id="edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as BugStatus)}
          >
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-priority">Priority</Label>
          <Select
            id="edit-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as BugPriority)}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-type">Type</Label>
          <Select
            id="edit-type"
            value={type}
            onChange={(e) => setType(e.target.value as BugType)}
          >
            <option value="BUG">Bug</option>
            <option value="UI_UX">UI / UX</option>
            <option value="PERFORMANCE">Performance</option>
            <option value="FEATURE_REQUEST">Feature Request</option>
            <option value="SECURITY">Security</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-notes">Internal notes (admins only)</Label>
        <Textarea
          id="edit-notes"
          rows={5}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Private notes — never shown to the reporter."
        />
      </div>

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded-md p-3 text-sm ${
            message.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {message.text}
        </p>
      )}

      <div>
        <Button onClick={handleSave} disabled={saving || !dirty}>
          {saving ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <Save aria-hidden />
          )}
          Save changes
        </Button>
      </div>
    </div>
  );
}
