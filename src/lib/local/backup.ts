"use client";

import { localDb } from "./db";
import type {
  InboxItemRow,
  ProjectRow,
  SphereRow,
  TaskRow,
} from "@/lib/db";

/**
 * Manual backup/restore of the local IndexedDB to a portable JSON blob.
 *
 * The blob is the user's last line of defense if both Dexie and Supabase
 * lose data (browser reset + free-tier project pause). Store the file in
 * Dropbox / Google Drive / a private repo.
 *
 * Schema is intentionally explicit and versioned — older blobs must
 * remain importable as the data model grows.
 */

export const BACKUP_VERSION = 1;

export type BackupBlob = {
  version: number;
  exported_at: string;
  app: "ivanplaner";
  data: {
    sphere: SphereRow[];
    project: ProjectRow[];
    task: TaskRow[];
    inbox_item: InboxItemRow[];
  };
};

/** Snapshot every synced table to a single JSON-serializable object. */
export async function exportAllLocal(): Promise<BackupBlob> {
  const db = localDb();
  const [sphere, project, task, inbox_item] = await Promise.all([
    db.sphere.toArray(),
    db.project.toArray(),
    db.task.toArray(),
    db.inbox_item.toArray(),
  ]);
  return {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    app: "ivanplaner",
    data: { sphere, project, task, inbox_item },
  };
}

/** Trigger a browser download of the JSON blob. */
export async function downloadBackup(): Promise<void> {
  const blob = await exportAllLocal();
  const counts =
    `s${blob.data.sphere.length}-p${blob.data.project.length}` +
    `-t${blob.data.task.length}-i${blob.data.inbox_item.length}`;
  const stamp = blob.exported_at.replace(/[:T]/g, "-").slice(0, 19);
  const filename = `ivanplaner-backup-${stamp}-${counts}.json`;
  const blobUrl = URL.createObjectURL(
    new Blob([JSON.stringify(blob, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

export type ImportMode = "merge" | "replace";
export type ImportSummary = {
  mode: ImportMode;
  inserted: { sphere: number; project: number; task: number; inbox_item: number };
};

/**
 * Restore from a backup blob.
 *
 * `merge`   — bulkPut over current Dexie (LWW by updated_at: newer wins
 *             on the row level via the if-newer check below). Outbox is
 *             not touched, so anything pending still pushes.
 * `replace` — wipes synced tables first, then bulkPut. The outbox is
 *             *not* wiped so locally-pending mutations are preserved.
 *
 * Either way we re-enqueue every imported row to the outbox so the
 * server eventually reflects the restored state.
 */
export async function importAllLocal(
  blob: BackupBlob,
  mode: ImportMode = "merge",
): Promise<ImportSummary> {
  if (blob.app !== "ivanplaner") throw new Error("Файл не от IvanPlaner");
  if (blob.version > BACKUP_VERSION) {
    throw new Error(
      `Версия бэкапа ${blob.version} новее поддерживаемой ${BACKUP_VERSION}. Обнови приложение.`,
    );
  }
  if (!blob.data) throw new Error("В файле нет данных");

  const db = localDb();
  const summary: ImportSummary = {
    mode,
    inserted: { sphere: 0, project: 0, task: 0, inbox_item: 0 },
  };

  await db.transaction(
    "rw",
    [db.sphere, db.project, db.task, db.inbox_item, db.outbox],
    async () => {
      if (mode === "replace") {
        await Promise.all([
          db.sphere.clear(),
          db.project.clear(),
          db.task.clear(),
          db.inbox_item.clear(),
        ]);
      }

      // Per-table merge: if local has a newer updated_at, keep local.
      // Otherwise overwrite with imported row.
      async function mergeInto<
        T extends { id: string; updated_at: string },
      >(name: "sphere" | "project" | "task" | "inbox_item", rows: T[]) {
        const tbl = db.table(name);
        const ids = rows.map((r) => r.id);
        const existing = (await tbl.bulkGet(ids)) as Array<
          { updated_at: string } | undefined
        >;
        const toPut: T[] = [];
        for (let i = 0; i < rows.length; i++) {
          const cur = existing[i];
          if (!cur || rows[i].updated_at >= cur.updated_at) {
            toPut.push(rows[i]);
          }
        }
        if (toPut.length) await tbl.bulkPut(toPut);
        summary.inserted[name] = toPut.length;

        // Enqueue every restored row so the server gets a copy too.
        const outboxEntries = toPut.map((row) => ({
          op: "insert" as const,
          table: name,
          row_id: row.id,
          payload: row as unknown as Record<string, unknown>,
          created_at: Date.now(),
          attempts: 0,
        }));
        if (outboxEntries.length) await db.outbox.bulkAdd(outboxEntries);
      }

      await mergeInto("sphere", blob.data.sphere);
      await mergeInto("project", blob.data.project);
      await mergeInto("task", blob.data.task);
      await mergeInto("inbox_item", blob.data.inbox_item);
    },
  );

  return summary;
}

/** Read a File from <input type="file"> and parse it. */
export async function parseBackupFile(file: File): Promise<BackupBlob> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Не удалось разобрать JSON");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as { app?: string }).app !== "ivanplaner"
  ) {
    throw new Error("Файл не похож на бэкап IvanPlaner");
  }
  return parsed as BackupBlob;
}
