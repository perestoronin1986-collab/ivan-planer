import { notFound } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { SphereRow, ProjectRow } from "@/lib/db";
import { createProject, createTask } from "../actions";
import { OverdueActionSelect } from "@/components/OverdueActionSelect";
import { SphereProjectsList } from "./SphereProjectsList";
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
          <SphereProjectsList sphereId={sphereId} projects={projectList} />
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
