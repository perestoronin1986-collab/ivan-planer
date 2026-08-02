"use client";

import { useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Icon button guarded by a confirmation dialog.
 *
 * Extracted from ConfirmDeleteButton so destructive-looking but non-delete
 * actions (ending a recurring series) can reuse the same interaction without
 * copying the busy-state handling.
 */
export function ConfirmActionButton({
  onConfirm,
  icon,
  message,
  description,
  confirmLabel,
  busyLabel,
  confirmClassName = "bg-red-600 text-white hover:bg-red-700",
  className,
  ariaLabel,
}: {
  onConfirm: () => void | Promise<void>;
  icon: ReactNode;
  message: string;
  description?: string;
  confirmLabel: string;
  busyLabel: string;
  confirmClassName?: string;
  className?: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) setOpen(next);
      }}
    >
      <AlertDialogTrigger
        type="button"
        className={className}
        aria-label={ariaLabel}
      >
        {icon}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{message}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            className={confirmClassName}
          >
            {busy ? busyLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
