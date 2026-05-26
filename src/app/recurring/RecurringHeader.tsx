"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { AddRecurringTaskModal } from "@/app/today/AddRecurringTaskModal";

export function RecurringAddButton() {
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
    <AddRecurringTaskModal
      spheres={spheres}
      projects={projects}
      todayDefault={todayDefault}
      triggerChildren="+"
      triggerClassName="flex items-center justify-center w-9 h-9 rounded-full bg-[linear-gradient(135deg,#7c3aed,#8b5cf6)] text-white text-xl font-bold shadow-[0_4px_15px_rgba(124,58,237,0.4)]"
    />
  );
}
