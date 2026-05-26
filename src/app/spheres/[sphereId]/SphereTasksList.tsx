"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { useSubtasksMap } from "@/lib/local/useSubtasks";
import { TaskItem } from "@/components/TaskItem";

export function SphereTasksList({ sphereId }: { sphereId: string }) {
  const data = useLiveQuery(async () => {
    const db = localDb();
    const [tasks, sphereRow] = await Promise.all([
      db.task.toArray(),
      db.sphere.get(sphereId),
    ]);
    const live = tasks
      .filter(
        (t) =>
          !t.deleted_at &&
          t.sphere_id === sphereId &&
          !t.project_id &&
          !t.parent_id,
      )
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === "done" ? 1 : -1;
        }
        return a.created_at.localeCompare(b.created_at);
      });
    return { live, sphere: sphereRow ?? null };
  }, [sphereId]);

  const tasks = data?.live ?? [];
  const sphere = data?.sphere ?? null;

  const subtasksByParentId = useSubtasksMap(tasks.map((t) => t.id));

  if (tasks.length === 0) {
    return (
      <p className="py-2 text-sm text-muted">Нет задач.</p>
    );
  }

  return (
    <div className="space-y-1.5">
      {tasks.map((t) => (
        <TaskItem
          key={t.id}
          task={t}
          sphere={sphere}
          subtasks={subtasksByParentId.get(t.id)}
          showSphere={false}
          showProject={false}
        />
      ))}
    </div>
  );
}
