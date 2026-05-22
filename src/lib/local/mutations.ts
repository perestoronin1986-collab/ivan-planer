"use client";

import { RRule } from "rrule";
import { localDb } from "./db";
import { enqueueMutation, runSync } from "./sync";
import type {
  InboxItemRow,
  OverdueAction,
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
  overdueAction?: OverdueAction | null;
}): Promise<TaskRow> {
  // Mirror server-side CHECK constraint `task_context_chk`.
  // Без этой проверки задача без контекста запишется в Dexie + outbox,
  // а потом push провалится с CHECK violation и заблокирует всю очередь.
  if (!args.sphereId && !args.projectId && !args.parentId) {
    throw new Error(
      "Задача должна быть привязана к сфере, проекту или родителю",
    );
  }
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
    overdue_action: args.overdueAction ?? null,
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

// ---------------- Recurring tasks ----------------

export type RecurringPattern = "weekly" | "monthly" | "interval" | "yearly";

export type CreateRecurringArgs = {
  userId: string;
  title: string;
  sphereId: string;
  projectId?: string | null;
  pattern: RecurringPattern;
  startDate: string; // yyyy-mm-dd
  endType: "date" | "count";
  endDate?: string | null;
  endCount?: number | null;
  weekdays?: string[]; // ["MO","TU",...] when pattern=weekly
  weekInterval?: number;
  monthDays?: number[];
  monthInterval?: number;
  dayInterval?: number;
  yearInterval?: number;
  overdueAction?: OverdueAction | null;
};

const WEEKDAY_MAP = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
} as const;

/**
 * Build the RRule options from the form-level shape.
 * Thrown errors here are caller-visible (modal shows them).
 */
function buildRRuleOptions(
  args: CreateRecurringArgs,
): { rule: RRule; until: Date | null } {
  const dtstart = new Date(args.startDate + "T00:00:00Z");
  if (isNaN(dtstart.getTime())) throw new Error("Неверная дата начала");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: Record<string, any> = { dtstart };

  if (args.pattern === "weekly") {
    const days = (args.weekdays ?? [])
      .map((k) => WEEKDAY_MAP[k as keyof typeof WEEKDAY_MAP])
      .filter(Boolean);
    if (!days.length) throw new Error("Выбери хотя бы один день недели");
    opts.freq = RRule.WEEKLY;
    opts.interval = Math.max(1, args.weekInterval ?? 1);
    opts.byweekday = days;
  } else if (args.pattern === "monthly") {
    const days = (args.monthDays ?? []).filter((n) => n >= 1 && n <= 31);
    if (!days.length) throw new Error("Выбери хотя бы одно число месяца");
    opts.freq = RRule.MONTHLY;
    opts.interval = Math.max(1, args.monthInterval ?? 1);
    opts.bymonthday = days;
  } else if (args.pattern === "interval") {
    opts.freq = RRule.DAILY;
    opts.interval = Math.max(1, args.dayInterval ?? 1);
  } else {
    opts.freq = RRule.YEARLY;
    opts.interval = Math.max(1, args.yearInterval ?? 1);
  }

  let until: Date | null = null;
  if (args.endType === "date" && args.endDate) {
    until = new Date(args.endDate + "T23:59:59Z");
    if (isNaN(until.getTime()) || until <= dtstart) {
      throw new Error("Неверная дата окончания");
    }
    opts.until = until;
  } else if (args.endType === "count" && args.endCount) {
    const c = args.endCount;
    if (c < 1 || c > 500) throw new Error("Количество должно быть 1–500");
    opts.count = c;
  } else {
    throw new Error("Укажи условие окончания");
  }

  return { rule: new RRule(opts), until };
}

/**
 * Offline-first recurring task creation. Writes template + all occurrences
 * to Dexie in a single transaction, enqueues N+1 inserts in the outbox.
 *
 * The template carries `rrule` + `status='done'` so it stays hidden from
 * active lists. /done filters templates out via `rrule != null`.
 *
 * Returns { templateId, count } so the modal can display feedback.
 */
export async function createRecurringTaskLocal(
  args: CreateRecurringArgs,
): Promise<{ templateId: string; count: number }> {
  const { rule, until } = buildRRuleOptions(args);
  const dates = rule.all();
  if (!dates.length) throw new Error("Нет ни одного вхождения");
  if (dates.length > 500) {
    throw new Error(`Слишком много вхождений (${dates.length}); сократи диапазон`);
  }

  const title = args.title.trim();
  if (!title) throw new Error("Название не должно быть пустым");

  const templateId = uuid();
  const nowIso = now();
  const rruleStr = rule.toString();
  const rruleUntil = until ? until.toISOString() : null;
  const overdueAction = args.overdueAction ?? null;
  const projectId = args.projectId ?? null;

  const template: TaskRow = {
    id: templateId,
    user_id: args.userId,
    sphere_id: args.sphereId,
    project_id: projectId,
    parent_id: null,
    title,
    description: null,
    status: "done", // hidden from active lists
    due_at: null,
    remind_at: null,
    rrule: rruleStr,
    rrule_until: rruleUntil,
    order: 0,
    carry_count: 0,
    completed_at: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
    overdue_action: overdueAction,
  };

  const occurrences: TaskRow[] = dates.map((d) => ({
    id: uuid(),
    user_id: args.userId,
    sphere_id: args.sphereId,
    project_id: projectId,
    parent_id: templateId,
    title,
    description: null,
    status: "todo",
    due_at: new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    ).toISOString(),
    remind_at: null,
    rrule: null,
    rrule_until: null,
    order: 0,
    carry_count: 0,
    completed_at: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
    overdue_action: overdueAction,
  }));

  const db = localDb();
  // Single transaction: all rows visible at once or none.
  await db.transaction("rw", db.task, db.outbox, async () => {
    await db.task.bulkPut([template, ...occurrences]);
    // enqueueMutation has a collapse step that runs its own writes;
    // inlining the inserts here avoids the extra round-trip per row.
    await db.outbox.bulkAdd([
      {
        op: "insert",
        table: "task",
        row_id: template.id,
        payload: template as unknown as Record<string, unknown>,
        created_at: Date.now(),
        attempts: 0,
      },
      ...occurrences.map((o) => ({
        op: "insert" as const,
        table: "task" as const,
        row_id: o.id,
        payload: o as unknown as Record<string, unknown>,
        created_at: Date.now(),
        attempts: 0,
      })),
    ]);
  });

  void runSync();
  return { templateId, count: occurrences.length };
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
