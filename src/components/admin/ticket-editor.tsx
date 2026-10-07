"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateTicket } from "@/app/admin/actions";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { BugPriority, BugStatus, BugType } from "@/types/bug";
import { BUG_PRIORITIES, BUG_STATUSES, BUG_TYPES } from "@/types/bug";

interface Props {
  id: string;
  t: Dict;
  initial: {
    status: BugStatus;
    priority: BugPriority;
    type: BugType;
    adminNotes: string;
  };
}

export function TicketEditor({ id, t, initial }: Props) {
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
      setMessage({ ok: true, text: t.detail.saved });
    } else {
      setMessage({ ok: false, text: result.error ?? t.detail.saveError });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-status">{t.detail.status}</Label>
          <Select
            id="edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as BugStatus)}
          >
            {BUG_STATUSES.map((v) => (
              <option key={v} value={v}>
                {t.statuses[v]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-priority">{t.detail.priority}</Label>
          <Select
            id="edit-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as BugPriority)}
          >
            {BUG_PRIORITIES.map((v) => (
              <option key={v} value={v}>
                {t.priorities[v]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-type">{t.detail.type}</Label>
          <Select
            id="edit-type"
            value={type}
            onChange={(e) => setType(e.target.value as BugType)}
          >
            {BUG_TYPES.map((v) => (
              <option key={v} value={v}>
                {t.types[v]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-notes">{t.detail.notes}</Label>
        <Textarea
          id="edit-notes"
          rows={5}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder={t.detail.notesPlaceholder}
        />
      </div>

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded-lg p-3 text-sm ring-1 ring-inset ${
            message.ok
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300"
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
          {t.detail.save}
        </Button>
      </div>
    </div>
  );
}
