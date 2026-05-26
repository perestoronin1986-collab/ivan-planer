"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "./db";
import type { TaskRow } from "@/lib/db";

/**
 * Один запрос на все subtasks для массива parent_ids. Возвращает
 * Map<parentId, TaskRow[]> отсортированный по created_at.
 *
 * Заменяет per-task useLiveQuery в TaskItem — экономит N подписок
 * IndexedDB на длинных списках.
 */
export function useSubtasksMap(parentIds: string[]): Map<string, TaskRow[]> {
  const depKey = parentIds.join(",");
  const map = useLiveQuery(
    async () => {
      if (!parentIds.length) return new Map<string, TaskRow[]>();
      const rows = await localDb()
        .task.where("parent_id")
        .anyOf(parentIds)
        .toArray();
      const out = new Map<string, TaskRow[]>();
      for (const r of rows) {
        if (r.deleted_at) continue;
        if (!r.parent_id) continue;
        let arr = out.get(r.parent_id);
        if (!arr) {
          arr = [];
          out.set(r.parent_id, arr);
        }
        arr.push(r);
      }
      for (const arr of out.values()) {
        arr.sort((a, b) =>
          (a.created_at ?? "").localeCompare(b.created_at ?? ""),
        );
      }
      return out;
    },
    [depKey],
  );
  return map ?? new Map<string, TaskRow[]>();
}
