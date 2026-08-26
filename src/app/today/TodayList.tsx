"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { useSubtasksMap } from "@/lib/local/useSubtasks";
import { freezeTaskLocal, unfreezeTaskLocal } from "@/lib/local/mutations";
import { TaskItem } from "@/components/TaskItem";
import { Section, EmptyState } from "@/components/ui";

type Tab = "today" | "frozen";

export function TodayList() {
  const [tab, setTab] = useState<Tab>("today");

  const data = useLiveQuery(async () => {
    const db = localDb();
    const todayStartMs = new Date().setHours(0, 0, 0, 0);
    const todayEndMs = new Date().setHours(23, 59, 59, 999);
    const todayEndIso = new Date(todayEndMs).toISOString();

    const [dueTasks, frozenTasks, spheres, projects] = await Promise.all([
      db.task
        .where("due_at")
        .belowOrEqual(todayEndIso)
        .toArray(),
      // IndexedDB does not index null, so rows with frozen_at = null are not
      // in this index at all — `above("")` gives exactly the frozen ones,
      // whatever their due_at is (past, future or none).
      db.task.where("frozen_at").above("").toArray(),
      db.sphere.toArray(),
      db.project.toArray(),
    ]);
    const sphereById = new Map(spheres.map((s) => [s.id, s]));
    const projectById = new Map(projects.map((p) => [p.id, p]));

    const overdue: typeof dueTasks = [];
    const today: typeof dueTasks = [];
    for (const t of dueTasks) {
      if (t.deleted_at) continue;
      if (t.status === "done") continue;
      if (t.frozen_at) continue; // lives in the frozen tab instead
      if (!t.due_at) continue;
      const ms = new Date(t.due_at).getTime();
      if (ms > todayEndMs) continue;
      if (ms < todayStartMs) overdue.push(t);
      else today.push(t);
    }

    const frozen = frozenTasks.filter(
      (t) => !t.deleted_at && t.status !== "done",
    );

    const cmp = (
      a: { due_at: string | null; priority?: number | null },
      b: { due_at: string | null; priority?: number | null },
    ) => {
      const pa = a.priority ?? 4;
      const pb = b.priority ?? 4;
      if (pa !== pb) return pa - pb;
      return (a.due_at ?? "").localeCompare(b.due_at ?? "");
    };
    overdue.sort(cmp);
    today.sort(cmp);
    frozen.sort(cmp);

    return { overdue, today, frozen, sphereById, projectById };
  });

  const overdue = data?.overdue ?? [];
  const today = data?.today ?? [];
  const frozen = data?.frozen ?? [];
  const sphereById = data?.sphereById ?? new Map();
  const projectById = data?.projectById ?? new Map();

  const parentIds = [...overdue, ...today, ...frozen].map((t) => t.id);
  const subtasksByParentId = useSubtasksMap(parentIds);

  const empty = overdue.length === 0 && today.length === 0;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex gap-1 p-1"
        style={{
          background: "var(--brand-50)",
          border: "1px solid var(--brand-200)",
          borderRadius: "var(--r-card)",
        }}
      >
        <TabButton
          active={tab === "today"}
          onClick={() => setTab("today")}
          label="Сегодня"
          count={overdue.length + today.length}
        />
        <TabButton
          active={tab === "frozen"}
          onClick={() => setTab("frozen")}
          label="❄ Заморожено"
          count={frozen.length}
        />
      </div>

      {tab === "today" && (
        <>
          {empty && (
            <Section>
              <EmptyState emoji="✨" title="Задач нет" hint="Отличный день!" />
            </Section>
          )}

          {overdue.length > 0 && (
            <Section accent label="⚠ Просрочено">
              <div className="space-y-1.5">
                {overdue.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    sphere={
                      t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null
                    }
                    project={
                      t.project_id ? projectById.get(t.project_id) ?? null : null
                    }
                    subtasks={subtasksByParentId.get(t.id)}
                    accentDate
                    onFreeze={() => freezeTaskLocal(t.id)}
                  />
                ))}
              </div>
            </Section>
          )}

          {today.length > 0 && (
            <Section label="⚡ Активные">
              <div className="space-y-1.5">
                {today.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    sphere={
                      t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null
                    }
                    project={
                      t.project_id ? projectById.get(t.project_id) ?? null : null
                    }
                    subtasks={subtasksByParentId.get(t.id)}
                    onFreeze={() => freezeTaskLocal(t.id)}
                  />
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {tab === "frozen" && (
        <Section label="❄ Заморожено">
          {frozen.length === 0 ? (
            <EmptyState
              emoji="❄"
              title="Пусто"
              hint="Жми ❄ у задачи, чтобы отложить её сюда"
            />
          ) : (
            <div className="space-y-1.5">
              {frozen.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  sphere={
                    t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null
                  }
                  project={
                    t.project_id ? projectById.get(t.project_id) ?? null : null
                  }
                  subtasks={subtasksByParentId.get(t.id)}
                  onUnfreeze={() => unfreezeTaskLocal(t.id)}
                />
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 px-3 py-2 text-[13px] font-semibold transition-colors"
      style={
        active
          ? {
              background: "#fff",
              color: "var(--brand-900)",
              borderRadius: "var(--r-chip)",
              boxShadow: "var(--shadow-card)",
            }
          : {
              background: "transparent",
              color: "var(--brand-600)",
              borderRadius: "var(--r-chip)",
            }
      }
    >
      {label}
      {count > 0 && (
        <span className="ml-1 text-[11px] font-medium opacity-60">{count}</span>
      )}
    </button>
  );
}
