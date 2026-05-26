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
      <p className="py-4 text-center text-sm text-muted">
        Нет проектов. Создай в разделе Сферы.
      </p>
    );
  }

  const statusChip = (status: string) => {
    if (status === "done")
      return { bg: "#d1fae5", fg: "#065f46", label: "готово" };
    if (status === "paused")
      return { bg: "#fef3c7", fg: "#92400e", label: "на паузе" };
    return { bg: "var(--brand-100)", fg: "var(--brand-600)", label: "в процессе" };
  };

  return (
    <div className="flex flex-col gap-2">
      {projects.map((p) => {
        const all = tasksByProject.get(p.id) ?? [];
        const todo = all.filter((t: { status: string }) => t.status !== "done");
        const done = all.filter((t: { status: string }) => t.status === "done");
        const sphere = sphereById.get(p.sphere_id);
        const chip = statusChip(p.status);
        return (
          <div
            key={p.id}
            className="overflow-hidden"
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-card)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="px-3 py-3" style={{ background: "var(--brand-50)" }}>
              <div className="flex items-center gap-2">
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
                    className="flex-shrink-0"
                    style={{
                      color:
                        p.status === "done" ? "#10b981" : "var(--brand-300)",
                    }}
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
                  className="min-w-0 flex-1 break-words font-medium text-sm"
                  style={{
                    color:
                      p.status === "done"
                        ? "var(--muted)"
                        : "var(--brand-900)",
                    textDecoration:
                      p.status === "done" ? "line-through" : "none",
                  }}
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
                    className="flex flex-shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-xs"
                    style={{ color: "var(--brand-400)" }}
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
                  className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ background: chip.bg, color: chip.fg }}
                >
                  {chip.label}
                </span>
              </div>
              <div className="mt-2 pl-7">
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
                {!hiddenDone.has(p.id) &&
                  done.map((t: { id: string }) => (
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
              <p className="px-4 py-2 text-xs" style={{ color: "var(--brand-300)" }}>
                Нет задач
              </p>
            )}

            {!doneOnly && (
              <form
                action={createTask}
                className="flex flex-col gap-2 px-3 py-2"
                style={{ borderTop: "1px solid var(--brand-100)" }}
              >
                <input type="hidden" name="projectId" value={p.id} />
                <input type="hidden" name="sphereId" value={p.sphere_id} />
                <input
                  name="title"
                  required
                  placeholder="+ новая задача…"
                  className="w-full bg-transparent text-sm outline-none"
                />
                <div className="flex gap-2">
                  <input
                    name="dueAt"
                    type="date"
                    className="min-w-0 flex-1 rounded-[10px] border border-[var(--brand-200)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--brand-500)]"
                  />
                  <OverdueActionSelect />
                  <button
                    type="submit"
                    className="rounded-[10px] bg-[linear-gradient(135deg,#7c3aed,#8b5cf6)] px-3 py-1 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(124,58,237,0.3)]"
                  >
                    +
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
