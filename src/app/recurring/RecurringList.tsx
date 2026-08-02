"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { endRecurringSeriesLocal } from "@/lib/local/mutations";
import { TaskItem } from "@/components/TaskItem";
import type { TaskRow } from "@/lib/db";

type PatternFilter = "weekly" | "monthly" | "yearly" | "interval";

function detectPattern(rrule: string | null): PatternFilter | null {
  if (!rrule) return null;
  if (rrule.includes("FREQ=WEEKLY")) return "weekly";
  if (rrule.includes("FREQ=MONTHLY")) return "monthly";
  if (rrule.includes("FREQ=YEARLY")) return "yearly";
  if (rrule.includes("FREQ=DAILY")) return "interval";
  return null;
}

const FILTERS: { key: PatternFilter; label: string }[] = [
  { key: "weekly", label: "Неделя" },
  { key: "monthly", label: "Месяц" },
  { key: "yearly", label: "Год" },
  { key: "interval", label: "Интервал" },
];

/**
 * Lists the next-due open occurrence of each recurring series.
 *
 * A "series" = group of tasks sharing the same `parent_id` (the template).
 * Within each series we keep only the earliest non-done, non-deleted task by
 * `due_at`. Marking it done removes it from the filter, so the next-earliest
 * surfaces automatically via Dexie liveQuery.
 */
export function RecurringList() {
  const [filter, setFilter] = useState<PatternFilter | null>(null);

  const data = useLiveQuery(async () => {
    const db = localDb();
    const [tasks, spheres, projects] = await Promise.all([
      db.task.toArray(),
      db.sphere.toArray(),
      db.project.toArray(),
    ]);
    const sphereById = new Map(spheres.map((s) => [s.id, s]));
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const templateById = new Map(tasks.filter((t) => t.rrule).map((t) => [t.id, t]));

    const open = tasks.filter(
      (t) =>
        !!t.parent_id &&
        !t.deleted_at &&
        t.status !== "done" &&
        !!t.due_at,
    );

    const earliestByParent = new Map<string, TaskRow>();
    for (const t of open) {
      const cur = earliestByParent.get(t.parent_id!);
      if (!cur || (t.due_at ?? "") < (cur.due_at ?? "")) {
        earliestByParent.set(t.parent_id!, t);
      }
    }

    const items = Array.from(earliestByParent.values()).sort((a, b) =>
      (a.due_at ?? "").localeCompare(b.due_at ?? ""),
    );

    return { items, sphereById, projectById, templateById };
  });

  const allItems = data?.items ?? [];
  const sphereById = data?.sphereById ?? new Map();
  const projectById = data?.projectById ?? new Map();
  const templateById = data?.templateById ?? new Map();

  const items = filter
    ? allItems.filter((t) => {
        const parent = templateById.get(t.parent_id!);
        return detectPattern(parent?.rrule ?? null) === filter;
      })
    : allItems;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? null : key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              filter === key
                ? "bg-violet-600 text-white border-violet-600"
                : "border-violet-300 text-violet-700 hover:bg-violet-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {data && items.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-500">
          {filter ? "Нет регулярок этого типа." : "Активных регулярок нет."}
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              sphere={t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null}
              project={t.project_id ? projectById.get(t.project_id) ?? null : null}
              onEndSeries={() => endRecurringSeriesLocal(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
