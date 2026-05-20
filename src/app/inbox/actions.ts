"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";
import { z } from "zod";

export async function addInboxItem(formData: FormData) {
  const user = await requireUser();
  const content = z.string().min(1).max(2000).parse(formData.get("content"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_item")
    .insert({ content, user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/inbox");
}

export async function processInboxItem(formData: FormData) {
  const user = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const action = formData.get("action") as string;
  const supabase = await createClient();

  if (action === "task") {
    const sphereId = (formData.get("sphereId") as string | null) || null;
    const projectId = (formData.get("projectId") as string | null) || null;
    const content = formData.get("content") as string;

    if (!sphereId && !projectId) return;

    const { data: t, error: taskErr } = await supabase
      .from("task")
      .insert({
        title: content,
        user_id: user.id,
        sphere_id: sphereId,
        project_id: projectId,
      })
      .select("id")
      .single();
    if (taskErr) throw new Error(taskErr.message);

    const { error: updErr } = await supabase
      .from("inbox_item")
      .update({
        processed_at: new Date().toISOString(),
        converted_task_id: t.id,
        converted_sphere_id: sphereId,
        converted_project_id: projectId,
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (updErr) throw new Error(updErr.message);
  } else if (action === "delete") {
    const { error } = await supabase
      .from("inbox_item")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/inbox");
}
