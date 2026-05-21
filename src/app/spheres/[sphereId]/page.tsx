import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { SphereRow, ProjectRow } from "@/lib/db";
import { createProject, createTask } from "../actions";
import { OverdueActionSelect } from "@/components/OverdueActionSelect";
import { SphereTasksList } from "./SphereTasksList";

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
    <main className="mx-auto w-full max-w-3xl space-y-8 p-6">
      <div>
        <Link
          href="/spheres"
          className="text-sm text-neutral-500 hover:underline"
        >
          ← сферы
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
          <span
            className="inline-block h-4 w-4 rounded-full"
            style={{ background: s.color }}
          />
          {s.icon} {s.name}
        </h1>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Проекты</h2>
        <div className="grid gap-2">
          {projectList.map((p) => (
            <Link
              key={p.id}
              href={`/spheres/${sphereId}/projects/${p.id}`}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              <span className="font-medium">{p.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  p.status === "done"
                    ? "bg-emerald-100 text-emerald-700"
                    : p.status === "paused"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {p.status}
              </span>
            </Link>
          ))}
        </div>
        <form action={createProject} className="flex gap-2">
          <input type="hidden" name="sphereId" value={sphereId} />
          <input
            name="icon"
            placeholder="🎬"
            maxLength={2}
            className="w-12 rounded border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700"
          />
          <input
            name="name"
            required
            placeholder="Новый проект…"
            className="flex-1 rounded border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700"
          />
          <button
            type="submit"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
          >
            + Проект
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Задачи сферы (без проекта)</h2>
        <SphereTasksList sphereId={sphereId} />
        <form
          action={createTask}
          className="flex flex-col gap-2 sm:flex-row"
        >
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
      </section>
    </main>
  );
}
