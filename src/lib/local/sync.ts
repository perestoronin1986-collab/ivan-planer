"use client";

import { createClient } from "@/lib/supabase/client";
import {
  type OutboxEntry,
  type OutboxOp,
  type OutboxTable,
  getMeta,
  localDb,
  setMeta,
} from "./db";

/**
 * Sync engine — bidirectional Supabase <-> Dexie sync with LWW conflict
 * resolution by `updated_at`.
 *
 * Push: drain outbox in FIFO order; on success drop entry; on auth/network
 * error, leave entry and bump `attempts`.
 *
 * Pull: per-table fetch rows where `updated_at > last_sync_at:<table>` and
 * upsert into Dexie. Soft-deleted rows (deleted_at != null) are removed
 * from local store after upsert (we want them gone from UI).
 *
 * Triggers:
 *   - `online` event in window (registered by ServiceWorkerRegister)
 *   - custom `ivanplaner:sync-outbox` event (manual or from SW background sync)
 *   - explicit call from page mount
 *
 * NOTE: only runs in browser (uses Dexie + browser supabase client).
 */

const TABLES: OutboxTable[] = ["sphere", "project", "task", "inbox_item"];

let _syncing = false;

export function isSyncing(): boolean {
  return _syncing;
}

export async function enqueueMutation(
  op: OutboxOp,
  table: OutboxTable,
  rowId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = localDb();
  // Collapse: if there's a pending entry for same [table+row_id], merge.
  const existing = await db.outbox
    .where("[table+row_id]")
    .equals([table, rowId])
    .toArray();

  if (existing.length > 0) {
    // Last pending wins for update; delete after insert => insert+delete cancel.
    // Simpler: drop existing, push new op.
    await db.outbox.bulkDelete(existing.map((e) => e.id!).filter(Boolean));
  }

  await db.outbox.add({
    op,
    table,
    row_id: rowId,
    payload,
    created_at: Date.now(),
    attempts: 0,
  });
}

async function pushOutbox(): Promise<{ ok: number; fail: number }> {
  const db = localDb();
  const supabase = createClient();
  const entries = await db.outbox.orderBy("created_at").toArray();
  let ok = 0;
  let fail = 0;

  for (const entry of entries) {
    try {
      if (entry.op === "insert" || entry.op === "update") {
        const { error } = await supabase
          .from(entry.table)
          .upsert(entry.payload as never, { onConflict: "id" });
        if (error) throw error;
      } else if (entry.op === "delete") {
        const { error } = await supabase
          .from(entry.table)
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", entry.row_id);
        if (error) throw error;
      }
      await db.outbox.delete(entry.id!);
      ok++;
    } catch (err) {
      fail++;
      const msg = err instanceof Error ? err.message : String(err);
      await db.outbox.update(entry.id!, {
        attempts: entry.attempts + 1,
        last_error: msg,
      });
      // Stop on persistent error after 5 attempts to avoid infinite loop
      if (entry.attempts + 1 >= 5) {
        console.error("Outbox entry failed 5x — leaving for manual review", entry);
      }
      break; // preserve FIFO; retry later
    }
  }

  return { ok, fail };
}

async function pullTable(table: OutboxTable): Promise<number> {
  const db = localDb();
  const supabase = createClient();
  const metaKey = `last_sync_at:${table}`;
  const last = (await getMeta(metaKey)) ?? "1970-01-01T00:00:00Z";

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .gt("updated_at", last)
    .order("updated_at", { ascending: true })
    .limit(1000);

  if (error) throw error;
  if (!data || data.length === 0) return 0;

  // Upsert into Dexie, removing soft-deleted
  const toDelete: string[] = [];
  const toPut: typeof data = [];
  let maxUpdated = last;
  for (const row of data as Array<{
    id: string;
    updated_at: string;
    deleted_at: string | null;
  }>) {
    if (row.updated_at > maxUpdated) maxUpdated = row.updated_at;
    if (row.deleted_at) toDelete.push(row.id);
    else toPut.push(row);
  }

  const tbl = db.table(table);
  if (toPut.length) await tbl.bulkPut(toPut);
  if (toDelete.length) await tbl.bulkDelete(toDelete);

  await setMeta(metaKey, maxUpdated);
  return data.length;
}

export async function runSync(): Promise<{
  pushed: number;
  pulled: number;
  failed: number;
}> {
  if (_syncing) return { pushed: 0, pulled: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { pushed: 0, pulled: 0, failed: 0 };
  }
  _syncing = true;
  try {
    const push = await pushOutbox();
    let pulled = 0;
    for (const t of TABLES) {
      try {
        pulled += await pullTable(t);
      } catch (err) {
        console.error(`pull ${t} failed`, err);
      }
    }
    return { pushed: push.ok, pulled, failed: push.fail };
  } finally {
    _syncing = false;
  }
}

/**
 * Install global listeners: online event + custom outbox-sync event from SW.
 * Call once from a top-level client component.
 */
export function installSyncListeners(): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    void runSync();
  };
  window.addEventListener("online", handler);
  window.addEventListener("ivanplaner:sync-outbox", handler);
  // Fire one on mount
  void runSync();
  return () => {
    window.removeEventListener("online", handler);
    window.removeEventListener("ivanplaner:sync-outbox", handler);
  };
}

// Re-export OutboxEntry for consumers
export type { OutboxEntry };
