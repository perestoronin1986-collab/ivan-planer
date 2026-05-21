"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "text-neutral-400 hover:text-red-500"}
        aria-label={ariaLabel}
      >
        <Trash2 size={size} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-lg bg-white p-5 shadow-xl dark:bg-neutral-900"
          >
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {message}
            </p>
            {description && (
              <p className="mt-1 text-xs text-neutral-500">{description}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="rounded px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirm}
                className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "Удаляю…" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
