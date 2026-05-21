"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { TaskItem } from "@/components/TaskItem";

export function ProjectTasksList({
  projectId,
  sphereId,
}: {
  projectId: string;
  sphereId: string;
}) {
  const data = useLiveQuery(async () => {
    const db = localDb();
    const [tasks, sphereRow] = await Promise.all([
      db.task.toArray(),
      db.sphere.get(sphereId),
    ]);
    const projectTasks = tasks
      .filter(
        (t) => !t.deleted_at && t.project_id === projectId && !t.parent_id,
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const todo = projectTasks.filter((t) => t.status !== "done");
    const done = projectTasks.filter((t) => t.status === "done");
    return { todo, done, sphere: sphereRow ?? null };
  }, [projectId, sphereId]);

  const todo = data?.todo ?? [];
  const done = data?.done ?? [];
  const sphere = data?.sphere ?? null;

  return (
    <>
      <section className="space-y-1.5">
        {todo.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            sphere={sphere}
            showSphere={false}
            showProject={false}
          />
        ))}
        {todo.length === 0 && done.length === 0 && (
          <p className="py-2 text-sm text-neutral-500">Нет задач.</p>
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Выполнено ({done.length})
          </p>
          {done.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              sphere={sphere}
              showSphere={false}
              showProject={false}
            />
          ))}
        </section>
      )}
    </>
  );
}
