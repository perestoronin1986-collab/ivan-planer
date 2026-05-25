"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { localDb } from "@/lib/local/db";
import { TaskItem } from "@/components/TaskItem";
import { SphereSelectorForm } from "@/components/SphereSelectorForm";
import { OverdueActionSelect } from "@/components/OverdueActionSelect";
import { createTask, toggleProjectDone } from "@/app/spheres/actions";

type SphereLite = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
};

export function ProjectsList({
  sphereList,
  doneOnly = false,
}: {
  sphereList: SphereLite[];
  doneOnly?: boolean;
}) {
  const data = useLiveQuery(async () => {
    const db = localDb();
    const [projects, tasks, spheres] = await Promise.all([
      db.project.toArray(),
      db.task.toArray(),
      db.sphere.toArray(),
    ]);
    const sphereById = new Map(spheres.map((s) => [s.id, s]));
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const liveProjects = projects
      .filter((p) => {
        if (p.deleted_at) return false;
        if (doneOnly) return p.status === "done";
        return p.status !== "done";
      })
      .sort((a, b) => {
        const sa = statusRank(a.status);
        const sb = statusRank(b.status);
        if (sa !== sb) return sa - sb;
        return a.created_at.localeCompare(b.created_at);
      });
    const tasksByProject = new Map<string, typeof tasks>();
    for (const t of tasks) {
      if (t.deleted_at || !t.project_id || t.parent_id) continue;
      const arr = tasksByProject.get(t.project_id) ?? [];
      arr.push(t);
      tasksByProject.set(t.project_id, arr);
    }
    for (const [, arr] of tasksByProject) {
      arr.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === "done" ? 1 : -1;
        }
        return a.created_at.localeCompare(b.created_at);
      });
    }
    return { liveProjects, tasksByProject, sphereById, projectById };
  });

  const [hiddenDone, setHiddenDone] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("ivanplaner:hidden-done-tasks");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const projects = data?.liveProjects ?? [];
  const tasksByProject = data?.tasksByProject ?? new Map();
  const sphereById = data?.sphereById ?? new Map();

  if (projects.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-neutral-500">
        Нет проектов. Создай в разделе Сферы.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((p) => {
        const all = tasksByProject.get(p.id) ?? [];
        const todo = all.filter((t: { status: string }) => t.status !== "done");
        const done = all.filter((t: { status: string }) => t.status === "done");
        const sphere = sphereById.get(p.sphere_id);
        return (
          <div
            key={p.id}
            className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
          >
            <div className="bg-neutral-50 px-4 py-3 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <form
                  action={toggleProjectDone.bind(
                    null,
                    p.id,
                    p.sphere_id,
                    p.status !== "done",
                  )}
                >
                  <button
                    type="submit"
                    title={
                      p.status === "done"
                        ? "Вернуть в работу"
                        : "Отметить выполненным"
                    }
                    className={`flex-shrink-0 ${
                      p.status === "done"
                        ? "text-emerald-500"
                        : "text-neutral-300 hover:text-emerald-500"
                    }`}
                  >
                    {p.status === "done" ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>
                </form>
                {sphere && (
                  <span
                    className="inline-block h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ background: sphere.color }}
                  />
                )}
                <Link
                  href={`/spheres/${p.sphere_id}/projects/${p.id}`}
                  className={`min-w-0 flex-1 break-words font-medium hover:underline ${
                    p.status === "done"
                      ? "text-neutral-400 line-through"
                      : ""
                  }`}
                >
                  {p.name}
                </Link>
                {done.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setHiddenDone((prev) => {
                        const next = new Set(prev);
                        if (next.has(p.id)) next.delete(p.id);
                        else next.add(p.id);
                        try {
                          localStorage.setItem(
                            "ivanplaner:hidden-done-tasks",
                            JSON.stringify([...next]),
                          );
                        } catch {}
                        return next;
                      })
                    }
                    className="flex flex-shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                    title={hiddenDone.has(p.id) ? "Показать выполненные" : "Скрыть выполненные"}
                  >
                    {hiddenDone.has(p.id) ? (
                      <ChevronRight size={13} />
                    ) : (
                      <ChevronDown size={13} />
                    )}
                    <span>✓{done.length}</span>
                  </button>
                )}
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${
                    p.status === "done"
                      ? "bg-emerald-100 text-emerald-700"
                      : p.status === "paused"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {p.status === "done"
                    ? "готово"
                    : p.status === "paused"
                      ? "на паузе"
                      : "в процессе"}
                </span>
              </div>
              <div className="mt-2 pl-8">
                <SphereSelectorForm
                  projectId={p.id}
                  currentSphereId={p.sphere_id}
                  spheres={sphereList}
                />
              </div>
            </div>

            {all.length > 0 && (
              <div className="space-y-1.5 px-2 py-2">
                {todo.map((t: { id: string }) => (
                  <TaskItem
                    key={t.id}
                    task={t as never}
                    sphere={sphere}
                    showProject={false}
                  />
                ))}
                {!hiddenDone.has(p.id) && done.map((t: { id: string }) => (
                  <TaskItem
                    key={t.id}
                    task={t as never}
                    sphere={sphere}
                    showProject={false}
                  />
                ))}
              </div>
            )}

            {all.length === 0 && (
              <p className="px-4 py-2 text-xs text-neutral-400">Нет задач</p>
            )}

            {!doneOnly && (
              <form
                action={createTask}
                className="flex flex-col gap-2 border-t border-neutral-100 px-4 py-2 dark:border-neutral-800 sm:flex-row"
              >
                <input type="hidden" name="projectId" value={p.id} />
                <input type="hidden" name="sphereId" value={p.sphere_id} />
                <input
                  name="title"
                  required
                  placeholder="+ новая задача…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 sm:flex-1"
                />
                <div className="flex gap-2">
                  <input
                    name="dueAt"
                    type="date"
                    className="min-w-0 flex-1 rounded border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-neutral-900 dark:border-neutral-700 sm:flex-none"
                  />
                  <OverdueActionSelect />
                  <button
                    type="submit"
                    className="rounded bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
                  >
                    Добавить
                  </button>
                </div>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}

function statusRank(s: string): number {
  if (s === "active") return 0;
  if (s === "paused") return 1;
  if (s === "done") return 2;
  return 3;
}
