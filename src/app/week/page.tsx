import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { TaskStatus, SphereRow, ProjectRow } from "@/lib/db";
import { processOverdueTasks } from "@/lib/processOverdueTasks";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  isToday,
} from "date-fns";
import { ru } from "date-fns/locale";
import { WeekDayColumn } from "./WeekDayColumn";

type Row = {
  id: string;
  title: string;
  status: TaskStatus;
  due_at: string | null;
  carry_count: number;
  sphere: { name: string; color: string; icon: string | null } | null;
};

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const { w } = await searchParams;
  const offset = parseInt(w ?? "0", 10) || 0;

  const now = new Date();
  const weekStart = startOfWeek(addWeeks(now, offset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(now, offset), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  await requireUser();
  const supabase = await createClient();

  await processOverdueTasks(supabase);

  const [{ data, error }, { data: spheresData }, { data: projectsData }] = await Promise.all([
    supabase
      .from("task")
      .select("id, title, status, due_at, carry_count, sphere:sphere_id(name, color, icon)")
      .not("due_at", "is", null)
      .gte("due_at", weekStart.toISOString())
      .lte("due_at", weekEnd.toISOString())
      .returns<Row[]>(),
    supabase.from("sphere").select("id, name, icon").eq("archived", false).order("order"),
    supabase.from("project").select("id, name").eq("status", "active").order("name"),
  ]);
  if (error) throw new Error(error.message);

  const tasks = data ?? [];
  const spheres = (spheresData ?? []) as Pick<SphereRow, "id" | "name" | "icon">[];
  const projects = (projectsData ?? []) as Pick<ProjectRow, "id" | "name">[];
  const tasksByDay = new Map<string, Row[]>();
  for (const day of days) {
    tasksByDay.set(format(day, "yyyy-MM-dd"), []);
  }
  for (const t of tasks) {
    if (!t.due_at) continue;
    const key = format(new Date(t.due_at), "yyyy-MM-dd");
    tasksByDay.get(key)?.push(t);
  }

  const label = `${format(weekStart, "d MMM", { locale: ru })} – ${format(weekEnd, "d MMM yyyy", { locale: ru })}`;

  return (
    <main className="mx-auto w-full max-w-5xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">← главная</Link>
        <div className="flex items-center gap-4">
          <Link
            href={`/week?w=${offset - 1}`}
            className="rounded border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            ‹ пред
          </Link>
          <span className="text-sm font-medium">{label}</span>
          <Link
            href={`/week?w=${offset + 1}`}
            className="rounded border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            след ›
          </Link>
        </div>
        {offset !== 0 && (
          <Link href="/week" className="text-sm text-neutral-500 hover:underline">сегодня</Link>
        )}
      </div>

      <div className="flex flex-col gap-2 md:grid md:grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          const dayLabel = format(day, "EEE d", { locale: ru });

          return (
            <WeekDayColumn
              key={key}
              dayLabel={dayLabel}
              dayKey={key}
              today={isToday(day)}
              tasks={dayTasks}
              spheres={spheres}
              projects={projects}
            />
          );
        })}
      </div>
    </main>
  );
}
