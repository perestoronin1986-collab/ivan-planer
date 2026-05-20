import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { InboxItemRow, SphereRow, ProjectRow } from "@/lib/db";
import { addInboxItem, processInboxItem } from "./actions";
import { Trash2 } from "lucide-react";

export default async function InboxPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("inbox_item")
    .select("*")
    .is("processed_at", null)
    .order("created_at", { ascending: false })
    .returns<InboxItemRow[]>();

  const { data: spheres } = await supabase
    .from("sphere")
    .select("*")
    .order("order", { ascending: true })
    .returns<SphereRow[]>();

  const { data: projects } = await supabase
    .from("project")
    .select("*")
    .order("order", { ascending: true })
    .returns<ProjectRow[]>();

  const pending = items ?? [];
  const sphereList = spheres ?? [];
  const projectList = projects ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">← главная</Link>
        <h1 className="text-2xl font-semibold mt-1">Inbox</h1>
        <p className="text-sm text-neutral-500">Быстрые записи — потом разберёшь</p>
      </div>

      {/* Quick capture */}
      <form action={addInboxItem} className="flex gap-2">
        <input
          name="content"
          required
          placeholder="Запиши мысль, идею, задачу…"
          autoFocus
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700"
        />
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Записать
        </button>
      </form>

      {/* Pending items */}
      <div className="space-y-3">
        {pending.length === 0 && (
          <p className="text-sm text-neutral-500 py-4 text-center">Inbox пуст.</p>
        )}
        {pending.map((item) => (
          <div key={item.id} className="rounded-lg border border-neutral-200 p-4 space-y-3 dark:border-neutral-800">
            <p className="text-sm">{item.content}</p>
            <p className="text-xs text-neutral-400">
              {new Date(item.created_at).toLocaleString("ru")}
            </p>

            {/* Process as task */}
            <form action={processInboxItem} className="flex flex-wrap gap-2 items-center">
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="content" value={item.content} />
              <input type="hidden" name="action" value="task" />

              <select
                name="sphereId"
                className="rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="">— сфера —</option>
                {sphereList.map((s) => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>

              <select
                name="projectId"
                className="rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="">— проект (опционально) —</option>
                {projectList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <button
                type="submit"
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
              >
                → в задачу
              </button>
            </form>

            {/* Delete */}
            <form action={processInboxItem}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="action" value="delete" />
              <button type="submit" className="text-neutral-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
