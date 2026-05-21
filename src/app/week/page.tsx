import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { SphereRow, ProjectRow } from "@/lib/db";
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

  const [{ data: spheresData }, { data: projectsData }] = await Promise.all([
    supabase
      .from("sphere")
      .select("id, name, icon")
      .eq("archived", false)
      .order("order"),
    supabase
      .from("project")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
  ]);

  const spheres = (spheresData ?? []) as Pick<SphereRow, "id" | "name" | "icon">[];
  const projects = (projectsData ?? []) as Pick<ProjectRow, "id" | "name">[];

  const label = `${format(weekStart, "d MMM", { locale: ru })} – ${format(weekEnd, "d MMM yyyy", { locale: ru })}`;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← главная
        </Link>
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
          <Link href="/week" className="text-sm text-neutral-500 hover:underline">
            сегодня
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-2 md:grid md:grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayLabel = format(day, "EEEE, d MMMM", { locale: ru });
          return (
            <WeekDayColumn
              key={key}
              dayLabel={dayLabel}
              dayKey={key}
              today={isToday(day)}
              spheres={spheres}
              projects={projects}
            />
          );
        })}
      </div>
    </main>
  );
}
