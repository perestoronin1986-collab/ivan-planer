"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import { z } from "zod";
import { RRule } from "rrule";

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
  revalidatePath("/today");
  revalidatePath("/projects");
  if (data.sphereId) {
    const back = data.projectId
      ? `/spheres/${data.sphereId}/projects/${data.projectId}`
      : `/spheres/${data.sphereId}`;
    revalidatePath(back);
  }
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

export async function createRecurringTask(formData: FormData) {
  const user = await requireUser();

  const title = (formData.get("title") as string)?.trim();
  const sphereId = formData.get("sphereId") as string;
  const projectId = (formData.get("projectId") as string) || null;
  const pattern = formData.get("pattern") as "weekly" | "monthly" | "interval";
  const startDate = formData.get("startDate") as string;
  const endType = formData.get("endType") as "date" | "count";
  const endDateRaw = (formData.get("endDate") as string) || null;
  const endCountRaw = (formData.get("endCount") as string) || null;
  const overdueActionRaw = formData.get("overdueAction") as string | null;
  const overdueAction = overdueActionRaw === "reschedule" ? ("reschedule" as const) : null;

  if (!title || !sphereId || !startDate) throw new Error("Missing required fields");

  const sphereIdParsed = z.string().uuid().safeParse(sphereId);
  if (!sphereIdParsed.success) throw new Error("Invalid sphereId");

  if (!["weekly", "monthly", "interval"].includes(pattern))
    throw new Error("Invalid pattern");

  const dtstart = new Date(startDate + "T00:00:00Z");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: Record<string, any> = { dtstart };

  if (pattern === "weekly") {
    const weekdaysRaw = (formData.get("weekdays") as string) || "";
    const weekInterval = Math.max(1, parseInt(formData.get("weekInterval") as string) || 1);
    const dayMap: Record<string, typeof RRule.MO> = {
      MO: RRule.MO, TU: RRule.TU, WE: RRule.WE, TH: RRule.TH,
      FR: RRule.FR, SA: RRule.SA, SU: RRule.SU,
    };
    const byweekday = weekdaysRaw.split(",").filter(Boolean).map((d) => dayMap[d]).filter(Boolean);
    if (!byweekday.length) throw new Error("Select at least one weekday");
    opts.freq = RRule.WEEKLY;
    opts.interval = weekInterval;
    opts.byweekday = byweekday;
  } else if (pattern === "monthly") {
    const monthDaysRaw = (formData.get("monthDays") as string) || "";
    const monthInterval = Math.max(1, parseInt(formData.get("monthInterval") as string) || 1);
    const bymonthday = monthDaysRaw
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((n) => n >= 1 && n <= 31);
    if (!bymonthday.length) throw new Error("Select at least one day of month");
    opts.freq = RRule.MONTHLY;
    opts.interval = monthInterval;
    opts.bymonthday = bymonthday;
  } else {
    const dayInterval = Math.max(1, parseInt(formData.get("dayInterval") as string) || 1);
    opts.freq = RRule.DAILY;
    opts.interval = dayInterval;
  }

  if (endType === "date" && endDateRaw) {
    const until = new Date(endDateRaw + "T23:59:59Z");
    if (isNaN(until.getTime()) || until <= dtstart) throw new Error("Invalid end date");
    opts.until = until;
  } else if (endType === "count" && endCountRaw) {
    const count = parseInt(endCountRaw);
    if (count < 1 || count > 500) throw new Error("Count must be 1–500");
    opts.count = count;
  } else {
    throw new Error("End condition required");
  }

  const rule = new RRule(opts);
  const dates = rule.all();
  if (dates.length > 500) throw new Error(`Too many occurrences (${dates.length}); reduce the date range or use count instead`);
  if (!dates.length) throw new Error("No occurrences generated");

  const rruleStr = rule.toString();
  const rruleUntil = opts.until ? (opts.until as Date).toISOString() : null;

  const supabase = await createClient();

  const { data: template, error: tErr } = await supabase
    .from("task")
    .insert({
      title,
      sphere_id: sphereIdParsed.data,
      project_id: projectId,
      rrule: rruleStr,
      rrule_until: rruleUntil,
      status: "done",
      user_id: user.id,
      overdue_action: overdueAction,
    })
    .select("id")
    .single();
  if (tErr) throw new Error(tErr.message);

  const occurrences = dates.map((d) => ({
    title,
    sphere_id: sphereIdParsed.data,
    project_id: projectId,
    parent_id: template.id,
    due_at: new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    ).toISOString(),
    overdue_action: overdueAction,
    status: "todo" as const,
    user_id: user.id,
  }));

  const { error: oErr } = await supabase.from("task").insert(occurrences);
  if (oErr) {
    const { error: rErr } = await supabase.from("task").delete().eq("id", template.id).eq("user_id", user.id);
    if (rErr) console.error("Rollback failed, orphaned template:", template.id, rErr.message);
    throw new Error(oErr.message);
  }

  revalidatePath("/today");
}
