import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function toIso(input: string): string {
  const value = input.includes(":") ? input.replace(" ", "T") : `${input}T12:00`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Не разобрал дату: ${input}`);
  return date.toISOString();
}

async function nextOrder(table: "project" | "task", column: string, id: string) {
  const { data } = await db
    .from(table)
    .select("order")
    .eq(column, id)
    .is("deleted_at", null)
    .order("order", { ascending: false })
    .limit(1);
  return (data?.[0]?.order ?? -1) + 1;
}

async function findSphere(name: string) {
  const { data, error } = await db
    .from("sphere")
    .select("id, name, user_id")
    .ilike("name", name)
    .is("deleted_at", null)
    .limit(1);
  if (error) throw error;
  if (!data?.length) throw new Error(`Сфера не найдена: ${name}`);
  return data[0];
}

async function findProject(name: string) {
  const { data, error } = await db
    .from("project")
    .select("id, name, user_id, sphere_id")
    .ilike("name", name)
    .is("deleted_at", null)
    .limit(1);
  if (error) throw error;
  if (!data?.length) throw new Error(`Проект не найден: ${name}`);
  return data[0];
}

async function addProject(name: string) {
  const sphereName = flag("sphere") ?? "Работа с ИИ";
  const sphere = await findSphere(sphereName);

  const { data, error } = await db
    .from("project")
    .insert({
      user_id: sphere.user_id,
      sphere_id: sphere.id,
      name,
      description: flag("desc") ?? null,
      status: "active",
      order: await nextOrder("project", "sphere_id", sphere.id),
    })
    .select("id, name")
    .single();
  if (error) throw error;

  console.log(`✓ проект «${data.name}» → сфера «${sphere.name}» (${data.id})`);
}

async function addTask(title: string) {
  const projectName = flag("project");
  if (!projectName) throw new Error("Нужен --project <имя>");
  const project = await findProject(projectName);

  const due = flag("due");
  const priority = flag("priority");

  const { data, error } = await db
    .from("task")
    .insert({
      user_id: project.user_id,
      project_id: project.id,
      sphere_id: project.sphere_id,
      title,
      description: flag("desc") ?? null,
      status: "todo",
      due_at: due ? toIso(due) : null,
      priority: priority ? Number(priority) : 4,
      order: await nextOrder("task", "project_id", project.id),
    })
    .select("id, title, due_at")
    .single();
  if (error) throw error;

  const when = data.due_at ? ` · срок ${data.due_at}` : "";
  console.log(`✓ задача «${data.title}» → проект «${project.name}»${when} (${data.id})`);
}

async function markDone(titlePart: string) {
  const projectName = flag("project");
  let query = db
    .from("task")
    .select("id, title, status")
    .ilike("title", `%${titlePart}%`)
    .is("deleted_at", null);
  if (projectName) {
    const project = await findProject(projectName);
    query = query.eq("project_id", project.id);
  }
  const { data, error } = await query;
  if (error) throw error;

  const open = (data ?? []).filter((t) => t.status !== "done");
  if (!open.length) throw new Error(`Незакрытая задача не найдена: ${titlePart}`);
  if (open.length > 1) {
    const found = open.map((t) => `  · ${t.title}`).join("\n");
    throw new Error(
      `Под «${titlePart}» подходит ${open.length} задач — уточни запрос или --project:\n${found}`,
    );
  }

  // updated_at обязателен: на нём держится LWW-синк, иначе клиенты не увидят правку.
  const stamp = new Date().toISOString();
  const { error: updateError } = await db
    .from("task")
    .update({ status: "done", completed_at: stamp, updated_at: stamp })
    .eq("id", open[0].id);
  if (updateError) throw updateError;

  console.log(`✓ закрыта «${open[0].title}»`);
}

async function list() {
  const target = flag("project");
  if (!target) {
    const { data, error } = await db
      .from("project")
      .select("name, status, sphere:sphere_id(name)")
      .is("deleted_at", null)
      .order("name");
    if (error) throw error;
    for (const p of data ?? []) {
      const sphere = (p.sphere as unknown as { name: string } | null)?.name ?? "—";
      console.log(`${sphere} / ${p.name} [${p.status}]`);
    }
    return;
  }

  const project = await findProject(target);
  const { data, error } = await db
    .from("task")
    .select("title, status, due_at, priority")
    .eq("project_id", project.id)
    .is("deleted_at", null)
    .order("order");
  if (error) throw error;
  console.log(`${project.name}:`);
  for (const t of data ?? []) {
    const due = t.due_at ? ` · ${new Date(t.due_at).toLocaleDateString("ru-RU")}` : "";
    console.log(`  [${t.status}] p${t.priority} ${t.title}${due}`);
  }
}

const usage = `
Использование:
  npm run planer -- project "Имя" [--sphere "Работа с ИИ"] [--desc "..."]
  npm run planer -- task "Заголовок" --project "CRM АфроЛатин" [--due 2026-07-20] [--due "2026-07-20 18:00"] [--priority 2] [--desc "..."]
  npm run planer -- done "часть заголовка" [--project "CRM АфроЛатин"]
  npm run planer -- list [--project "CRM АфроЛатин"]

priority: 1=срочно … 4=нет (по умолчанию 4)
done: ищет незакрытую задачу по части заголовка; если подходит несколько — покажет их и ничего не тронет
`.trim();

async function main() {
  const [command, arg] = process.argv.slice(2);

  if (command === "project" && arg) return addProject(arg);
  if (command === "task" && arg) return addTask(arg);
  if (command === "done" && arg) return markDone(arg);
  if (command === "list") return list();

  console.log(usage);
  process.exit(1);
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
