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

const TABLES: OutboxTable[] = [
  "sphere",
  "project",
  "task",
  "inbox_item",
  "habit",
  "habit_log",
];

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

const MAX_ATTEMPTS = 5;

async function pushOutbox(): Promise<{ ok: number; fail: number; dead: number }> {
  const db = localDb();
  const supabase = createClient();
  const entries = await db.outbox.orderBy("created_at").toArray();
  let ok = 0;
  let fail = 0;
  let dead = 0;

  for (const entry of entries) {
    try {
      if (entry.op === "insert" || entry.op === "update") {
        // Use the LWW-guarded RPC: server rejects payload older than the
        // existing row. Falls back to a plain upsert if RPC missing,
        // because Supabase returns a specific error code we can detect.
        const fn = `upsert_${entry.table}_if_newer`;
        const { error } = await supabase.rpc(fn, {
          payload: entry.payload,
        });
        if (error) {
          // 42883 = function does not exist (RPC not deployed yet).
          // Fallback so the client still works against a stale schema.
          const code = (error as { code?: string }).code;
          if (code === "42883" || /does not exist/i.test(error.message)) {
            const { error: upErr } = await supabase
              .from(entry.table)
              .upsert(entry.payload as never, { onConflict: "id" });
            if (upErr) throw upErr;
          } else {
            throw error;
          }
        }
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
      const nextAttempts = entry.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        // Move to dead-letter so it stops blocking the FIFO queue.
        // UI surfaces these for manual review.
        await db.transaction("rw", db.outbox, db.outbox_dead, async () => {
          await db.outbox_dead.add({
            ...entry,
            id: undefined,
            attempts: nextAttempts,
            last_error: msg,
            failed_at: Date.now(),
          });
          await db.outbox.delete(entry.id!);
        });
        dead++;
        console.error(
          `Outbox entry moved to dead-letter after ${nextAttempts} attempts`,
          { table: entry.table, op: entry.op, row_id: entry.row_id, error: msg },
        );
        // Continue draining: poison entry no longer blocks the queue.
        continue;
      }
      await db.outbox.update(entry.id!, {
        attempts: nextAttempts,
        last_error: msg,
      });
      break; // preserve FIFO; retry later
    }
  }

  return { ok, fail, dead };
}

const PULL_PAGE = 1000;
const PULL_SAFETY_PAGES = 50; // up to 50k rows per table per sync

/**
 * Incremental pull with safe pagination.
 *
 * The cursor is `updated_at`, but multiple rows can share the same value
 * (bulk insert -> postgres `now()` is constant within a transaction).
 * Using `gt(cursor)` skips ties on page boundaries -> data loss.
 *
 * Approach: query `gte(cursor)`, track already-applied row ids during this
 * sync run, and advance the cursor by epsilon only when the entire page
 * shares one timestamp (otherwise advance to max(updated_at) - epsilon and
 * let the next iteration re-fetch the tie group, deduped by `seen`).
 */
async function pullTable(table: OutboxTable): Promise<number> {
  const db = localDb();
  const supabase = createClient();
  const metaKey = `last_sync_at:${table}`;
  let cursor = (await getMeta(metaKey)) ?? "1970-01-01T00:00:00Z";

  const seen = new Set<string>();
  let total = 0;

  for (let page = 0; page < PULL_SAFETY_PAGES; page++) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .gte("updated_at", cursor)
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(PULL_PAGE);

    if (error) throw error;
    if (!data || data.length === 0) break;

    const toDelete: string[] = [];
    const toPut: typeof data = [];
    let pageMax = cursor;
    let pageMin = cursor;
    let newRows = 0;
    for (const row of data as Array<{
      id: string;
      updated_at: string;
      deleted_at: string | null;
    }>) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      newRows++;
      if (row.updated_at > pageMax) pageMax = row.updated_at;
      if (pageMin === cursor || row.updated_at < pageMin) pageMin = row.updated_at;
      if (row.deleted_at) toDelete.push(row.id);
      else toPut.push(row);
    }

    const tbl = db.table(table);
    if (toPut.length) await tbl.bulkPut(toPut);
    if (toDelete.length) await tbl.bulkDelete(toDelete);
    total += newRows;

    // Less than a full page or no new rows -> done.
    if (data.length < PULL_PAGE || newRows === 0) {
      cursor = pageMax > cursor ? pageMax : cursor;
      break;
    }

    // Full page. If the entire page shared one timestamp (tie cluster
    // bigger than PULL_PAGE), advance cursor by 1ms to escape the tie —
    // accepting the theoretical loss only for clusters > PULL_PAGE+the next.
    // Otherwise re-fetch from pageMax: ties at the boundary will be
    // deduped by `seen`.
    if (pageMax === pageMin) {
      const next = new Date(new Date(pageMax).getTime() + 1).toISOString();
      cursor = next;
    } else {
      cursor = pageMax;
    }
  }

  await setMeta(metaKey, cursor);
  return total;
}

export async function runSync(): Promise<{
  pushed: number;
  pulled: number;
  failed: number;
  dead: number;
}> {
  if (_syncing) return { pushed: 0, pulled: 0, failed: 0, dead: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { pushed: 0, pulled: 0, failed: 0, dead: 0 };
  }
  _syncing = true;
  try {
    const push = await pushOutbox();
    const results = await Promise.all(
      TABLES.map((t) =>
        pullTable(t).catch((err) => {
          console.error(`pull ${t} failed`, err);
          return 0;
        }),
      ),
    );
    const pulled = results.reduce((sum, n) => sum + n, 0);
    return { pushed: push.ok, pulled, failed: push.fail, dead: push.dead };
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
