"use client";

import Dexie, { type Table } from "dexie";
import type {
  InboxItemRow,
  ProjectRow,
  SphereRow,
  TaskRow,
} from "@/lib/db";

/**
 * Outbox entry — local mutation pending push to Supabase.
 * - op: 'insert' | 'update' | 'delete'
 * - table: target Supabase table name (snake_case)
 * - payload: row data for insert/update; for delete it's { id }
 * - created_at: ms timestamp for FIFO order
 * - attempts: retry counter
 * - last_error: serialized last failure
 */
export type OutboxOp = "insert" | "update" | "delete";
export type OutboxTable = "sphere" | "project" | "task" | "inbox_item";

export type OutboxEntry = {
  id?: number;
  op: OutboxOp;
  table: OutboxTable;
  row_id: string;
  payload: Record<string, unknown>;
  created_at: number;
  attempts: number;
  last_error?: string | null;
};

/**
 * Dead-letter outbox: entries that failed permanently (>= MAX_ATTEMPTS).
 * Kept out of the main outbox so a single poison entry can't block all
 * subsequent mutations. Surfaced in the UI for manual review/retry.
 */
export type OutboxDeadEntry = OutboxEntry & {
  failed_at: number;
};

export type SyncMetaKv = {
  key: string;
  value: string;
};

/**
 * Local Dexie database mirroring synced tables + outbox + sync metadata.
 *
 * Indexes:
 *   - tables index `id` (PK), `user_id`, `updated_at`, `deleted_at` for queries
 *   - outbox indexes `created_at`, `[table+row_id]` for collapsing
 *   - sync_meta keyed by string (e.g. `last_sync_at:task`)
 */
export class LocalDB extends Dexie {
  sphere!: Table<SphereRow, string>;
  project!: Table<ProjectRow, string>;
  task!: Table<TaskRow, string>;
  inbox_item!: Table<InboxItemRow, string>;
  outbox!: Table<OutboxEntry, number>;
  outbox_dead!: Table<OutboxDeadEntry, number>;
  sync_meta!: Table<SyncMetaKv, string>;

  constructor() {
    super("ivanplaner");
    this.version(1).stores({
      sphere: "id, user_id, updated_at, deleted_at, order, archived",
      project:
        "id, user_id, sphere_id, updated_at, deleted_at, status, order",
      task:
        "id, user_id, sphere_id, project_id, parent_id, status, due_at, updated_at, deleted_at, order",
      inbox_item: "id, user_id, processed_at, updated_at, deleted_at",
      outbox: "++id, created_at, [table+row_id], table",
      sync_meta: "key",
    });
    // v2: add dead-letter outbox for permanently failed entries.
    this.version(2).stores({
      outbox_dead: "++id, failed_at, table",
    });
    // v3: add priority index on task; backfill default 4 on existing rows.
    this.version(3)
      .stores({
        task:
          "id, user_id, sphere_id, project_id, parent_id, status, due_at, priority, updated_at, deleted_at, order",
      })
      .upgrade(async (tx) => {
        await tx.table("task").toCollection().modify((t: any) => {
          if (t.priority == null) t.priority = 4;
        });
      });
  }
}

let _db: LocalDB | null = null;

export function localDb(): LocalDB {
  if (typeof window === "undefined") {
    throw new Error("LocalDB only available in browser");
  }
  if (!_db) _db = new LocalDB();
  return _db;
}

export async function getMeta(key: string): Promise<string | null> {
  const row = await localDb().sync_meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await localDb().sync_meta.put({ key, value });
}
