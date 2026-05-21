"use client";

import { localDb } from "./db";
import { enqueueMutation, runSync } from "./sync";
import type {
  InboxItemRow,
  ProjectRow,
  SphereRow,
  TaskRow,
} from "@/lib/db";

/**
 * Local-first mutations: write to Dexie, enqueue to outbox, kick off sync.
 *
 * Each call returns immediately after the Dexie write so UI updates are
 * instant. The outbox push runs in the background.
 *
 * `userId` must be supplied by the caller (read via supabase.auth.getUser()
 * once and cache in a context).
 */

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ---------------- Inbox ----------------

export async function addInboxItemLocal(
  userId: string,
  content: string,
): Promise<InboxItemRow> {
  const row: InboxItemRow = {
    id: uuid(),
    user_id: userId,
    content,
    processed_at: null,
    converted_task_id: null,
    converted_sphere_id: null,
    converted_project_id: null,
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
  };
  await localDb().inbox_item.put(row);
  await enqueueMutation("insert", "inbox_item", row.id, row);
  void runSync();
  return row;
}

export async function deleteInboxItemLocal(id: string): Promise<void> {
  const db = localDb();
  const existing = await db.inbox_item.get(id);
  if (existing) {
    await db.inbox_item.update(id, { deleted_at: now(), updated_at: now() });
  }
  // Remove from local view immediately
  await db.inbox_item.delete(id);
  await enqueueMutation("delete", "inbox_item", id, { id });
  void runSync();
}

export async function processInboxToTaskLocal(args: {
  userId: string;
  inboxId: string;
  content: string;
  sphereId: string | null;
  projectId: string | null;
}): Promise<TaskRow> {
  const { userId, inboxId, content, sphereId, projectId } = args;
  if (!sphereId && !projectId) {
    throw new Error("Нужна сфера или проект");
  }
  const db = localDb();
  const task: TaskRow = {
    id: uuid(),
    user_id: userId,
    sphere_id: sphereId,
    project_id: projectId,
    parent_id: null,
    title: content,
    description: null,
    status: "todo",
    due_at: null,
    remind_at: null,
    rrule: null,
    rrule_until: null,
    order: 0,
    carry_count: 0,
    completed_at: null,
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
    overdue_action: null,
  };

  const inboxPatch = {
    processed_at: now(),
    converted_task_id: task.id,
    converted_sphere_id: sphereId,
    converted_project_id: projectId,
    updated_at: now(),
  };

  await db.transaction("rw", db.task, db.inbox_item, db.outbox, async () => {
    await db.task.put(task);
    await db.inbox_item.update(inboxId, inboxPatch);
  });

  await enqueueMutation("insert", "task", task.id, task);
  await enqueueMutation("update", "inbox_item", inboxId, {
    id: inboxId,
    ...inboxPatch,
  });
  void runSync();
  return task;
}

// ---------------- Task ----------------

export async function addTaskLocal(args: {
  userId: string;
  title: string;
  sphereId?: string | null;
  projectId?: string | null;
  parentId?: string | null;
  dueAt?: string | null;
}): Promise<TaskRow> {
  const row: TaskRow = {
    id: uuid(),
    user_id: args.userId,
    sphere_id: args.sphereId ?? null,
    project_id: args.projectId ?? null,
    parent_id: args.parentId ?? null,
    title: args.title,
    description: null,
    status: "todo",
    due_at: args.dueAt ?? null,
    remind_at: null,
    rrule: null,
    rrule_until: null,
    order: 0,
    carry_count: 0,
    completed_at: null,
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
    overdue_action: null,
  };
  await localDb().task.put(row);
  await enqueueMutation("insert", "task", row.id, row);
  void runSync();
  return row;
}

export async function updateTaskLocal(
  id: string,
  patch: Partial<TaskRow>,
): Promise<void> {
  const db = localDb();
  const existing = await db.task.get(id);
  if (!existing) throw new Error(`Task ${id} not found`);
  const next = { ...existing, ...patch, updated_at: now() };
  await db.task.put(next);
  await enqueueMutation("update", "task", id, next);
  void runSync();
}

export async function toggleTaskStatusLocal(id: string): Promise<void> {
  const db = localDb();
  const existing = await db.task.get(id);
  if (!existing) return;
  const nextStatus = existing.status === "done" ? "todo" : "done";
  await updateTaskLocal(id, {
    status: nextStatus,
    completed_at: nextStatus === "done" ? now() : null,
  });
}

export async function deleteTaskLocal(id: string): Promise<void> {
  await localDb().task.delete(id);
  await enqueueMutation("delete", "task", id, { id });
  void runSync();
}

// ---------------- Sphere / Project (basic) ----------------

export async function addSphereLocal(
  userId: string,
  name: string,
  color = "#6366f1",
): Promise<SphereRow> {
  const row: SphereRow = {
    id: uuid(),
    user_id: userId,
    name,
    color,
    icon: null,
    order: 0,
    archived: false,
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
  };
  await localDb().sphere.put(row);
  await enqueueMutation("insert", "sphere", row.id, row);
  void runSync();
  return row;
}

export async function addProjectLocal(args: {
  userId: string;
  sphereId: string;
  name: string;
}): Promise<ProjectRow> {
  const row: ProjectRow = {
    id: uuid(),
    user_id: args.userId,
    sphere_id: args.sphereId,
    name: args.name,
    description: null,
    status: "active",
    icon: null,
    order: 0,
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
  };
  await localDb().project.put(row);
  await enqueueMutation("insert", "project", row.id, row);
  void runSync();
  return row;
}
