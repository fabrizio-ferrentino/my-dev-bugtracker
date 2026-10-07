"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTicket } from "@/app/admin/actions";

export function DeleteTicketButton({
  id,
  ticketNumber,
}: {
  id: string;
  ticketNumber: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteTicket(id);
    if (result.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError(result.error ?? "Could not delete the ticket.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="outline"
        size="sm"
        type="button"
        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        onClick={() => setConfirming(true)}
      >
        <Trash2 aria-hidden />
        Delete
      </Button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label={`Delete ${ticketNumber}?`}
      className="flex flex-wrap items-center gap-2 rounded-md border border-red-300 bg-red-50 p-2 text-sm dark:border-red-900 dark:bg-red-950"
    >
      <span className="font-medium">Delete {ticketNumber} permanently?</span>
      <Button
        variant="destructive"
        size="sm"
        type="button"
        disabled={deleting}
        onClick={handleDelete}
      >
        {deleting ? (
          <Loader2 aria-hidden className="animate-spin" />
        ) : (
          <Trash2 aria-hidden />
        )}
        Yes, delete
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        disabled={deleting}
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
      >
        Cancel
      </Button>
      {error && (
        <p role="alert" className="w-full text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
