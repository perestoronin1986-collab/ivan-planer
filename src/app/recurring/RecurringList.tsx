"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { TaskItem } from "@/components/TaskItem";
import type { TaskRow } from "@/lib/db";

/**
 * Lists the next-due open occurrence of each recurring series.
 *
 * A "series" = group of tasks sharing the same `parent_id` (the template).
 * Within each series we keep only the earliest non-done, non-deleted task by
 * `due_at`. Marking it done removes it from the filter, so the next-earliest
 * surfaces automatically via Dexie liveQuery.
 */
export function RecurringList() {
  const data = useLiveQuery(async () => {
    const db = localDb();
    const [tasks, spheres, projects] = await Promise.all([
      db.task.toArray(),
      db.sphere.toArray(),
      db.project.toArray(),
    ]);
    const sphereById = new Map(spheres.map((s) => [s.id, s]));
    const projectById = new Map(projects.map((p) => [p.id, p]));

    const open = tasks.filter(
      (t) =>
        !!t.parent_id &&
        !t.deleted_at &&
        t.status !== "done" &&
        !!t.due_at,
    );

    const earliestByParent = new Map<string, TaskRow>();
    for (const t of open) {
      const cur = earliestByParent.get(t.parent_id!);
      if (!cur || (t.due_at ?? "") < (cur.due_at ?? "")) {
        earliestByParent.set(t.parent_id!, t);
      }
    }

    const items = Array.from(earliestByParent.values()).sort((a, b) =>
      (a.due_at ?? "").localeCompare(b.due_at ?? ""),
    );

    return { items, sphereById, projectById };
  });

  const items = data?.items ?? [];
  const sphereById = data?.sphereById ?? new Map();
  const projectById = data?.projectById ?? new Map();

  if (data && items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-neutral-500">
        Активных регулярок нет.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((t) => (
        <TaskItem
          key={t.id}
          task={t}
          sphere={t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null}
          project={t.project_id ? projectById.get(t.project_id) ?? null : null}
        />
      ))}
    </div>
  );
}
