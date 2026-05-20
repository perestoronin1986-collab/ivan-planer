import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { TaskStatus } from "@/lib/db";
import { toggleTask } from "@/app/spheres/actions";
import { processOverdueTasks } from "@/lib/processOverdueTasks";
import { CheckSquare, Square } from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  isToday,
} from "date-fns";
import { ru } from "date-fns/locale";

type Row = {
  id: string;
  title: string;
  status: TaskStatus;
  due_at: string | null;
  sphere: { name: string; color: string } | null;
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

  const { data, error } = await supabase
    .from("task")
    .select("id, title, status, due_at, sphere:sphere_id(name, color)")
    .not("due_at", "is", null)
    .gte("due_at", weekStart.toISOString())
    .lte("due_at", weekEnd.toISOString())
    .returns<Row[]>();
  if (error) throw new Error(error.message);

  const tasks = data ?? [];
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

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          const today = isToday(day);

          return (
            <div
              key={key}
              className={`min-h-32 rounded-lg border p-2 space-y-1 ${
                today
                  ? "border-neutral-900 dark:border-neutral-100"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <p className={`text-xs font-semibold ${today ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500"}`}>
                {format(day, "EEE d", { locale: ru })}
              </p>
              {dayTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-1">
                  <form action={toggleTask.bind(null, t.id, t.status !== "done")}>
                    <button type="submit" className="mt-0.5 text-neutral-400 hover:text-neutral-900 flex-shrink-0">
                      {t.status === "done" ? <CheckSquare size={12} /> : <Square size={12} />}
                    </button>
                  </form>
                  <div className="min-w-0">
                    {t.sphere?.color && (
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                        style={{ background: t.sphere.color }}
                      />
                    )}
                    <span className={`text-xs leading-tight ${t.status === "done" ? "line-through text-neutral-400" : ""}`}>
                      {t.title}
                    </span>
                  </div>
                </div>
              ))}
              {dayTasks.length === 0 && (
                <p className="text-xs text-neutral-300 dark:text-neutral-700">—</p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
