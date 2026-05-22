import type { SupabaseClient } from "@supabase/supabase-js";
import { startOfDay } from "date-fns";

export async function processOverdueTasks(supabase: SupabaseClient) {
  const now = new Date().toISOString();
  const startOfToday = startOfDay(new Date()).toISOString();

  const { data: overdue } = await supabase
    .from("task")
    .select("id, overdue_action")
    .lt("due_at", startOfToday)
    .neq("status", "done")
    .not("overdue_action", "is", null);

  if (!overdue?.length) return;

  const toReschedule = overdue
    .filter((t) => t.overdue_action === "reschedule")
    .map((t) => t.id);

  const toComplete = overdue
    .filter((t) => t.overdue_action === "autocomplete")
    .map((t) => t.id);

  const today = startOfDay(new Date()).toISOString();

  if (toReschedule.length) {
    await Promise.all([
      supabase.from("task").update({ due_at: today }).in("id", toReschedule),
      supabase.rpc("increment_carry_count", { task_ids: toReschedule }),
    ]);
  }

  if (toComplete.length) {
    await supabase
      .from("task")
      .update({ status: "done", completed_at: now })
      .in("id", toComplete);
  }
}
