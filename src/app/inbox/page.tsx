"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import {
  addInboxItemLocal,
  deleteInboxItemLocal,
  processInboxToTaskLocal,
} from "@/lib/local/mutations";
import { useUserId } from "@/lib/local/useUser";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

export default function InboxPage() {
  const userId = useUserId();

  const items = useLiveQuery(async () =>
    (await localDb().inbox_item.toArray())
      .filter((r) => !r.processed_at && !r.deleted_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );

  const spheres = useLiveQuery(async () =>
    (await localDb().sphere.toArray())
      .filter((s) => !s.deleted_at && !s.archived)
      .sort((a, b) => a.order - b.order),
  );

  const projects = useLiveQuery(async () =>
    (await localDb().project.toArray())
      .filter((p) => !p.deleted_at)
      .sort((a, b) => a.order - b.order),
  );

  if (userId === undefined) {
    return (
      <main className="mx-auto w-full max-w-3xl p-6">
        <p className="text-sm text-neutral-500">Войди для работы с inbox.</p>
        <Link className="text-sm underline" href="/login">
          /login
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← главная
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-neutral-500">
          Быстрые записи — потом разберёшь
        </p>
      </div>

      <QuickCapture
        disabled={!userId}
        onAdd={async (content) => {
          if (!userId) return;
          await addInboxItemLocal(userId, content);
        }}
      />

      <div className="space-y-3">
        {items && items.length === 0 && (
          <p className="py-4 text-center text-sm text-neutral-500">
            Inbox пуст.
          </p>
        )}
        {items?.map((item) => (
          <div
            key={item.id}
            className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <p className="text-sm">{item.content}</p>
            <p className="text-xs text-neutral-400">
              {new Date(item.created_at).toLocaleString("ru")}
            </p>

            <ProcessRow
              spheres={spheres ?? []}
              projects={projects ?? []}
              disabled={!userId}
              onConvert={async (sphereId, projectId) => {
                if (!userId) return;
                await processInboxToTaskLocal({
                  userId,
                  inboxId: item.id,
                  content: item.content,
                  sphereId,
                  projectId,
                });
              }}
            />

            <ConfirmDeleteButton
              onConfirm={() => deleteInboxItemLocal(item.id)}
              message="Удалить запись из Inbox?"
              description={item.content}
            />
          </div>
        ))}
      </div>
    </main>
  );
}

function QuickCapture({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (content: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const v = value.trim();
        if (!v) return;
        await onAdd(v);
        setValue("");
      }}
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
        placeholder="Запиши мысль, идею, задачу…"
        autoFocus
        className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700"
      />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        Записать
      </button>
    </form>
  );
}

function ProcessRow({
  spheres,
  projects,
  disabled,
  onConvert,
}: {
  spheres: { id: string; icon: string | null; name: string }[];
  projects: { id: string; name: string }[];
  disabled: boolean;
  onConvert: (sphereId: string | null, projectId: string | null) => Promise<void>;
}) {
  const [sphereId, setSphereId] = useState("");
  const [projectId, setProjectId] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onConvert(sphereId || null, projectId || null);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <select
        value={sphereId}
        onChange={(e) => setSphereId(e.target.value)}
        className="rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
      >
        <option value="">— сфера —</option>
        {spheres.map((s) => (
          <option key={s.id} value={s.id}>
            {s.icon} {s.name}
          </option>
        ))}
      </select>

      <select
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        className="rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
      >
        <option value="">— проект (опционально) —</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={disabled || (!sphereId && !projectId)}
        className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        → в задачу
      </button>
    </form>
  );
}
