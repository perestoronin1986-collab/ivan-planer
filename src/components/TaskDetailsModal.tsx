"use client";

import { useEffect, useRef, useState } from "react";
import type { TaskRow } from "@/lib/db";
import { updateTaskLocal } from "@/lib/local/mutations";
import { PrioritySelector } from "@/components/ui/PrioritySelector";
import { RemindAtPicker } from "@/components/ui/RemindAtPicker";
import type { Priority } from "@/lib/priority";
import {
  dialogClass,
  inputClass,
  labelClass,
  primaryBtnClass,
  ghostBtnClass,
} from "@/components/ui/formStyles";

export function TaskDetailsModal({
  task,
  open,
  onClose,
}: {
  task: TaskRow;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<Priority>(
    ((task.priority as Priority) ?? 4) as Priority,
  );
  const [dueAt, setDueAt] = useState<string>(
    task.due_at ? task.due_at.slice(0, 10) : "",
  );
  const [remindAt, setRemindAt] = useState<string | null>(task.remind_at);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-sync when task changes (e.g. parent edit) — adjust state during
  // render, чтобы не было лишнего рендера со старыми значениями.
  const syncKey = JSON.stringify([
    task.id, task.title, task.description, task.priority, task.due_at, task.remind_at,
  ]);
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(((task.priority as Priority) ?? 4) as Priority);
    setDueAt(task.due_at ? task.due_at.slice(0, 10) : "");
    setRemindAt(task.remind_at);
    setError(null);
  }

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setError("Название не должно быть пустым");
      return;
    }
    setSaving(true);
    try {
      await updateTaskLocal(task.id, {
        title: t,
        description: description.trim() || null,
        priority,
        due_at: dueAt ? new Date(dueAt + "T00:00:00").toISOString() : null,
        remind_at: remindAt,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={dialogClass}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <h2 className="mb-4 text-base font-bold text-[var(--ink)]">
        ✏️ Редактировать задачу
      </h2>
      <form onSubmit={save} className="space-y-3">
        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="space-y-1">
          <label className={labelClass}>Название</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Заметки, ссылки (https://...)"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Приоритет</label>
          <PrioritySelector value={priority} onChange={setPriority} />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Срок</label>
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Напоминание</label>
          <RemindAtPicker
            value={remindAt}
            dueAt={dueAt ? new Date(dueAt + "T18:00").toISOString() : null}
            onChange={setRemindAt}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 ${ghostBtnClass}`}
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`flex-1 ${primaryBtnClass} disabled:opacity-50`}
          >
            Сохранить
          </button>
        </div>
      </form>
    </dialog>
  );
}
