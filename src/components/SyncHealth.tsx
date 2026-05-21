"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import { runSync } from "@/lib/local/sync";
import { useState } from "react";

/**
 * Shows pending outbox + dead-letter counts.
 * - Pending > 0: small grey badge.
 * - Dead > 0: red warning, clickable for details + retry/discard.
 *
 * Dead-letter entries indicate a poison mutation that was rejected by
 * Supabase 5 times in a row (e.g. CHECK violation, schema drift). Without
 * this indicator a user silently loses writes — they keep operating
 * locally while the queue is dead.
 */
export function SyncHealth() {
  const [open, setOpen] = useState(false);

  const counts = useLiveQuery(async () => {
    const db = localDb();
    const [pending, dead] = await Promise.all([
      db.outbox.count(),
      db.outbox_dead.count(),
    ]);
    return { pending, dead };
  });

  const deadEntries = useLiveQuery(
    async () => (open ? await localDb().outbox_dead.toArray() : []),
    [open],
  );

  if (!counts) return null;

  return (
    <>
      <span className="inline-flex items-center gap-2 text-xs">
        {counts.pending > 0 && (
          <span
            className="text-neutral-500"
            title={`${counts.pending} мутаций ждут отправки на сервер`}
          >
            ⟳ {counts.pending}
          </span>
        )}
        {counts.dead > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded bg-red-100 px-2 py-0.5 font-medium text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300"
            title="Мутации, которые сервер отверг 5 раз подряд. Кликни для деталей."
          >
            ⚠ {counts.dead} не синхронизировано
          </button>
        )}
      </span>

      {open && deadEntries && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl space-y-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Зависшие мутации</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Сервер отверг эти изменения. Локально они применены, но на
              сервер не ушли. Проверь данные, потом «Повторить» (вернёт в
              очередь) или «Удалить» (сотрёт навсегда).
            </p>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {deadEntries.length === 0 && (
                <p className="text-sm text-neutral-500">Пусто.</p>
              )}
              {deadEntries.map((e) => (
                <div
                  key={e.id}
                  className="space-y-1 rounded border border-red-200 p-3 text-xs dark:border-red-900"
                >
                  <div className="font-mono">
                    {e.op} {e.table} {e.row_id}
                  </div>
                  <div className="text-red-600 dark:text-red-400">
                    {e.last_error}
                  </div>
                  <div className="text-neutral-400">
                    {new Date(e.failed_at).toLocaleString("ru")}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        const db = localDb();
                        await db.transaction(
                          "rw",
                          db.outbox,
                          db.outbox_dead,
                          async () => {
                            await db.outbox.add({
                              op: e.op,
                              table: e.table,
                              row_id: e.row_id,
                              payload: e.payload,
                              created_at: Date.now(),
                              attempts: 0,
                            });
                            await db.outbox_dead.delete(e.id!);
                          },
                        );
                        void runSync();
                      }}
                      className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      Повторить
                    </button>
                    <button
                      type="button"
                      onClick={() => localDb().outbox_dead.delete(e.id!)}
                      className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
