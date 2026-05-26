"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { useUserId } from "@/lib/local/useUser";
import { TaskItem } from "@/components/TaskItem";
import { AddTaskModal } from "@/app/today/AddTaskModal";
import { PageShell, Section, EmptyState } from "@/components/ui";
import type { TaskRow } from "@/lib/db";

export default function TasksPage() {
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
      .sort((a, b) => {
        if (a.status !== b.status) {
          return statusRank(a.status) - statusRank(b.status);
        }
        if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at);
        if (a.due_at) return -1;
        if (b.due_at) return 1;
        return b.created_at.localeCompare(a.created_at);
      });
    return { live, sphereById, projectById };
  });

  if (userId === undefined) {
    return (
      <PageShell title="Активные" emoji="⚡">
        <Section>
          <p className="text-sm text-muted">Войди для работы с задачами.</p>
          <Link className="text-sm underline" href="/login" style={{ color: "var(--brand-600)" }}>
            /login
          </Link>
        </Section>
      </PageShell>
    );
  }

  const tasks = data?.live ?? [];
  const sphereById = data?.sphereById ?? new Map();
  const projectById = data?.projectById ?? new Map();
  const todo = tasks.filter((t) => t.status !== "done");

  const spheres = data ? Array.from(data.sphereById.values()).map((s) => ({ id: s.id, name: s.name, icon: s.icon ?? null })) : [];
  const projects = data ? Array.from(data.projectById.values()).map((p) => ({ id: p.id, name: p.name })) : [];
  const todayDefault = new Date().toISOString().slice(0, 10);

  return (
    <PageShell
      title="Активные"
      emoji="⚡"
      subtitle={`${todo.length} задач`}
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
      <Section label="⚡ Все активные">
        {todo.length === 0 ? (
          <EmptyState emoji="🎉" title="Все задачи выполнены!" />
        ) : (
          <div className="space-y-1.5">
            {todo.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                sphere={t.sphere_id ? sphereById.get(t.sphere_id) ?? null : null}
                project={t.project_id ? projectById.get(t.project_id) ?? null : null}
              />
            ))}
          </div>
        )}
      </Section>
    </PageShell>
  );
}

function statusRank(s: TaskRow["status"]): number {
  if (s === "doing") return 0;
  if (s === "todo") return 1;
  return 2;
}
