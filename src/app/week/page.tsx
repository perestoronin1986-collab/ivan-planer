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
import { PageShell } from "@/components/ui";

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

  const navBtn =
    "rounded-[14px] border border-[var(--brand-200)] bg-[var(--brand-50)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-900)]";

  return (
    <PageShell title="Неделя" emoji="📆" subtitle={label}>
      <div className="flex items-center justify-center gap-2">
        <Link href={`/week?w=${offset - 1}`} className={navBtn}>
          ‹ пред
        </Link>
        {offset !== 0 && (
          <Link href="/week" className={navBtn}>
            сегодня
          </Link>
        )}
        <Link href={`/week?w=${offset + 1}`} className={navBtn}>
          след ›
        </Link>
      </div>

      <div className="flex flex-col gap-2">
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
    </PageShell>
  );
}
