"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { useSubtasksMap } from "@/lib/local/useSubtasks";
import { TaskItem } from "@/components/TaskItem";
import type { ProjectRow, TaskRow } from "@/lib/db";

const STATUS_CHIP: Record<string, { bg: string; fg: string; label: string }> = {
  done: { bg: "#d1fae5", fg: "#065f46", label: "выполнен" },
  paused: { bg: "#fef3c7", fg: "#92400e", label: "пауза" },
  active: { bg: "var(--brand-100)", fg: "var(--brand-600)", label: "активный" },
};

export function SphereProjectsList({
  sphereId,
  projects,
}: {
  sphereId: string;
  projects: ProjectRow[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const data = useLiveQuery(async () => {
    const db = localDb();
    const [tasks, sphereRow] = await Promise.all([
      db.task.toArray(),
      db.sphere.get(sphereId),
    ]);
    const byProject = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      if (t.deleted_at || t.parent_id || !t.project_id) continue;
      if (t.status === "done") continue;
      let arr = byProject.get(t.project_id);
      if (!arr) {
        arr = [];
        byProject.set(t.project_id, arr);
      }
      arr.push(t);
    }
    for (const arr of byProject.values()) {
      arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
    return { byProject, sphere: sphereRow ?? null };
  }, [sphereId]);

  const byProject = data?.byProject;
  const sphere = data?.sphere ?? null;

  const visibleIds = projects
    .filter((p) => expanded.has(p.id))
    .flatMap((p) => (byProject?.get(p.id) ?? []).map((t) => t.id));
  const subtasksByParentId = useSubtasksMap(visibleIds);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      {projects.map((p) => {
        const chip = STATUS_CHIP[p.status] ?? STATUS_CHIP.active;
        const todo = byProject?.get(p.id) ?? [];
        const isOpen = expanded.has(p.id);

        return (
          <div key={p.id}>
            <button
              type="button"
              onClick={() => toggle(p.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-left"
              style={{ background: "var(--brand-50)" }}
            >
              {p.icon && <span className="flex-shrink-0">{p.icon}</span>}
              <span
                className="min-w-0 flex-1 truncate font-medium text-sm"
                style={{ color: "var(--brand-900)" }}
              >
                {p.name}
              </span>
              <span
                className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: chip.bg, color: chip.fg }}
              >
                {chip.label}
              </span>
              {byProject && todo.length > 0 && (
                <span
                  className="flex-shrink-0 text-[11px] font-semibold tabular-nums"
                  style={{ color: "var(--brand-600)" }}
                  title={`${todo.length} незаконченных`}
                >
                  {todo.length}
                </span>
              )}
              <ChevronRight
                size={16}
                className="flex-shrink-0 transition-transform"
                style={{
                  color: "var(--brand-400)",
                  transform: isOpen ? "rotate(90deg)" : undefined,
                }}
              />
            </button>

            {isOpen && (
              <div className="mt-1.5 space-y-1.5 pl-3">
                {todo.length === 0 ? (
                  <p className="py-1 text-sm text-muted">Незаконченных нет.</p>
                ) : (
                  todo.map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      sphere={sphere}
                      subtasks={subtasksByParentId.get(t.id)}
                      showSphere={false}
                      showProject={false}
                    />
                  ))
                )}
                <Link
                  href={`/spheres/${sphereId}/projects/${p.id}`}
                  className="inline-block py-1 text-xs font-medium"
                  style={{ color: "var(--brand-600)" }}
                >
                  → открыть проект
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
