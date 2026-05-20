import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { TaskStatus, SphereRow, ProjectRow } from "@/lib/db";
import { processOverdueTasks } from "@/lib/processOverdueTasks";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  isToday,
  isSameMonth,
  parseISO,
  isValid,
} from "date-fns";
import { ru } from "date-fns/locale";
import { WeekDayColumn } from "../week/WeekDayColumn";

type Row = {
  id: string;
  title: string;
  status: TaskStatus;
  due_at: string | null;
  carry_count: number;
  sphere: { name: string; color: string; icon: string | null } | null;
};

const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; d?: string }>;
}) {
  const { m, d } = await searchParams;
  const offset = parseInt(m ?? "0", 10) || 0;

  const now = new Date();
  const monthAnchor = addMonths(now, offset);
  const monthStart = startOfMonth(monthAnchor);
  const monthEnd = endOfMonth(monthAnchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  await requireUser();
  const supabase = await createClient();

  await processOverdueTasks(supabase);

  const [{ data, error }, { data: spheresData }, { data: projectsData }] = await Promise.all([
    supabase
      .from("task")
      .select("id, title, status, due_at, carry_count, sphere:sphere_id(name, color, icon)")
      .not("due_at", "is", null)
      .gte("due_at", gridStart.toISOString())
      .lte("due_at", gridEnd.toISOString())
      .returns<Row[]>(),
    supabase.from("sphere").select("id, name, icon").eq("archived", false).order("order"),
    supabase.from("project").select("id, name").eq("status", "active").order("name"),
  ]);
  if (error) throw new Error(error.message);

  const tasks = data ?? [];
  const spheres = (spheresData ?? []) as Pick<SphereRow, "id" | "name" | "icon">[];
  const projects = (projectsData ?? []) as Pick<ProjectRow, "id" | "name">[];

  const tasksByDay = new Map<string, Row[]>();
  for (const day of days) tasksByDay.set(format(day, "yyyy-MM-dd"), []);
  for (const t of tasks) {
    if (!t.due_at) continue;
    const key = format(new Date(t.due_at), "yyyy-MM-dd");
    tasksByDay.get(key)?.push(t);
  }

  const parsedSelected = d ? parseISO(d) : null;
  const selectedKey =
    parsedSelected && isValid(parsedSelected)
      ? format(parsedSelected, "yyyy-MM-dd")
      : isSameMonth(now, monthAnchor)
        ? format(now, "yyyy-MM-dd")
        : format(monthStart, "yyyy-MM-dd");
  const selectedDate = parseISO(selectedKey);
  const selectedTasks = tasksByDay.get(selectedKey) ?? [];
  const selectedLabel = format(selectedDate, "EEEE, d MMMM", { locale: ru });

  const monthLabel = format(monthAnchor, "LLLL yyyy", { locale: ru });

  return (
    <main className="mx-auto w-full max-w-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">← главная</Link>
        <div className="flex items-center gap-4">
          <Link
            href={`/month?m=${offset - 1}`}
            className="rounded border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            ‹
          </Link>
          <span className="text-base font-semibold capitalize">{monthLabel}</span>
          <Link
            href={`/month?m=${offset + 1}`}
            className="rounded border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            ›
          </Link>
        </div>
        {offset !== 0 && (
          <Link href="/month" className="text-sm text-neutral-500 hover:underline">сегодня</Link>
        )}
        {offset === 0 && <span className="w-12" />}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-500">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={i >= 5 ? "text-red-500" : ""}>
            {w.toUpperCase()}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, monthAnchor);
          const today = isToday(day);
          const selected = key === selectedKey;

          const hasTasks = dayTasks.length > 0;
          const allDone = hasTasks && dayTasks.every((t) => t.status === "done");
          const hasUndone = dayTasks.some((t) => t.status !== "done");

          const bg = !hasTasks
            ? ""
            : allDone
              ? "bg-green-100 dark:bg-green-900/30"
              : hasUndone
                ? "bg-red-100 dark:bg-red-900/30"
                : "";

          const border = selected
            ? "border-neutral-900 dark:border-neutral-100"
            : today
              ? "border-neutral-500 dark:border-neutral-400"
              : "border-transparent";

          const muted = inMonth ? "" : "text-neutral-300 dark:text-neutral-700";

          return (
            <Link
              key={key}
              href={`/month?m=${offset}&d=${key}`}
              className={`aspect-square rounded border-2 ${border} ${bg} flex items-center justify-center text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${muted}`}
            >
              {format(day, "d")}
            </Link>
          );
        })}
      </div>

      <div className="pt-2">
        <WeekDayColumn
          dayLabel={selectedLabel}
          dayKey={selectedKey}
          today={isToday(selectedDate)}
          tasks={selectedTasks}
          spheres={spheres}
          projects={projects}
        />
      </div>
    </main>
  );
}
