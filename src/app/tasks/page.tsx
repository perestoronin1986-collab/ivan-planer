"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { useUserId } from "@/lib/local/useUser";
import { TaskItem } from "@/components/TaskItem";
import type { TaskRow } from "@/lib/db";

export default function TasksPage() {
  const userId = useUserId();

  const data = useLiveQuery(async () => {
    const db = localDb();
    const [tasks, spheres, projects] = await Promise.all([
      db.task.toArray(),
      db.sphere.toArray(),
      db.project.toArray(),
    ]);
    const sphereById = new Map(spheres.map((s) => [s.id, s]));
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const live = tasks
      .filter((t) => !t.deleted_at)
      .sort((a, b) => {
        if (a.status !== b.status) {
          return statusRank(a.status) - statusRank(b.status);
        }
        if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at);
        if (a.due_at) return -1;
        if (b.due_at) return 1;
        return b.created_at.localeCompare(a.created_at);
      });
    return { live, sphereById, projectById };
  });

  if (userId === undefined) {
    return (
      <main className="mx-auto w-full max-w-3xl p-6">
        <p className="text-sm text-neutral-500">Войди для работы с задачами.</p>
        <Link className="text-sm underline" href="/login">
          /login
        </Link>
      </main>
    );
  }

  const tasks = data?.live ?? [];
  const sphereById = data?.sphereById ?? new Map();
  const projectById = data?.projectById ?? new Map();
  const todo = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← главная
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Все задачи</h1>
      </div>

      <section className="space-y-1.5">
        {todo.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            sphere={t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null}
            project={t.project_id ? projectById.get(t.project_id) ?? null : null}
          />
        ))}
        {todo.length === 0 && (
          <p className="py-4 text-center text-sm text-neutral-500">
            Все задачи выполнены!
          </p>
        )}
      </section>

      {done.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-neutral-400">
            Выполнено ({done.length})
          </summary>
          <div className="mt-2 space-y-1.5">
            {done.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                sphere={
                  t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null
                }
                project={
                  t.project_id ? projectById.get(t.project_id) ?? null : null
                }
              />
            ))}
          </div>
        </details>
      )}
    </main>
  );
}

function statusRank(s: TaskRow["status"]): number {
  if (s === "doing") return 0;
  if (s === "todo") return 1;
  return 2;
}
