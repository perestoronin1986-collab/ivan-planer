import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { SphereRow, ProjectRow } from "@/lib/db";
import { createTask } from "@/app/spheres/actions";
import { ProjectDeleteButton } from "@/components/ProjectDeleteButton";
import { OverdueActionSelect } from "@/components/OverdueActionSelect";
import { ProjectTasksList } from "./ProjectTasksList";

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
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="min-w-0 break-words text-2xl font-semibold">
            {p.name}
          </h1>
          <div className="mt-1 flex-shrink-0">
            <ProjectDeleteButton
              projectId={projectId}
              sphereId={sphereId}
              name={p.name}
            />
          </div>
        </div>
        <Link
          href={`/spheres/${sphereId}`}
          className="mt-1 inline-block text-sm text-neutral-500 hover:underline"
        >
          ← {s.icon} {s.name}
        </Link>
        {p.description && (
          <p className="mt-1 text-sm text-neutral-500">{p.description}</p>
        )}
      </div>

      <form action={createTask} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="sphereId" value={sphereId} />
        <input
          name="title"
          required
          placeholder="Новая задача…"
          className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 sm:flex-1"
        />
        <div className="flex gap-2">
          <input
            name="dueAt"
            type="date"
            className="min-w-0 flex-1 rounded border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 sm:flex-none"
          />
          <OverdueActionSelect />
          <button
            type="submit"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
          >
            + Задача
          </button>
        </div>
      </form>

      <ProjectTasksList projectId={projectId} sphereId={sphereId} />
    </main>
  );
}
