import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { SphereRow, ProjectRow } from "@/lib/db";
import { processOverdueTasks } from "@/lib/processOverdueTasks";
import { format } from "date-fns";
import { AddTaskModal } from "./AddTaskModal";
import { AddRecurringTaskModal } from "./AddRecurringTaskModal";
import { TodayList } from "./TodayList";

export default async function TodayPage() {
  await requireUser();
  const supabase = await createClient();

  await processOverdueTasks(supabase);

  const now = new Date();
  const todayDefault = format(now, "yyyy-MM-dd");

  const [{ data: spheresData }, { data: projectsData }] = await Promise.all([
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

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← главная
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Сегодня</h1>
      </div>

      <div className="flex gap-2">
        <AddTaskModal
          spheres={spheres}
          projects={projects}
          todayDefault={todayDefault}
        />
        <AddRecurringTaskModal
          spheres={spheres}
          projects={projects}
          todayDefault={todayDefault}
        />
      </div>

      <TodayList />
    </main>
  );
}
