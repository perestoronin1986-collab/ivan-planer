"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local/db";
import {
  downloadBackup,
  importAllLocal,
  parseBackupFile,
  type ImportMode,
  type ImportSummary,
} from "@/lib/local/backup";
import { runSync } from "@/lib/local/sync";

/**
 * Backup / restore controls. Lives on /settings.
 *
 * Export: produces a JSON file the user should save to Dropbox/Drive.
 * Import: parses a JSON, merges or replaces local state, then kicks
 * runSync so the restored rows push to Supabase.
 *
 * `replace` is destructive — gated behind a typed confirmation.
 */
export function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);

  const counts = useLiveQuery(async () => {
    const db = localDb();
    const [s, p, t, i] = await Promise.all([
      db.sphere.count(),
      db.project.count(),
      db.task.count(),
      db.inbox_item.count(),
    ]);
    return { s, p, t, i };
  });

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      await downloadBackup();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const blob = await parseBackupFile(file);
      if (mode === "replace" && confirmText !== "ЗАМЕНИТЬ") {
        throw new Error("Введи слово ЗАМЕНИТЬ для подтверждения");
      }
      const summary = await importAllLocal(blob, mode);
      setResult(summary);
      void runSync();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Резервные копии</h2>
        <p className="text-sm text-neutral-500">
          Локальные данные хранятся в IndexedDB браузера. Если очистишь
          кэш или Supabase удалит проект — потеряешь всё. Скачивай бэкап
          раз в неделю и клади в Dropbox/Drive.
        </p>
        {counts && (
          <p className="text-xs text-neutral-400">
            Сейчас локально: {counts.s} сфер, {counts.p} проектов, {counts.t}{" "}
            задач, {counts.i} inbox-записей.
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="text-sm font-medium">Скачать JSON</h3>
        <p className="text-xs text-neutral-500">
          Выгружает всё локальное состояние в один файл.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={busy}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {busy ? "Готовлю…" : "Скачать бэкап"}
        </button>
      </div>

      <div className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="text-sm font-medium">Восстановить из JSON</h3>
        <p className="text-xs text-neutral-500">
          После импорта строки уйдут и на сервер через обычный sync.
          Используется LWW — если на сервере уже есть более новая версия
          строки, она остаётся.
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={mode === "merge"}
              onChange={() => setMode("merge")}
            />
            <span>
              <b>Слить</b> — текущие данные сохраняются, импорт дополняет.
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
            />
            <span>
              <b>Заменить</b> — стирает локальные данные и ставит из бэкапа.
              Серверу уйдут импортированные версии.
            </span>
          </label>
        </div>

        {mode === "replace" && (
          <div className="space-y-1 rounded border border-red-300 bg-red-50 p-3 text-xs dark:border-red-900 dark:bg-red-950">
            <p className="font-medium text-red-700 dark:text-red-300">
              Внимание: режим «Заменить» сотрёт локальные данные. Сначала
              скачай свежий бэкап текущего состояния.
            </p>
            <p className="text-red-600 dark:text-red-400">
              Введи слово <code>ЗАМЕНИТЬ</code> чтобы разблокировать:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1 w-40 rounded border border-red-300 px-2 py-1 text-xs dark:border-red-800 dark:bg-neutral-900"
            />
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImport(f);
          }}
          className="block text-xs text-neutral-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {result && (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          <p className="font-medium">
            Импорт ({result.mode === "merge" ? "слияние" : "замена"}) завершён.
          </p>
          <p>
            Применено строк: сфер {result.inserted.sphere}, проектов{" "}
            {result.inserted.project}, задач {result.inserted.task}, inbox{" "}
            {result.inserted.inbox_item}.
          </p>
        </div>
      )}
    </section>
  );
}
