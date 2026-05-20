"use client";

import { useRef } from "react";
import { createTask } from "@/app/spheres/actions";

type Sphere = { id: string; name: string; icon: string | null };
type Project = { id: string; name: string };

export function AddTaskModal({
  spheres,
  projects,
  todayDefault,
}: {
  spheres: Sphere[];
  projects: Project[];
  todayDefault: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        onClick={() => dialogRef.current?.showModal()}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
      >
        + Новая задача
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-xl border border-neutral-200 p-6 shadow-xl backdrop:bg-black/40 dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current?.close(); }}
      >
        <h2 className="mb-4 text-base font-semibold">Новая задача</h2>
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
                  {s.icon ? `${s.icon} ` : ""}{s.name}
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
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Дата</label>
            <input
              name="dueAt"
              type="datetime-local"
              defaultValue={todayDefault}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Если просрочить</label>
            <select
              name="overdueAction"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            >
              <option value="">— не выбрано —</option>
              <option value="reschedule">Перенести на следующий день</option>
              <option value="autocomplete">Закрыть автоматически</option>
            </select>
          </div>

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
    </>
  );
}
