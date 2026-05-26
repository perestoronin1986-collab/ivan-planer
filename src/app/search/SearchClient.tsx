"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { useSubtasksMap } from "@/lib/local/useSubtasks";
import { TaskItem } from "@/components/TaskItem";
import type { InboxItemRow, TaskRow } from "@/lib/db";

/**
 * Client-side search across local Dexie state.
 *
 * Scope: task.title, task.description, inbox_item.content.
 * Filters: hide deleted always; toggle for hiding done tasks.
 * Ranking: title-hit > description-hit > inbox-hit; ties broken by
 * recency (updated_at desc).
 *
 * Lives on /search as a full page so it works on mobile / PWA without
 * keyboard shortcuts. A modal-style overlay with Ctrl+K can be added
 * later as another entry point.
 */
export function SearchClient() {
  const [query, setQuery] = useState("");
  const [hideDone, setHideDone] = useState(true);

  const data = useLiveQuery(async () => {
    const db = localDb();
    const [tasks, inbox, spheres, projects] = await Promise.all([
      db.task.toArray(),
      db.inbox_item.toArray(),
      db.sphere.toArray(),
      db.project.toArray(),
    ]);
    const sphereById = new Map(spheres.map((s) => [s.id, s]));
    const projectById = new Map(projects.map((p) => [p.id, p]));
    return { tasks, inbox, sphereById, projectById };
  });

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!data || q.length < 2) return null;

    const taskHits: Array<{ task: TaskRow; rank: number }> = [];
    for (const t of data.tasks) {
      if (t.deleted_at) continue;
      if (hideDone && t.status === "done") continue;
      // Скрываем шаблоны регулярок — рекурент-template маркируется done+rrule.
      if (t.rrule) continue;
      const title = t.title.toLowerCase();
      const desc = (t.description ?? "").toLowerCase();
      if (title.includes(q)) {
        taskHits.push({ task: t, rank: 0 });
      } else if (desc.includes(q)) {
        taskHits.push({ task: t, rank: 1 });
      }
    }
    taskHits.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return (b.task.updated_at ?? "").localeCompare(a.task.updated_at ?? "");
    });

    const inboxHits: InboxItemRow[] = data.inbox
      .filter(
        (i) =>
          !i.deleted_at &&
          !i.processed_at &&
          i.content.toLowerCase().includes(q),
      )
      .sort((a, b) =>
        (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
      );

    return { taskHits, inboxHits };
  }, [data, q, hideDone]);

  const subtasksByParentId = useSubtasksMap(
    results?.taskHits.map((h) => h.task.id) ?? [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Что ищем? Минимум 2 символа…"
          className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <label className="flex flex-shrink-0 items-center gap-2 text-xs text-neutral-500">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
          />
          Скрыть выполненные
        </label>
      </div>

      {results === null && (
        <p className="py-4 text-center text-sm text-neutral-400">
          Введи запрос для поиска.
        </p>
      )}

      {results && results.taskHits.length === 0 && results.inboxHits.length === 0 && (
        <p className="py-4 text-center text-sm text-neutral-500">
          Ничего не найдено.
        </p>
      )}

      {results && results.taskHits.length > 0 && (
        <section className="space-y-1.5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Задачи ({results.taskHits.length})
          </h2>
          {results.taskHits.map(({ task }) => (
            <TaskItem
              key={task.id}
              task={task}
              sphere={
                task.sphere_id
                  ? data?.sphereById.get(task.sphere_id) ?? null
                  : null
              }
              project={
                task.project_id
                  ? data?.projectById.get(task.project_id) ?? null
                  : null
              }
              subtasks={subtasksByParentId.get(task.id)}
            />
          ))}
        </section>
      )}

      {results && results.inboxHits.length > 0 && (
        <section className="space-y-1.5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Inbox ({results.inboxHits.length})
          </h2>
          {results.inboxHits.map((i) => (
            <Link
              key={i.id}
              href="/inbox"
              className="block rounded-md border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              <p>{i.content}</p>
              <p className="mt-0.5 text-xs text-neutral-400">
                {new Date(i.created_at).toLocaleString("ru")}
              </p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
