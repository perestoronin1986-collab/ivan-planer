"use client";

import { useState } from "react";
import { CheckSquare, Square, Pencil, Check, X } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import type { TaskRow, SphereRow, ProjectRow } from "@/lib/db";
import {
  toggleTaskStatusLocal,
  updateTaskLocal,
  deleteTaskLocal,
} from "@/lib/local/mutations";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

type SphereLite = Pick<SphereRow, "id" | "name" | "color" | "icon">;
type ProjectLite = Pick<ProjectRow, "id" | "name">;

export function TaskItem({
  task,
  sphere,
  project,
  accentDate,
  showSphere = true,
  showProject = true,
  showDate = true,
}: {
  task: TaskRow;
  sphere?: SphereLite | null;
  project?: ProjectLite | null;
  accentDate?: boolean;
  showSphere?: boolean;
  showProject?: boolean;
  showDate?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const done = task.status === "done";
  const overdue =
    task.due_at && !done ? new Date(task.due_at) < new Date() : false;

  const subtasks = useLiveQuery(
    async () => {
      if (task.rrule) return [];
      return localDb()
        .task.where("parent_id")
        .equals(task.id)
        .filter((t) => !t.deleted_at)
        .sortBy("created_at");
    },
    [task.id, task.rrule],
  );

  async function saveTitle() {
    const next = draft.trim();
    if (!next || next === task.title) {
      setDraft(task.title);
      setEditing(false);
      return;
    }
    await updateTaskLocal(task.id, { title: next });
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(task.title);
    setEditing(false);
  }

  const checklistItems = subtasks ?? [];
  const checklistDone = checklistItems.filter((s) => s.status === "done").length;
  const hasChecklist = checklistItems.length > 0;

  return (
    <div className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => toggleTaskStatusLocal(task.id)}
          className="flex flex-shrink-0 items-center justify-center px-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          aria-label={done ? "Снять отметку" : "Выполнить"}
        >
          {done ? <CheckSquare size={28} /> : <Square size={28} />}
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-center gap-1.5">
            {editing ? (
              <>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  autoFocus
                  className="min-w-0 flex-1 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900"
                />
                <button
                  type="button"
                  onClick={saveTitle}
                  className="text-emerald-600 hover:text-emerald-700"
                  aria-label="Сохранить"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  aria-label="Отмена"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <span
                  className={`min-w-0 flex-1 break-words text-sm ${
                    done ? "text-neutral-400 line-through" : ""
                  }`}
                >
                  {task.title}
                </span>
                {task.carry_count > 0 && (
                  <span
                    className="flex-shrink-0 text-xs font-medium text-amber-500"
                    title={`Перенесено ${task.carry_count} раз`}
                  >
                    ↩{task.carry_count > 1 ? task.carry_count : ""}
                  </span>
                )}
                {hasChecklist && (
                  <span className="flex-shrink-0 text-xs text-neutral-400">
                    {checklistDone}/{checklistItems.length}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDraft(task.title);
                    setEditing(true);
                  }}
                  className="flex-shrink-0 text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
                  aria-label="Редактировать"
                >
                  <Pencil size={14} />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            {showSphere && sphere && (
              <span className="flex items-center gap-1">
                {sphere.icon ? (
                  <span>{sphere.icon}</span>
                ) : (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: sphere.color }}
                  />
                )}
                <span>{sphere.name}</span>
              </span>
            )}
            {showProject && project && (
              <span className="truncate">/ {project.name}</span>
            )}
            {showDate && task.due_at && (
              <span className={accentDate || overdue ? "text-red-500" : ""}>
                {new Date(task.due_at).toLocaleDateString("ru")}
              </span>
            )}
            {!sphere && !project && !task.due_at && (
              <span className="text-neutral-300 dark:text-neutral-700">—</span>
            )}
            <div className="ml-auto flex-shrink-0">
              <ConfirmDeleteButton
                onConfirm={() => deleteTaskLocal(task.id)}
                message="Удалить задачу?"
                description={task.title}
                className="text-neutral-300 hover:text-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      {hasChecklist && (
        <div className="mt-2 space-y-1 border-t border-neutral-100 pt-2 pl-10 dark:border-neutral-800">
          {checklistItems.map((sub) => (
            <div key={sub.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleTaskStatusLocal(sub.id)}
                className="flex-shrink-0 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                aria-label={sub.status === "done" ? "Снять отметку" : "Отметить"}
              >
                {sub.status === "done" ? (
                  <CheckSquare size={16} />
                ) : (
                  <Square size={16} />
                )}
              </button>
              <span
                className={`min-w-0 flex-1 break-words text-sm ${
                  sub.status === "done"
                    ? "text-neutral-400 line-through"
                    : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {sub.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
