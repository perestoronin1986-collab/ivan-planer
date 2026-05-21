"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { useUserId } from "@/lib/local/useUser";
import { TaskItem } from "@/components/TaskItem";

export default function DonePage() {
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
    const done = tasks
      .filter(
        (t) =>
          !t.deleted_at &&
          t.status === "done" &&
          // Скрываем шаблоны регулярок (они маркируются status=done,
          // чтобы не показываться в активных списках).
          !t.rrule,
      )
      .sort((a, b) =>
        (b.completed_at ?? b.updated_at).localeCompare(
          a.completed_at ?? a.updated_at,
        ),
      );
    return { done, sphereById, projectById };
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

  const done = data?.done ?? [];
  const sphereById = data?.sphereById ?? new Map();
  const projectById = data?.projectById ?? new Map();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← главная
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Выполненные задачи</h1>
      </div>

      <section className="space-y-1.5">
        {done.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            sphere={t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null}
            project={t.project_id ? projectById.get(t.project_id) ?? null : null}
          />
        ))}
        {data && done.length === 0 && (
          <p className="py-4 text-center text-sm text-neutral-500">
            Пока ничего не выполнено.
          </p>
        )}
      </section>
    </main>
  );
}
