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

  // "reschedule" = stay overdue every day until done; no due_at change needed.
  // "autocomplete" = mark done automatically.
  const toComplete = overdue
    .filter((t) => t.overdue_action === "autocomplete")
    .map((t) => t.id);

  if (toComplete.length) {
    await supabase
      .from("task")
      .update({ status: "done", completed_at: now })
      .in("id", toComplete);
  }
}
