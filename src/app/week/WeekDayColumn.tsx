"use client";

import { useRef } from "react";
import { CheckSquare, Square } from "lucide-react";
import { toggleTask, createTask } from "@/app/spheres/actions";
import type { TaskStatus } from "@/lib/db";

type Row = {
  id: string;
  title: string;
  status: TaskStatus;
  due_at: string | null;
  carry_count: number;
  sphere: { name: string; color: string; icon: string | null } | null;
};

type Sphere = { id: string; name: string; icon: string | null };
type Project = { id: string; name: string };

export function WeekDayColumn({
  dayLabel,
  dayKey,
  today,
  tasks,
  spheres,
  projects,
}: {
  dayLabel: string;
  dayKey: string;
  today: boolean;
  tasks: Row[];
  spheres: Sphere[];
  projects: Project[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div
      className={`min-h-32 rounded-lg border p-2 space-y-1 ${
        today
          ? "border-neutral-900 dark:border-neutral-100"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <p
          className={`text-sm font-semibold ${
            today ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500"
          }`}
        >
          {dayLabel}
        </p>
        <button
          onClick={() => dialogRef.current?.showModal()}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 text-sm leading-none"
          title="Добавить задачу"
        >
          +
        </button>
      </div>

      {tasks.map((t) => (
        <div key={t.id} className="flex items-start gap-1">
          <form action={toggleTask.bind(null, t.id, t.status !== "done")}>
            <button
              type="submit"
              className="mt-0.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 flex-shrink-0"
            >
              {t.status === "done" ? <CheckSquare size={12} /> : <Square size={12} />}
            </button>
          </form>
          <span
            className={`flex-1 text-xs leading-tight min-w-0 break-words ${
              t.status === "done" ? "line-through text-neutral-400" : ""
            }`}
          >
            {t.title}
            {t.carry_count > 0 && (
              <span className="ml-1 text-amber-500" title={`Перенесено ${t.carry_count} раз`}>
                ↩
              </span>
            )}
          </span>
          {t.sphere && (
            t.sphere.icon ? (
              <span className="text-xs flex-shrink-0 leading-none mt-0.5" title={t.sphere.name}>
                {t.sphere.icon}
              </span>
            ) : (
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1"
                style={{ background: t.sphere.color }}
                title={t.sphere.name}
              />
            )
          )}
        </div>
      ))}

      {tasks.length === 0 && (
        <p className="text-xs text-neutral-300 dark:text-neutral-700">—</p>
      )}

      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-xl border border-neutral-200 p-6 shadow-xl backdrop:bg-black/40 dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <h2 className="mb-4 text-base font-semibold">Задача на {dayLabel}</h2>
        <form
          action={async (fd) => {
            await createTask(fd);
            dialogRef.current?.close();
          }}
          className="space-y-3"
        >
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Название</label>
            <input
              name="title"
              required
              placeholder="Что нужно сделать?"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Сфера</label>
            <select
              name="sphereId"
              required
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            >
              <option value="">— выберите сферу —</option>
              {spheres.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon ? `${s.icon} ` : ""}
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Проект (необязательно)</label>
            <select
              name="projectId"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            >
              <option value="">— без проекта —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <input type="hidden" name="dueAt" value={dayKey} />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
            >
              Добавить
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
