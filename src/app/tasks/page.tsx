import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { TaskStatus } from "@/lib/db";
import { toggleTask, deleteTask } from "@/app/spheres/actions";
import { CheckSquare, Square, Trash2 } from "lucide-react";
import { processOverdueTasks } from "@/lib/processOverdueTasks";

type Row = {
  id: string;
  title: string;
  status: TaskStatus;
  due_at: string | null;
  created_at: string;
  sphere: { name: string; color: string } | null;
  project: { name: string } | null;
};

export default async function TasksPage() {
  await requireUser();
  const supabase = await createClient();

  await processOverdueTasks(supabase);

  const { data, error } = await supabase
    .from("task")
    .select("id, title, status, due_at, created_at, sphere:sphere_id(name, color), project:project_id(name)")
    .order("status", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  if (error) throw new Error(error.message);

  const tasks = data ?? [];
  const todo = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <main className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">← главная</Link>
        <h1 className="text-2xl font-semibold mt-1">Все задачи</h1>
      </div>

      <section className="space-y-1">
        {todo.map((t) => (
          <div key={t.id} className="flex items-center gap-2 py-1.5">
            <form action={toggleTask.bind(null, t.id, true)}>
              <button type="submit" className="text-neutral-400 hover:text-neutral-900">
                <Square size={18} />
              </button>
            </form>
            <span className="flex-1 text-sm">{t.title}</span>
            {t.sphere?.name && (
              <span className="text-xs text-neutral-400">{t.sphere.name}</span>
            )}
            {t.project?.name && (
              <span className="text-xs text-neutral-400">/ {t.project.name}</span>
            )}
            {t.due_at && (
              <span className={`text-xs ${new Date(t.due_at) < new Date() ? "text-red-500" : "text-neutral-400"}`}>
                {new Date(t.due_at).toLocaleDateString("ru")}
              </span>
            )}
            <form action={deleteTask.bind(null, t.id)}>
              <button type="submit" className="text-neutral-300 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </form>
          </div>
        ))}
        {todo.length === 0 && (
          <p className="text-sm text-neutral-500 py-4 text-center">Все задачи выполнены!</p>
        )}
      </section>

      {done.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-neutral-400 font-medium uppercase tracking-wide">
            Выполнено ({done.length})
          </summary>
          <div className="mt-2 space-y-1">
            {done.map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-1">
                <form action={toggleTask.bind(null, t.id, false)}>
                  <button type="submit" className="text-neutral-400 hover:text-neutral-900">
                    <CheckSquare size={18} />
                  </button>
                </form>
                <span className="flex-1 text-sm line-through text-neutral-400">{t.title}</span>
                <form action={deleteTask.bind(null, t.id)}>
                  <button type="submit" className="text-neutral-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
            ))}
          </div>
        </details>
      )}
    </main>
  );
}
