"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { AddRecurringTaskModal } from "@/app/today/AddRecurringTaskModal";

export function RecurringHeader() {
  const data = useLiveQuery(async () => {
    const db = localDb();
    const [spheres, projects] = await Promise.all([
      db.sphere.toArray(),
      db.project.toArray(),
    ]);
    return { spheres, projects };
  });

  const spheres = data?.spheres.map((s) => ({ id: s.id, name: s.name, icon: s.icon ?? null })) ?? [];
  const projects = data?.projects.map((p) => ({ id: p.id, name: p.name, sphere_id: p.sphere_id ?? "" })) ?? [];
  const todayDefault = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex items-center gap-3">
      <h1 className="text-2xl font-semibold">Регулярные задачи</h1>
      <AddRecurringTaskModal
        spheres={spheres}
        projects={projects}
        todayDefault={todayDefault}
        triggerChildren={<span className="text-3xl font-black leading-none">+</span>}
        triggerClassName="flex items-center justify-center w-9 h-9 rounded-full bg-violet-600 text-white hover:bg-violet-700 shadow"
      />
    </div>
  );
}
