"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckSquare, Square, Trash2 } from "lucide-react";
import { localDb } from "@/lib/local/db";
import {
  deleteTaskLocal,
  toggleTaskStatusLocal,
  updateTaskLocal,
} from "@/lib/local/mutations";
import { useUserId } from "@/lib/local/useUser";
import type { SphereRow, ProjectRow, TaskRow } from "@/lib/db";

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
  const sphereById = data?.sphereById ?? new Map<string, SphereRow>();
  const projectById = data?.projectById ?? new Map<string, ProjectRow>();
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

      <section className="space-y-1">
        {todo.map((t) => (
          <TaskRowView
            key={t.id}
            task={t}
            sphere={t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null}
            project={
              t.project_id ? projectById.get(t.project_id) ?? null : null
            }
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
          <div className="mt-2 space-y-1">
            {done.map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-1">
                <button
                  type="button"
                  onClick={() =>
                    updateTaskLocal(t.id, {
                      status: "todo",
                      completed_at: null,
                    })
                  }
                  className="text-neutral-400 hover:text-neutral-900"
                  aria-label="Вернуть в работу"
                >
                  <CheckSquare size={18} />
                </button>
                <span className="flex-1 text-sm text-neutral-400 line-through">
                  {t.title}
                </span>
                <button
                  type="button"
                  onClick={() => deleteTaskLocal(t.id)}
                  className="text-neutral-300 hover:text-red-500"
                  aria-label="Удалить"
                >
                  <Trash2 size={14} />
                </button>
              </div>
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
  return 2; // done
}

function TaskRowView({
  task,
  sphere,
  project,
}: {
  task: TaskRow;
  sphere: SphereRow | null;
  project: ProjectRow | null;
}) {
  const overdue = task.due_at ? new Date(task.due_at) < new Date() : false;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <button
        type="button"
        onClick={() => toggleTaskStatusLocal(task.id)}
        className="text-neutral-400 hover:text-neutral-900"
        aria-label="Toggle"
      >
        <Square size={18} />
      </button>
      <span className="flex-1 text-sm">{task.title}</span>
      {sphere?.name && (
        <span className="text-xs text-neutral-400">{sphere.name}</span>
      )}
      {project?.name && (
        <span className="text-xs text-neutral-400">/ {project.name}</span>
      )}
      {task.due_at && (
        <span
          className={`text-xs ${overdue ? "text-red-500" : "text-neutral-400"}`}
        >
          {new Date(task.due_at).toLocaleDateString("ru")}
        </span>
      )}
      <button
        type="button"
        onClick={() => deleteTaskLocal(task.id)}
        className="text-neutral-300 hover:text-red-500"
        aria-label="Удалить"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
