"use client";

import { useState } from "react";
import { Loader2, MessageSquareText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addPublicReply, deletePublicReply } from "@/app/admin/actions";
import { formatDateTime } from "@/lib/utils";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { BugComment } from "@/types/bug";

interface Props {
  id: string;
  t: Dict;
  locale: string;
  hasReporterEmail: boolean;
  initialReplies: BugComment[];
}

const MAX_LEN = 2000;

export function PublicReplies({
  id,
  t,
  locale,
  hasReporterEmail,
  initialReplies,
}: Props) {
  const [replies, setReplies] = useState<BugComment[]>(initialReplies);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= MAX_LEN && !sending;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setMessage(null);
    const result = await addPublicReply(id, { body: trimmed });
    if (result.ok && result.reply) {
      const reply = result.reply;
      setReplies((prev) => [...prev, reply]);
      setBody("");
      setMessage({
        ok: true,
        text: result.notified ? t.detail.repliesSent : t.detail.repliesSentNoNotify,
      });
    } else {
      setMessage({ ok: false, text: result.error ?? t.detail.saveError });
    }
    setSending(false);
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId);
    setMessage(null);
    const result = await deletePublicReply(id, commentId);
    setDeletingId(null);
    setConfirmingDelete(null);
    if (result.ok) {
      setReplies((prev) => prev.filter((r) => r.id !== commentId));
    } else {
      setMessage({ ok: false, text: result.error ?? t.detail.saveError });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!hasReporterEmail && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300">
          {t.detail.repliesNoEmail}
        </p>
      )}

      {replies.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <MessageSquareText aria-hidden className="size-4" />
          {t.detail.repliesEmpty}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {replies.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.body}</p>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <time
                  dateTime={r.created_at}
                  className="font-mono text-xs text-zinc-400"
                >
                  {formatDateTime(r.created_at, locale)}
                </time>
                {confirmingDelete === r.id ? (
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">{t.detail.repliesDeleteConfirm}</span>
                    <button
                      type="button"
                      disabled={deletingId === r.id}
                      onClick={() => void handleDelete(r.id)}
                      className="font-semibold text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                    >
                      {deletingId === r.id ? (
                        <Loader2 aria-hidden className="size-3.5 animate-spin" />
                      ) : (
                        t.detail.deleteYes
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === r.id}
                      onClick={() => setConfirmingDelete(null)}
                      className="text-zinc-500 hover:text-zinc-900 hover:underline disabled:opacity-50 dark:hover:text-zinc-100"
                    >
                      {t.detail.cancel}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={t.detail.repliesDelete}
                    title={t.detail.repliesDelete}
                    onClick={() => setConfirmingDelete(r.id)}
                    className="inline-flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div>
        <label htmlFor="public-reply" className="sr-only">
          {t.detail.repliesTitle}
        </label>
        <Textarea
          id="public-reply"
          rows={3}
          value={body}
          maxLength={MAX_LEN}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.detail.repliesPlaceholder}
        />
        <p className="mt-1 text-right font-mono text-xs text-zinc-400">
          {trimmed.length}/{MAX_LEN}
        </p>
      </div>

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={
            message.ok
              ? "rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-300"
          }
        >
          {message.text}
        </p>
      )}

      <Button type="button" disabled={!canSend} onClick={() => void handleSend()}>
        {sending ? <Loader2 aria-hidden className="animate-spin" /> : null}
        {sending ? t.detail.repliesSending : t.detail.repliesSend}
      </Button>
    </div>
  );
}
