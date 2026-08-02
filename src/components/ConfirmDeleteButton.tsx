"use client";

import { Trash2 } from "lucide-react";

import { ConfirmActionButton } from "@/components/ConfirmActionButton";

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
  return (
    <ConfirmActionButton
      onConfirm={onConfirm}
      icon={<Trash2 size={size} />}
      message={message}
      description={description}
      confirmLabel="Удалить"
      busyLabel="Удаляю…"
      className={className ?? "text-neutral-400 hover:text-red-500"}
      ariaLabel={ariaLabel}
    />
  );
}
