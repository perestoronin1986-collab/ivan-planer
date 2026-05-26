"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { useSubtasksMap } from "@/lib/local/useSubtasks";
import { TaskItem } from "@/components/TaskItem";
import { Section, EmptyState } from "@/components/ui";

export function TodayList() {
  const data = useLiveQuery(async () => {
    const db = localDb();
    const todayStartMs = new Date().setHours(0, 0, 0, 0);
    const todayEndMs = new Date().setHours(23, 59, 59, 999);
    const todayEndIso = new Date(todayEndMs).toISOString();

    const [dueTasks, spheres, projects] = await Promise.all([
      db.task
        .where("due_at")
        .belowOrEqual(todayEndIso)
        .toArray(),
      db.sphere.toArray(),
      db.project.toArray(),
    ]);
    const sphereById = new Map(spheres.map((s) => [s.id, s]));
    const projectById = new Map(projects.map((p) => [p.id, p]));

    const overdue: typeof dueTasks = [];
    const today: typeof dueTasks = [];
    for (const t of dueTasks) {
      if (t.deleted_at) continue;
      if (t.status === "done") continue;
      if (!t.due_at) continue;
      const ms = new Date(t.due_at).getTime();
      if (ms > todayEndMs) continue;
      if (ms < todayStartMs) overdue.push(t);
      else today.push(t);
    }
    const cmp = (a: { due_at: string | null }, b: { due_at: string | null }) =>
      (a.due_at ?? "").localeCompare(b.due_at ?? "");
    overdue.sort(cmp);
    today.sort(cmp);

    return { overdue, today, sphereById, projectById };
  });

  const overdue = data?.overdue ?? [];
  const today = data?.today ?? [];
  const sphereById = data?.sphereById ?? new Map();
  const projectById = data?.projectById ?? new Map();

  const parentIds = [...overdue, ...today].map((t) => t.id);
  const subtasksByParentId = useSubtasksMap(parentIds);

  const empty = overdue.length === 0 && today.length === 0;

  return (
    <div className="flex flex-col gap-2">
      {empty && (
        <Section>
          <EmptyState emoji="✨" title="Задач нет" hint="Отличный день!" />
        </Section>
      )}

      {overdue.length > 0 && (
        <Section accent label="⚠ Просрочено">
          <div className="space-y-1.5">
            {overdue.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                sphere={t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null}
                project={
                  t.project_id ? projectById.get(t.project_id) ?? null : null
                }
                subtasks={subtasksByParentId.get(t.id)}
                accentDate
              />
            ))}
          </div>
        </Section>
      )}

      {today.length > 0 && (
        <Section label="⚡ Активные">
          <div className="space-y-1.5">
            {today.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                sphere={t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null}
                project={
                  t.project_id ? projectById.get(t.project_id) ?? null : null
                }
                subtasks={subtasksByParentId.get(t.id)}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
