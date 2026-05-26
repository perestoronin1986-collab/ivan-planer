import { notFound } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { SphereRow, ProjectRow } from "@/lib/db";
import { createTask } from "@/app/spheres/actions";
import { ProjectDeleteButton } from "@/components/ProjectDeleteButton";
import { OverdueActionSelect } from "@/components/OverdueActionSelect";
import { ProjectTasksList } from "./ProjectTasksList";
import { PageShell, Section } from "@/components/ui";
import { inputClass, primaryBtnClass } from "@/components/ui/formStyles";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ sphereId: string; projectId: string }>;
}) {
  const { sphereId, projectId } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: s } = await supabase
    .from("sphere")
    .select("*")
    .eq("id", sphereId)
    .maybeSingle<SphereRow>();
  if (!s) notFound();

  const { data: p } = await supabase
    .from("project")
    .select("*")
    .eq("id", projectId)
    .maybeSingle<ProjectRow>();
  if (!p) notFound();

  return (
    <PageShell
      title={p.name}
      emoji="📁"
      subtitle={`${s.icon ?? ""} ${s.name}`.trim()}
      backHref={`/spheres/${sphereId}`}
      backLabel={`${s.icon ? s.icon + " " : ""}${s.name}`}
      actions={
        <ProjectDeleteButton
          projectId={projectId}
          sphereId={sphereId}
          name={p.name}
        />
      }
    >
      {p.description && (
        <Section>
          <p className="text-sm text-muted">{p.description}</p>
        </Section>
      )}

      <Section label="➕ Новая задача">
        <form action={createTask} className="flex flex-col gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="sphereId" value={sphereId} />
          <input
            name="title"
            required
            placeholder="Что нужно сделать?"
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
              +
            </button>
          </div>
        </form>
      </Section>

      <Section label="⚡ Задачи проекта">
        <ProjectTasksList projectId={projectId} sphereId={sphereId} />
      </Section>
    </PageShell>
  );
}
