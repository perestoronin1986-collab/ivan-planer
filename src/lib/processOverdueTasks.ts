import type { SupabaseClient } from "@supabase/supabase-js";

export async function processOverdueTasks(supabase: SupabaseClient) {
  const now = new Date().toISOString();

  const { data: overdue } = await supabase
    .from("task")
    .select("id, overdue_action")
    .lt("due_at", now)
    .neq("status", "done")
    .not("overdue_action", "is", null);

  if (!overdue?.length) return;

  const toReschedule = overdue
    .filter((t) => t.overdue_action === "reschedule")
    .map((t) => t.id);

  const toComplete = overdue
    .filter((t) => t.overdue_action === "autocomplete")
    .map((t) => t.id);

  const tomorrow = new Date(Date.now() + 86400_000).toISOString();

  if (toReschedule.length) {
    await supabase
      .from("task")
      .update({ due_at: tomorrow })
      .in("id", toReschedule);
  }

  if (toComplete.length) {
    await supabase
      .from("task")
      .update({ status: "done", completed_at: now })
      .in("id", toComplete);
  }
}
