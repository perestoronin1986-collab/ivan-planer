import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  real,
  boolean,
  pgEnum,
  index,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const taskStatusEnum = pgEnum("task_status", ["todo", "doing", "done"]);
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "paused",
  "done",
  "archived",
]);
export const habitKindEnum = pgEnum("habit_kind", ["build", "quit"]);
export const habitFrequencyEnum = pgEnum("habit_frequency", [
  "daily",
  "weekly",
]);
export const habitTypeEnum = pgEnum("habit_type", ["binary", "numeric"]);

export const sphere = pgTable(
  "sphere",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    color: text("color").default("#6366f1").notNull(),
    icon: text("icon"),
    order: integer("order").default(0).notNull(),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("sphere_user_idx").on(t.userId),
    index("sphere_updated_idx").on(t.userId, t.updatedAt),
  ],
);

export const project = pgTable(
  "project",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    sphereId: uuid("sphere_id")
      .notNull()
      .references(() => sphere.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: projectStatusEnum("status").default("active").notNull(),
    order: integer("order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("project_user_idx").on(t.userId),
    index("project_sphere_idx").on(t.sphereId),
    index("project_updated_idx").on(t.userId, t.updatedAt),
  ],
);

export const task = pgTable(
  "task",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    sphereId: uuid("sphere_id").references(() => sphere.id, {
      onDelete: "cascade",
    }),
    projectId: uuid("project_id").references(() => project.id, {
      onDelete: "cascade",
    }),
    parentId: uuid("parent_id").references((): AnyPgColumn => task.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("todo").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    remindAt: timestamp("remind_at", { withTimezone: true }),
    rrule: text("rrule"),
    rruleUntil: timestamp("rrule_until", { withTimezone: true }),
    order: integer("order").default(0).notNull(),
    priority: integer("priority").default(4).notNull(),
    carryCount: integer("carry_count").default(0).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // Set = task is parked in the "Заморожено" tab on /today: out of the
    // overdue/active lists, kept for later. See 0007_frozen_tasks.sql.
    frozenAt: timestamp("frozen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("task_user_idx").on(t.userId),
    index("task_project_idx").on(t.projectId),
    index("task_sphere_idx").on(t.sphereId),
    index("task_parent_idx").on(t.parentId),
    index("task_due_idx").on(t.dueAt),
    index("task_priority_idx").on(t.userId, t.priority, t.dueAt),
    index("task_updated_idx").on(t.userId, t.updatedAt),
    check(
      "task_context_chk",
      sql`(${t.sphereId} IS NOT NULL) OR (${t.projectId} IS NOT NULL) OR (${t.parentId} IS NOT NULL)`,
    ),
  ],
);

export const inboxItem = pgTable(
  "inbox_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    content: text("content").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    convertedTaskId: uuid("converted_task_id").references(() => task.id, {
      onDelete: "set null",
    }),
    convertedSphereId: uuid("converted_sphere_id").references(() => sphere.id, {
      onDelete: "set null",
    }),
    convertedProjectId: uuid("converted_project_id").references(
      () => project.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("inbox_user_idx").on(t.userId),
    index("inbox_updated_idx").on(t.userId, t.updatedAt),
  ],
);

export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("push_user_idx").on(t.userId)],
);

export const notification = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    fireAt: timestamp("fire_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("notif_user_idx").on(t.userId),
    index("notif_fire_idx").on(t.fireAt, t.sentAt),
  ],
);

export const habit = pgTable(
  "habit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    icon: text("icon"),
    color: text("color").default("#6366f1").notNull(),
    kind: habitKindEnum("kind").default("build").notNull(),
    frequency: habitFrequencyEnum("frequency").default("daily").notNull(),
    type: habitTypeEnum("type").default("binary").notNull(),
    unit: text("unit"),
    targetPerWeek: integer("target_per_week").default(7).notNull(),
    order: integer("order").default(0).notNull(),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("habit_user_idx").on(t.userId),
    index("habit_updated_idx").on(t.userId, t.updatedAt),
    check(
      "habit_target_chk",
      sql`${t.targetPerWeek} BETWEEN 1 AND 7`,
    ),
  ],
);

export const habitLog = pgTable(
  "habit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habit.id, { onDelete: "cascade" }),
    // Local calendar day the habit was marked done, `yyyy-mm-dd`.
    date: text("date").notNull(),
    // Numeric value recorded for that day (numeric habits). Null for binary.
    value: real("value"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("habit_log_user_idx").on(t.userId),
    index("habit_log_habit_idx").on(t.habitId),
    index("habit_log_date_idx").on(t.userId, t.date),
    index("habit_log_updated_idx").on(t.userId, t.updatedAt),
  ],
);

export type Sphere = typeof sphere.$inferSelect;
export type NewSphere = typeof sphere.$inferInsert;
export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
export type Task = typeof task.$inferSelect;
export type NewTask = typeof task.$inferInsert;
export type InboxItem = typeof inboxItem.$inferSelect;
export type NewInboxItem = typeof inboxItem.$inferInsert;
export type Habit = typeof habit.$inferSelect;
export type NewHabit = typeof habit.$inferInsert;
export type HabitLog = typeof habitLog.$inferSelect;
export type NewHabitLog = typeof habitLog.$inferInsert;
