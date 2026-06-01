export type TaskStatus = "todo" | "doing" | "done";
export type ProjectStatus = "active" | "paused" | "done" | "archived";

export type SyncMeta = {
  updated_at: string;
  deleted_at: string | null;
};

export type SphereRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  order: number;
  archived: boolean;
  created_at: string;
} & SyncMeta;

export type ProjectRow = {
  id: string;
  user_id: string;
  sphere_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  icon: string | null;
  order: number;
  created_at: string;
} & SyncMeta;

export type OverdueAction = "reschedule" | "autocomplete";

export type TaskRow = {
  id: string;
  user_id: string;
  sphere_id: string | null;
  project_id: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_at: string | null;
  remind_at: string | null;
  rrule: string | null;
  rrule_until: string | null;
  order: number;
  priority: number;
  carry_count: number;
  completed_at: string | null;
  created_at: string;
  overdue_action: OverdueAction | null;
} & SyncMeta;

export type InboxItemRow = {
  id: string;
  user_id: string;
  content: string;
  processed_at: string | null;
  converted_task_id: string | null;
  converted_sphere_id: string | null;
  converted_project_id: string | null;
  created_at: string;
} & SyncMeta;

export type HabitKind = "build" | "quit";
export type HabitFrequency = "daily" | "weekly";
export type HabitType = "binary" | "numeric";

export type HabitRow = {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string;
  kind: HabitKind;
  frequency: HabitFrequency;
  type: HabitType;
  unit: string | null;
  target_per_week: number;
  order: number;
  archived: boolean;
  created_at: string;
} & SyncMeta;

export type HabitLogRow = {
  id: string;
  user_id: string;
  habit_id: string;
  date: string; // yyyy-mm-dd, local calendar day
  value: number | null; // numeric habits: recorded value; null for binary
  created_at: string;
} & SyncMeta;
