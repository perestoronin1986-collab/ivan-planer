import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { SphereRow, ProjectRow, TaskRow } from "@/lib/db";
import { createTask, deleteTask, deleteProject, toggleTask } from "@/app/spheres/actions";
import { Trash2, CheckSquare, Square } from "lucide-react";
import { OverdueActionSelect } from "@/components/OverdueActionSelect";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ sphereId: string; projectId: string }>;
}) {
  const { sphereId, projectId } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: s } = await supabase
    .from("sphere")
    .select("*")
    .eq("id", sphereId)
    .maybeSingle<SphereRow>();
  if (!s) notFound();

  const { data: p } = await supabase
    .from("project")
    .select("*")
    .eq("id", projectId)
    .maybeSingle<ProjectRow>();
  if (!p) notFound();

  const { data: tasks } = await supabase
    .from("task")
    .select("*")
    .eq("project_id", projectId)
    .is("parent_id", null)
    .order("order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<TaskRow[]>();

  const all = tasks ?? [];
  const todoTasks = all.filter((t) => t.status !== "done");
  const doneTasks = all.filter((t) => t.status === "done");

  return (
    <main className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <div>
        <Link
          href={`/spheres/${sphereId}`}
          className="text-sm text-neutral-500 hover:underline"
        >
          ← {s.icon} {s.name}
        </Link>
        <div className="flex items-start justify-between mt-1">
          <h1 className="text-2xl font-semibold">{p.name}</h1>
          <form action={deleteProject.bind(null, projectId, sphereId)}>
            <button
              type="submit"
              className="text-neutral-400 hover:text-red-500 mt-1"
            >
              <Trash2 size={18} />
            </button>
          </form>
        </div>
        {p.description && (
          <p className="text-sm text-neutral-500 mt-1">{p.description}</p>
        )}
      </div>

      {/* Add task */}
      <form action={createTask} className="flex gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="sphereId" value={sphereId} />
        <input
          name="title"
          required
          placeholder="Новая задача…"
          className="flex-1 rounded border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700"
        />
        <input
          name="dueAt"
          type="datetime-local"
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700"
        />
        <OverdueActionSelect />
        <button
          type="submit"
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
        >
          + Задача
        </button>
      </form>

      {/* Todo tasks */}
      <section className="space-y-1">
        {todoTasks.map((t) => (
          <TaskRow key={t.id} t={t} />
        ))}
        {todoTasks.length === 0 && doneTasks.length === 0 && (
          <p className="text-sm text-neutral-500 py-2">Нет задач.</p>
        )}
      </section>

      {/* Done tasks */}
      {doneTasks.length > 0 && (
        <section className="space-y-1">
          <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide">
            Выполнено ({doneTasks.length})
          </p>
          {doneTasks.map((t) => (
            <TaskRow key={t.id} t={t} />
          ))}
        </section>
      )}
    </main>
  );
}

function TaskRow({ t }: { t: TaskRow }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <form action={toggleTask.bind(null, t.id, t.status !== "done")}>
        <button
          type="submit"
          className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          {t.status === "done" ? (
            <CheckSquare size={18} />
          ) : (
            <Square size={18} />
          )}
        </button>
      </form>
      <span
        className={`flex-1 text-sm ${t.status === "done" ? "line-through text-neutral-400" : ""}`}
      >
        {t.title}
      </span>
      {t.due_at && (
        <span className="text-xs text-neutral-400">
          {new Date(t.due_at).toLocaleDateString("ru")}
        </span>
      )}
      <form action={deleteTask.bind(null, t.id)}>
        <button
          type="submit"
          className="text-neutral-300 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </form>
    </div>
  );
}
