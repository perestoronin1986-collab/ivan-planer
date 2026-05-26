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
import { PageShell, Section, EmptyState } from "@/components/ui";

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
      <PageShell title="Инбокс" emoji="📥">
        <Section>
          <p className="text-sm text-muted">Войди для работы с inbox.</p>
          <Link className="text-sm underline" href="/login" style={{ color: "var(--brand-600)" }}>
            /login
          </Link>
        </Section>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Инбокс"
      emoji="📥"
      subtitle="быстрые записи — потом разберёшь"
    >
      <QuickCapture
        onAdd={async (content) => {
          if (!userId) return;
          await addInboxItemLocal(userId, content);
        }}
      />

      {items && items.length === 0 && (
        <Section>
          <EmptyState emoji="📥" title="Инбокс пуст" hint="Запиши мысль выше" />
        </Section>
      )}

      {items?.map((item) => (
        <Section key={item.id}>
          <p className="text-sm">{item.content}</p>
          <p className="text-xs text-muted mt-1">
            {new Date(item.created_at).toLocaleString("ru")}
          </p>

          <div className="mt-3">
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
          </div>

          <div className="mt-2">
            <ConfirmDeleteButton
              onConfirm={() => deleteInboxItemLocal(item.id)}
              message="Удалить запись из Inbox?"
              description={item.content}
            />
          </div>
        </Section>
      ))}
    </PageShell>
  );
}

function QuickCapture({
  onAdd,
}: {
  onAdd: (content: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!trimmed) return;
        await onAdd(trimmed);
        setValue("");
      }}
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Запиши мысль, идею, задачу…"
        autoFocus
        className="flex-1 rounded-[14px] border border-[var(--brand-200)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--brand-500)]"
      />
      <button
        type="submit"
        disabled={!trimmed}
        className="rounded-[14px] bg-[linear-gradient(135deg,#7c3aed,#8b5cf6)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_15px_rgba(124,58,237,0.4)] disabled:opacity-50"
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
