import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { TaskStatus, SphereRow, ProjectRow } from "@/lib/db";
import { toggleTask, deleteTask, createTask } from "@/app/spheres/actions";
import { Square, Trash2 } from "lucide-react";
import { processOverdueTasks } from "@/lib/processOverdueTasks";
import { startOfDay, endOfDay, format } from "date-fns";

type Row = {
  id: string;
  title: string;
  status: TaskStatus;
  due_at: string | null;
  sphere: { name: string; color: string } | null;
  project: { name: string } | null;
};

export default async function TodayPage() {
  await requireUser();
  const supabase = await createClient();

  await processOverdueTasks(supabase);

  const now = new Date();
  const todayEnd = endOfDay(now).toISOString();
  const todayStart = startOfDay(now).toISOString();
  const todayDefault = format(now, "yyyy-MM-dd'T'HH:mm").slice(0, 16);

  const [{ data: tasksData, error }, { data: spheresData }, { data: projectsData }] =
    await Promise.all([
      supabase
        .from("task")
        .select("id, title, status, due_at, sphere:sphere_id(name, color), project:project_id(name)")
        .neq("status", "done")
        .not("due_at", "is", null)
        .lte("due_at", todayEnd)
        .order("due_at", { ascending: true })
        .returns<Row[]>(),
      supabase.from("sphere").select("id, name, color, icon").eq("archived", false).order("order"),
      supabase.from("project").select("id, name, sphere_id").eq("status", "active").order("name"),
    ]);
  if (error) throw new Error(error.message);

  const tasks = tasksData ?? [];
  const spheres = (spheresData ?? []) as Pick<SphereRow, "id" | "name" | "color" | "icon">[];
  const projects = (projectsData ?? []) as Pick<ProjectRow, "id" | "name" | "sphere_id">[];
  const overdue = tasks.filter((t) => t.due_at! < todayStart);
  const today = tasks.filter((t) => t.due_at! >= todayStart);

  return (
    <main className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">← главная</Link>
        <h1 className="text-2xl font-semibold mt-1">Сегодня</h1>
      </div>

      <form action={createTask} className="rounded-lg border border-dashed border-neutral-300 p-4 space-y-2 dark:border-neutral-700">
        <div className="flex gap-2">
          <input
            name="title"
            required
            placeholder="Новая задача…"
            className="flex-1 rounded border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700"
          />
          <input
            name="dueAt"
            type="datetime-local"
            defaultValue={todayDefault}
            className="rounded border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700"
          />
        </div>
        <div className="flex gap-2">
          <select
            name="sphereId"
            required
            className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-900"
          >
            <option value="">— сфера —</option>
            {spheres.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon ? `${s.icon} ` : ""}{s.name}
              </option>
            ))}
          </select>
          <select
            name="projectId"
            className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-900"
          >
            <option value="">— проект (необяз.) —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
          >
            Добавить
          </button>
        </div>
      </form>

      {tasks.length === 0 && (
        <p className="text-sm text-neutral-500 py-4 text-center">Задач нет. Отличный день!</p>
      )}

      {overdue.length > 0 && (
        <section className="space-y-1">
          <h2 className="text-xs font-medium uppercase tracking-wide text-red-500">Просрочено</h2>
          {overdue.map((t) => (
            <TaskRow key={t.id} t={t} accentDate />
          ))}
        </section>
      )}

      {today.length > 0 && (
        <section className="space-y-1">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-400">Сегодня</h2>
          {today.map((t) => (
            <TaskRow key={t.id} t={t} />
          ))}
        </section>
      )}
    </main>
  );
}

function TaskRow({ t, accentDate }: { t: Row; accentDate?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
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
        <span className={`text-xs ${accentDate ? "text-red-500" : "text-neutral-400"}`}>
          {new Date(t.due_at).toLocaleDateString("ru")}
        </span>
      )}
      <form action={deleteTask.bind(null, t.id)}>
        <button type="submit" className="text-neutral-300 hover:text-red-500">
          <Trash2 size={14} />
        </button>
      </form>
    </div>
  );
}
