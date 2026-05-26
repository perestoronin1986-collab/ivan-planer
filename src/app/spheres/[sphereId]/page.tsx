import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { SphereRow, ProjectRow } from "@/lib/db";
import { createProject, createTask } from "../actions";
import { OverdueActionSelect } from "@/components/OverdueActionSelect";
import { SphereTasksList } from "./SphereTasksList";
import { PageShell, Section, EmptyState } from "@/components/ui";
import { inputClass, primaryBtnClass } from "@/components/ui/formStyles";

export default async function SpherePage({
  params,
}: {
  params: Promise<{ sphereId: string }>;
}) {
  const { sphereId } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: s } = await supabase
    .from("sphere")
    .select("*")
    .eq("id", sphereId)
    .maybeSingle<SphereRow>();
  if (!s) notFound();

  const { data: projects } = await supabase
    .from("project")
    .select("*")
    .eq("sphere_id", sphereId)
    .order("order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<ProjectRow[]>();

  const projectList = projects ?? [];

  const statusChip = (status: string) => {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      done: { bg: "#d1fae5", fg: "#065f46", label: "выполнен" },
      paused: { bg: "#fef3c7", fg: "#92400e", label: "пауза" },
      active: { bg: "var(--brand-100)", fg: "var(--brand-600)", label: "активный" },
    };
    return map[status] ?? map.active;
  };

  return (
    <PageShell
      title={s.name}
      emoji={s.icon ?? "🌐"}
      subtitle={`${projectList.length} проектов`}
      backHref="/spheres"
      backLabel="сферы"
    >
      <Section label="📁 Проекты">
        {projectList.length === 0 ? (
          <EmptyState emoji="📁" title="Нет проектов" hint="Создай первый ниже" />
        ) : (
          <div className="flex flex-col gap-1.5">
            {projectList.map((p) => {
              const chip = statusChip(p.status);
              return (
                <Link
                  key={p.id}
                  href={`/spheres/${sphereId}/projects/${p.id}`}
                  className="flex items-center justify-between rounded-[10px] px-3 py-2.5"
                  style={{ background: "var(--brand-50)" }}
                >
                  <span
                    className="font-medium text-sm"
                    style={{ color: "var(--brand-900)" }}
                  >
                    {p.name}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ background: chip.bg, color: chip.fg }}
                  >
                    {chip.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
        <form action={createProject} className="flex gap-2 mt-3">
          <input type="hidden" name="sphereId" value={sphereId} />
          <input
            name="icon"
            placeholder="🎬"
            maxLength={2}
            className={`w-12 ${inputClass}`}
          />
          <input
            name="name"
            required
            placeholder="Новый проект…"
            className={`flex-1 ${inputClass}`}
          />
          <button type="submit" className={primaryBtnClass}>
            + Проект
          </button>
        </form>
      </Section>

      <Section label="⚡ Задачи сферы (без проекта)">
        <SphereTasksList sphereId={sphereId} />
        <form action={createTask} className="flex flex-col gap-2 mt-3">
          <input type="hidden" name="sphereId" value={sphereId} />
          <input
            name="title"
            required
            placeholder="Новая задача…"
            className={`w-full ${inputClass}`}
          />
          <div className="flex gap-2">
            <input
              name="dueAt"
              type="date"
              className={`flex-1 min-w-0 ${inputClass}`}
            />
            <OverdueActionSelect />
            <button type="submit" className={primaryBtnClass}>
              + Задача
            </button>
          </div>
        </form>
      </Section>
    </PageShell>
  );
}
