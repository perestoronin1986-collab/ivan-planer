"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { useUserId } from "@/lib/local/useUser";
import { useSubtasksMap } from "@/lib/local/useSubtasks";
import { TaskItem } from "@/components/TaskItem";
import { AddTaskModal } from "@/app/today/AddTaskModal";
import { PageShell, Section, EmptyState } from "@/components/ui";

export default function UrgentTasksPage() {
  const userId = useUserId();

  const data = useLiveQuery(async () => {
    const db = localDb();
    const [tasks, spheres, projects] = await Promise.all([
      db.task.toArray(),
      db.sphere.toArray(),
      db.project.toArray(),
    ]);
    const sphereById = new Map(spheres.map((s) => [s.id, s]));
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const templateIds = new Set(tasks.filter((t) => t.rrule).map((t) => t.id));
    const live = tasks
      .filter((t) => !t.deleted_at)
      .filter((t) => !t.parent_id || templateIds.has(t.parent_id))
      .filter((t) => (t.priority ?? 4) === 1)
      .filter((t) => t.status !== "done")
      .sort((a, b) => {
        if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at);
        if (a.due_at) return -1;
        if (b.due_at) return 1;
        return b.created_at.localeCompare(a.created_at);
      });
    return { live, sphereById, projectById };
  });

  const tasks = data?.live ?? [];
  const sphereById = data?.sphereById ?? new Map();
  const projectById = data?.projectById ?? new Map();
  const subtasksByParentId = useSubtasksMap(tasks.map((t) => t.id));

  if (userId === undefined) {
    return (
      <PageShell title="Срочные" emoji="🔥">
        <Section>
          <p className="text-sm text-muted">Войди для работы с задачами.</p>
          <Link className="text-sm underline" href="/login" style={{ color: "var(--brand-600)" }}>
            /login
          </Link>
        </Section>
      </PageShell>
    );
  }

  const spheres = data ? Array.from(data.sphereById.values()).map((s) => ({ id: s.id, name: s.name, icon: s.icon ?? null })) : [];
  const projects = data ? Array.from(data.projectById.values()).map((p) => ({ id: p.id, name: p.name })) : [];
  const todayDefault = new Date().toISOString().slice(0, 10);

  return (
    <PageShell
      title="Срочные"
      emoji="🔥"
      subtitle={`${tasks.length} задач P1`}
      actions={
        <AddTaskModal
          spheres={spheres}
          projects={projects}
          todayDefault={todayDefault}
          triggerChildren="+"
          triggerClassName="flex items-center justify-center w-9 h-9 rounded-full bg-[linear-gradient(135deg,#7c3aed,#8b5cf6)] text-white text-xl font-bold shadow-[0_4px_15px_rgba(124,58,237,0.4)]"
        />
      }
    >
      <Section label="🔥 Приоритет P1">
        {tasks.length === 0 ? (
          <EmptyState emoji="✨" title="Нет срочных задач" />
        ) : (
          <div className="space-y-1.5">
            {tasks.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                sphere={t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null}
                project={t.project_id ? projectById.get(t.project_id) ?? null : null}
                subtasks={subtasksByParentId.get(t.id)}
              />
            ))}
          </div>
        )}
      </Section>
    </PageShell>
  );
}
