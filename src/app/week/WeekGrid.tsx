"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { useSubtasksMap } from "@/lib/local/useSubtasks";
import type { SphereRow, ProjectRow, TaskRow } from "@/lib/db";
import { WeekDayColumn } from "./WeekDayColumn";

type SphereLite = Pick<SphereRow, "id" | "name" | "color" | "icon">;
type ProjectLite = Pick<ProjectRow, "id" | "name">;
type SphereInput = Pick<SphereRow, "id" | "name" | "icon">;

type Day = {
  key: string;
  label: string;
  today: boolean;
};

export function WeekGrid({
  days,
  spheres,
  projects,
}: {
  days: Day[];
  spheres: SphereInput[];
  projects: ProjectLite[];
}) {
  const depKey = days.map((d) => d.key).join(",");
  const data = useLiveQuery(async () => {
    const db = localDb();
    const minKey = days[0]?.key;
    const maxKey = days[days.length - 1]?.key;
    if (!minKey || !maxKey) {
      return { byDay: new Map<string, TaskRow[]>(), sphereById: new Map(), projectById: new Map() };
    }
    const startIso = new Date(`${minKey}T00:00:00`).toISOString();
    const endIso = new Date(`${maxKey}T23:59:59.999`).toISOString();

    const [tasks, allSpheres, allProjects] = await Promise.all([
      db.task
        .where("due_at")
        .between(startIso, endIso, true, true)
        .toArray(),
      db.sphere.toArray(),
      db.project.toArray(),
    ]);

    const parentIds = Array.from(
      new Set(
        tasks
          .map((t) => t.parent_id)
          .filter((x): x is string => x != null),
      ),
    );
    const parents = parentIds.length
      ? await db.task.where("id").anyOf(parentIds).toArray()
      : [];
    const templateIds = new Set(
      parents.filter((p) => p.rrule).map((p) => p.id),
    );

    const sphereById = new Map(allSpheres.map((s) => [s.id, s]));
    const projectById = new Map(allProjects.map((p) => [p.id, p]));

    const byDay = new Map<string, TaskRow[]>();
    for (const d of days) byDay.set(d.key, []);

    for (const t of tasks) {
      if (t.deleted_at) continue;
      if (t.parent_id && !templateIds.has(t.parent_id)) continue;
      if (!t.due_at) continue;
      const dueMs = new Date(t.due_at).getTime();
      for (const d of days) {
        const dayStart = new Date(`${d.key}T00:00:00`).getTime();
        const dayEnd = new Date(`${d.key}T23:59:59.999`).getTime();
        if (dueMs >= dayStart && dueMs <= dayEnd) {
          byDay.get(d.key)!.push(t);
          break;
        }
      }
    }

    for (const arr of byDay.values()) {
      arr.sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));
    }

    return { byDay, sphereById, projectById };
  }, [depKey]);

  const empty = useMemo(() => new Map<string, TaskRow[]>(), []);
  const byDay = data?.byDay ?? empty;
  const sphereById = data?.sphereById ?? new Map<string, SphereLite>();
  const projectById = data?.projectById ?? new Map<string, ProjectLite>();

  const allTaskIds: string[] = [];
  for (const arr of byDay.values()) for (const t of arr) allTaskIds.push(t.id);
  const subtasksByParentId = useSubtasksMap(allTaskIds);

  return (
    <div className="flex flex-col gap-2">
      {days.map((day) => (
        <WeekDayColumn
          key={day.key}
          dayLabel={day.label}
          dayKey={day.key}
          today={day.today}
          spheres={spheres}
          projects={projects}
          tasks={byDay.get(day.key) ?? []}
          sphereById={sphereById}
          projectById={projectById}
          subtasksByParentId={subtasksByParentId}
        />
      ))}
    </div>
  );
}
