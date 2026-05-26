"use client";

import { useRef, useState } from "react";
import { Square } from "lucide-react";
import { useUserId } from "@/lib/local/useUser";
import { addTaskLocal } from "@/lib/local/mutations";
import { TaskItem } from "@/components/TaskItem";
import type { TaskRow, SphereRow, ProjectRow } from "@/lib/db";

type Sphere = { id: string; name: string; icon: string | null };
type Project = { id: string; name: string };

type SphereLite = Pick<SphereRow, "id" | "name" | "color" | "icon">;
type ProjectLite = Pick<ProjectRow, "id" | "name">;

export function WeekDayColumn({
  dayLabel,
  dayKey,
  today,
  spheres,
  projects,
  tasks,
  sphereById,
  projectById,
  subtasksByParentId,
}: {
  dayLabel: string;
  dayKey: string;
  today: boolean;
  spheres: Sphere[];
  projects: Project[];
  tasks: TaskRow[];
  sphereById: Map<string, SphereLite>;
  projectById: Map<string, ProjectLite>;
  subtasksByParentId: Map<string, TaskRow[]>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const userId = useUserId();

  const [title, setTitle] = useState("");
  const [sphereId, setSphereId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [checklistEnabled, setChecklistEnabled] = useState(false);
  const [items, setItems] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setSphereId("");
    setProjectId("");
    setChecklistEnabled(false);
    setItems(["", ""]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !title.trim() || !sphereId) return;
    try {
      setError(null);
      const parent = await addTaskLocal({
        userId,
        title: title.trim(),
        sphereId,
        projectId: projectId || null,
        dueAt: dayKey,
      });
      if (checklistEnabled) {
        for (const item of items) {
          const t = item.trim();
          if (!t) continue;
          await addTaskLocal({
            userId,
            title: t,
            sphereId,
            projectId: projectId || null,
            parentId: parent.id,
          });
        }
      }
      reset();
      dialogRef.current?.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  function updateItem(index: number, value: string) {
    setItems((prev) => prev.map((x, i) => (i === index ? value : x)));
  }

  const cardStyle: React.CSSProperties = today
    ? {
        background: "var(--grad-card-accent)",
        border: "1.5px solid var(--brand-400)",
        borderRadius: "var(--r-card)",
        boxShadow: "var(--shadow-accent)",
      }
    : {
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-card)",
        boxShadow: "var(--shadow-card)",
      };

  return (
    <div style={cardStyle} className="p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-1">
        <p
          className="text-[10px] font-bold uppercase tracking-[1px]"
          style={{
            color: today ? "var(--brand-600)" : "var(--brand-400)",
          }}
        >
          {dayLabel}
        </p>
        <button
          onClick={() => {
            reset();
            dialogRef.current?.showModal();
          }}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold leading-none"
          style={{ background: "var(--brand-100)", color: "var(--brand-600)" }}
          title="Добавить задачу"
        >
          +
        </button>
      </div>

      {tasks.map((t) => (
        <TaskItem
          key={t.id}
          task={t}
          sphere={t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null}
          project={t.project_id ? projectById.get(t.project_id) ?? null : null}
          subtasks={subtasksByParentId.get(t.id)}
          showDate={false}
        />
      ))}

      {tasks.length === 0 && (
        <p className="text-xs" style={{ color: "var(--brand-300)" }}>
          пусто
        </p>
      )}

      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-xl border border-neutral-200 p-6 shadow-xl backdrop:bg-black/40 dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            reset();
            dialogRef.current?.close();
          }
        }}
      >
        <h2 className="mb-4 text-base font-semibold">Задача на {dayLabel}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Название</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Что нужно сделать?"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Сфера</label>
            <select
              value={sphereId}
              onChange={(e) => setSphereId(e.target.value)}
              required
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800"
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
            <label className="text-xs text-neutral-500">
              Проект (необязательно)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800"
            >
              <option value="">— без проекта —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setChecklistEnabled((v) => !v)}
              className={`flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                checklistEnabled
                  ? "bg-neutral-900 dark:bg-neutral-100"
                  : "bg-neutral-200 dark:bg-neutral-700"
              }`}
              aria-label="Включить чек-лист"
            >
              <span
                className={`ml-0.5 h-4 w-4 rounded-full bg-white transition-transform dark:bg-neutral-900 ${
                  checklistEnabled ? "translate-x-4" : ""
                }`}
              />
            </button>
            <span className="text-xs text-neutral-500">Включить чек-лист</span>
          </div>

          {checklistEnabled && (
            <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Square
                    size={14}
                    className="flex-shrink-0 text-neutral-300 dark:text-neutral-600"
                  />
                  <input
                    value={item}
                    onChange={(e) => updateItem(i, e.target.value)}
                    placeholder={`Пункт ${i + 1}`}
                    className="min-w-0 flex-1 rounded border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </div>
              ))}
              {items.length < 10 && (
                <button
                  type="button"
                  onClick={() => setItems((p) => [...p, ""])}
                  className="ml-5 text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  + добавить строчку
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                reset();
                dialogRef.current?.close();
              }}
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
