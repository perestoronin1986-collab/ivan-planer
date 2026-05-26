import { createClient, requireUser } from "@/lib/supabase/server";
import type { SphereRow, ProjectRow } from "@/lib/db";
import { processOverdueTasks } from "@/lib/processOverdueTasks";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { AddTaskModal } from "./AddTaskModal";
import { AddRecurringTaskModal } from "./AddRecurringTaskModal";
import { TodayList } from "./TodayList";
import { PageShell } from "@/components/ui";

export default async function TodayPage() {
  await requireUser();
  const supabase = await createClient();

  const now = new Date();
  const todayDefault = format(now, "yyyy-MM-dd");

  const [, { data: spheresData }, { data: projectsData }] = await Promise.all([
    processOverdueTasks(supabase),
    supabase
      .from("sphere")
      .select("id, name, color, icon")
      .eq("archived", false)
      .order("order"),
    supabase
      .from("project")
      .select("id, name, sphere_id")
      .eq("status", "active")
      .order("name"),
  ]);

  const spheres = (spheresData ?? []) as Pick<
    SphereRow,
    "id" | "name" | "color" | "icon"
  >[];
  const projects = (projectsData ?? []) as Pick<
    ProjectRow,
    "id" | "name" | "sphere_id"
  >[];

  const subtitle = format(now, "d MMMM, EEEE", { locale: ru });

  return (
    <PageShell title="Сегодня" emoji="☀️" subtitle={subtitle}>
      <div className="flex gap-2">
        <AddTaskModal
          spheres={spheres}
          projects={projects}
          todayDefault={todayDefault}
          triggerClassName="flex-1 rounded-[14px] bg-[linear-gradient(135deg,#7c3aed,#8b5cf6)] px-3.5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_15px_rgba(124,58,237,0.4)]"
          triggerChildren="+ Задача"
        />
        <AddRecurringTaskModal
          spheres={spheres}
          projects={projects}
          todayDefault={todayDefault}
          triggerClassName="flex-1 rounded-[14px] border border-[var(--brand-200)] bg-[var(--brand-50)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--brand-900)]"
          triggerChildren="↻ Регулярная"
        />
      </div>

      <TodayList />
    </PageShell>
  );
}
