"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

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

export function ConfirmDeleteButton({
  onConfirm,
  message = "Точно удалить?",
  description,
  size = 14,
  className,
  ariaLabel = "Удалить",
}: {
  onConfirm: () => void | Promise<void>;
  message?: string;
  description?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
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
        className={className ?? "text-neutral-400 hover:text-red-500"}
        aria-label={ariaLabel}
      >
        <Trash2 size={size} />
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
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {busy ? "Удаляю…" : "Удалить"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
