"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import { z } from "zod";

const SphereSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#6366f1"),
  icon: z.string().max(10).optional(),
});

const ProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  sphereId: z.string().uuid(),
  icon: z.string().max(10).optional(),
});

const TaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  sphereId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  dueAt: z.string().min(1).optional(),
  remindAt: z.string().min(1).optional(),
  overdueAction: z.enum(["reschedule", "autocomplete"]).optional(),
});

function toIso(s: string | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function createSphere(formData: FormData) {
  const user = await requireUser();
  const data = SphereSchema.parse({
    name: formData.get("name"),
    color: formData.get("color") || "#6366f1",
    icon: formData.get("icon") || undefined,
  });
  const supabase = await createClient();
  const { error } = await supabase.from("sphere").insert({
    name: data.name,
    color: data.color,
    icon: data.icon ?? null,
    user_id: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/spheres");
}

export async function deleteSphere(id: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("sphere")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/spheres");
}

export async function createProject(formData: FormData) {
  const user = await requireUser();
  const data = ProjectSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    sphereId: formData.get("sphereId"),
    icon: formData.get("icon") || undefined,
  });
  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("project")
    .insert({
      name: data.name,
      description: data.description ?? null,
      sphere_id: data.sphereId,
      icon: data.icon ?? null,
      user_id: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/spheres");
  redirect(`/spheres/${data.sphereId}/projects/${inserted.id}`);
}

export async function updateProjectSphere(id: string, newSphereId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("project")
    .update({ sphere_id: newSphereId })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
  revalidatePath("/spheres");
}

export async function toggleProjectDone(id: string, sphereId: string, done: boolean) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("project")
    .update({ status: done ? "done" : "active" })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/spheres/${sphereId}`);
  revalidatePath("/projects");
}

export async function deleteProject(id: string, sphereId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("project")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/spheres/${sphereId}`);
  redirect(`/spheres/${sphereId}`);
}

export async function createTask(formData: FormData) {
  const user = await requireUser();
  const raw = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    sphereId: formData.get("sphereId") || undefined,
    projectId: formData.get("projectId") || undefined,
    parentId: formData.get("parentId") || undefined,
    dueAt: formData.get("dueAt") || undefined,
    remindAt: formData.get("remindAt") || undefined,
    overdueAction: formData.get("overdueAction") || undefined,
  };
  const data = TaskSchema.parse(raw);
  const supabase = await createClient();
  const { error } = await supabase.from("task").insert({
    title: data.title,
    description: data.description ?? null,
    sphere_id: data.sphereId ?? null,
    project_id: data.projectId ?? null,
    parent_id: data.parentId ?? null,
    due_at: toIso(data.dueAt),
    remind_at: toIso(data.remindAt),
    overdue_action: data.overdueAction ?? null,
    user_id: user.id,
  });
  if (error) throw new Error(error.message);
  const back = data.projectId
    ? `/spheres/${data.sphereId}/projects/${data.projectId}`
    : `/spheres/${data.sphereId}`;
  revalidatePath(back);
  revalidatePath("/projects");
}

export async function toggleTask(id: string, done: boolean) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("task")
    .update({
      status: done ? "done" : "todo",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/tasks");
  revalidatePath("/week");
  revalidatePath("/projects");
}

export async function deleteTask(id: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("task")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/tasks");
  revalidatePath("/projects");
}
