"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { TaskItem } from "@/components/TaskItem";

export function TodayList() {
  const data = useLiveQuery(async () => {
    const db = localDb();
    const [tasks, spheres, projects] = await Promise.all([
      db.task.toArray(),
      db.sphere.toArray(),
      db.project.toArray(),
    ]);
    const sphereById = new Map(spheres.map((s) => [s.id, s]));
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const todayStartMs = new Date().setHours(0, 0, 0, 0);
    const todayEndMs = new Date().setHours(23, 59, 59, 999);
    const live = tasks
      .filter(
        (t) => !t.deleted_at && t.status !== "done" && t.due_at,
      )
      .filter((t) => new Date(t.due_at!).getTime() <= todayEndMs)
      .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));
    const overdue = live.filter(
      (t) => new Date(t.due_at!).getTime() < todayStartMs,
    );
    const today = live.filter(
      (t) => new Date(t.due_at!).getTime() >= todayStartMs,
    );
    return { overdue, today, sphereById, projectById };
  });

  const overdue = data?.overdue ?? [];
  const today = data?.today ?? [];
  const sphereById = data?.sphereById ?? new Map();
  const projectById = data?.projectById ?? new Map();

  const empty = overdue.length === 0 && today.length === 0;

  return (
    <div className="space-y-6">
      {empty && (
        <p className="py-4 text-center text-sm text-neutral-500">
          Задач нет. Отличный день!
        </p>
      )}

      {overdue.length > 0 && (
        <section className="space-y-1.5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-red-500">
            Просрочено
          </h2>
          {overdue.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              sphere={t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null}
              project={
                t.project_id ? projectById.get(t.project_id) ?? null : null
              }
              accentDate
            />
          ))}
        </section>
      )}

      {today.length > 0 && (
        <section className="space-y-1.5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Сегодня
          </h2>
          {today.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              sphere={t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null}
              project={
                t.project_id ? projectById.get(t.project_id) ?? null : null
              }
            />
          ))}
        </section>
      )}
    </div>
  );
}
