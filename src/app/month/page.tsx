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
import { PageShell, Section } from "@/components/ui";

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
  const selectedLabel = format(selectedDate, "EEEE, d MMMM", { locale: ru });

  const monthLabel = format(monthAnchor, "LLLL yyyy", { locale: ru });

  const navBtn =
    "rounded-[14px] border border-[var(--brand-200)] bg-[var(--brand-50)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-900)]";

  return (
    <PageShell title={monthLabel} emoji="🗓" subtitle={`${tasks.length} задач`}>
      <div className="flex items-center justify-center gap-2">
        <Link href={`/month?m=${offset - 1}`} className={navBtn}>
          ‹
        </Link>
        {offset !== 0 && (
          <Link href="/month" className={navBtn}>
            сегодня
          </Link>
        )}
        <Link href={`/month?m=${offset + 1}`} className={navBtn}>
          ›
        </Link>
      </div>

      <Section>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-[1px] mb-2"
             style={{ color: "var(--brand-400)" }}>
          {WEEKDAYS.map((w, i) => (
            <div key={w} style={i >= 5 ? { color: "var(--brand-600)" } : undefined}>
              {w}
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

            const style: React.CSSProperties = {
              borderWidth: 2,
              borderStyle: "solid",
              borderColor: selected
                ? "var(--brand-600)"
                : today
                  ? "var(--brand-300)"
                  : "transparent",
              background: !hasTasks
                ? "transparent"
                : allDone
                  ? "#dcfce7"
                  : hasUndone
                    ? "#fee2e2"
                    : "transparent",
              color: !inMonth
                ? "#d1d5db"
                : selected
                  ? "var(--brand-900)"
                  : "var(--ink)",
              borderRadius: 10,
            };

            return (
              <Link
                key={key}
                href={`/month?m=${offset}&d=${key}`}
                style={style}
                className="aspect-square flex items-center justify-center text-sm font-medium"
              >
                {format(day, "d")}
              </Link>
            );
          })}
        </div>
      </Section>

      <WeekDayColumn
        dayLabel={selectedLabel}
        dayKey={selectedKey}
        today={isToday(selectedDate)}
        spheres={spheres}
        projects={projects}
      />
    </PageShell>
  );
}
