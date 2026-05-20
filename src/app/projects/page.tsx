import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import { CheckSquare, Square, Trash2, CheckCircle2, Circle } from "lucide-react";
import { toggleTask, deleteTask, createTask, toggleProjectDone } from "@/app/spheres/actions";
import { SphereSelectorForm } from "@/components/SphereSelectorForm";
import { OverdueActionSelect } from "@/components/OverdueActionSelect";

type TaskItem = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
};

type ProjectItem = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  icon: string | null;
  sphere_id: string;
  sphere: { id: string; name: string; color: string; icon: string | null } | null;
  tasks: TaskItem[];
};

export default async function ProjectsPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: spheres } = await supabase
    .from("sphere")
    .select("id, name, color, icon")
    .order("order", { ascending: true });

  const sphereList = spheres ?? [];

  const { data: projects, error } = await supabase
    .from("project")
    .select("id, name, description, status, icon, sphere_id, sphere:sphere_id(id, name, color, icon)")
    .order("status", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Omit<ProjectItem, "tasks">[]>();
  if (error) throw new Error(error.message);

  const projectList = projects ?? [];

  // load tasks for all projects in one query
  const projectIds = projectList.map((p) => p.id);
  let tasksByProject = new Map<string, TaskItem[]>();

  if (projectIds.length > 0) {
    const { data: tasks } = await supabase
      .from("task")
      .select("id, title, status, due_at, project_id")
      .in("project_id", projectIds)
      .is("parent_id", null)
      .order("status", { ascending: true })
      .order("created_at", { ascending: true });

    for (const t of tasks ?? []) {
      const arr = tasksByProject.get(t.project_id) ?? [];
      arr.push(t);
      tasksByProject.set(t.project_id, arr);
    }
  }

  const grouped = projectList.map((p) => ({
    ...p,
    tasks: tasksByProject.get(p.id) ?? [],
  }));

  return (
    <main className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">← главная</Link>
        <h1 className="text-2xl font-semibold mt-1">Проекты</h1>
      </div>

      {grouped.length === 0 && (
        <p className="text-sm text-neutral-500 py-4 text-center">Нет проектов. Создай в разделе Сферы.</p>
      )}

      <div className="space-y-4">
        {grouped.map((p) => {
          const todo = p.tasks.filter((t) => t.status !== "done");
          const done = p.tasks.filter((t) => t.status === "done");
          return (
            <div key={p.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {/* Project header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-900">
                {/* Done toggle */}
                <form action={toggleProjectDone.bind(null, p.id, p.sphere_id, p.status !== "done")}>
                  <button
                    type="submit"
                    title={p.status === "done" ? "Вернуть в работу" : "Отметить выполненным"}
                    className={`flex-shrink-0 ${p.status === "done" ? "text-emerald-500" : "text-neutral-300 hover:text-emerald-500"}`}
                  >
                    {p.status === "done" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </button>
                </form>
                {p.sphere && (
                  <span
                    className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                    style={{ background: p.sphere.color }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/spheres/${p.sphere_id}/projects/${p.id}`}
                    className={`font-medium hover:underline ${p.status === "done" ? "line-through text-neutral-400" : ""}`}
                  >
                    {p.icon && <span className="mr-1">{p.icon}</span>}{p.name}
                  </Link>
                </div>
                {/* Change sphere */}
                <SphereSelectorForm
                  projectId={p.id}
                  currentSphereId={p.sphere_id}
                  spheres={sphereList}
                />
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  p.status === "done"
                    ? "bg-emerald-100 text-emerald-700"
                    : p.status === "paused"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                }`}>
                  {p.status === "done" ? "готово" : p.status === "paused" ? "на паузе" : "в процессе"}
                </span>
              </div>

              {/* Tasks */}
              {p.tasks.length > 0 && (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {todo.map((t) => (
                    <TaskRow key={t.id} t={t} />
                  ))}
                  {done.map((t) => (
                    <TaskRow key={t.id} t={t} />
                  ))}
                </div>
              )}

              {p.tasks.length === 0 && (
                <p className="px-4 py-2 text-xs text-neutral-400">Нет задач</p>
              )}

              {/* Inline add task form */}
              <form action={createTask} className="flex gap-2 px-4 py-2 border-t border-neutral-100 dark:border-neutral-800">
                <input type="hidden" name="projectId" value={p.id} />
                <input type="hidden" name="sphereId" value={p.sphere_id} />
                <input
                  name="title"
                  required
                  placeholder="+ новая задача…"
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-neutral-400"
                />
                <input
                  name="dueAt"
                  type="datetime-local"
                  className="rounded border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-neutral-900 dark:border-neutral-700"
                />
                <OverdueActionSelect />
                <button
                  type="submit"
                  className="rounded bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  Добавить
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function TaskRow({ t }: { t: TaskItem }) {
  const done = t.status === "done";
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <form action={toggleTask.bind(null, t.id, !done)}>
        <button type="submit" className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
          {done ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>
      </form>
      <span className={`flex-1 text-sm ${done ? "line-through text-neutral-400" : ""}`}>
        {t.title}
      </span>
      {t.due_at && (
        <span className={`text-xs ${new Date(t.due_at) < new Date() && !done ? "text-red-500" : "text-neutral-400"}`}>
          {new Date(t.due_at).toLocaleDateString("ru")}
        </span>
      )}
      <form action={deleteTask.bind(null, t.id)}>
        <button type="submit" className="text-neutral-300 hover:text-red-500">
          <Trash2 size={13} />
        </button>
      </form>
    </div>
  );
}
