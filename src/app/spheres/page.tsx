import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { SphereRow } from "@/lib/db";
import { createSphere } from "./actions";
import { SphereDeleteButton } from "@/components/SphereDeleteButton";

export default async function SpheresPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: spheres, error } = await supabase
    .from("sphere")
    .select("*")
    .order("order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<SphereRow[]>();
  if (error) throw new Error(error.message);

  const list = spheres ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-neutral-500 hover:underline">← главная</Link>
          <h1 className="text-2xl font-semibold mt-1">Сферы жизни</h1>
        </div>
      </div>

      <div className="grid gap-3">
        {list.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <Link href={`/spheres/${s.id}`} className="flex-1 font-medium hover:underline">
              {s.icon && <span className="mr-2">{s.icon}</span>}
              {s.name}
            </Link>
            <SphereDeleteButton id={s.id} name={s.name} />
          </div>
        ))}

        {list.length === 0 && (
          <p className="text-sm text-neutral-500 py-4 text-center">Нет сфер. Создай первую.</p>
        )}
      </div>

      <form action={createSphere} className="rounded-lg border border-dashed border-neutral-300 p-4 space-y-3 dark:border-neutral-700">
        <h2 className="font-medium text-sm">Новая сфера</h2>
        <div className="flex gap-2">
          <input
            name="name"
            required
            placeholder="Название (напр. Здоровье)"
            className="flex-1 rounded border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700"
          />
          <input
            name="icon"
            placeholder="🏃"
            maxLength={2}
            className="w-14 rounded border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700"
          />
        </div>
        <div className="flex gap-2">
          <input
            name="color"
            type="color"
            defaultValue="#6366f1"
            className="w-10 h-9 rounded border border-neutral-300 p-0.5 cursor-pointer"
          />
          <button
            type="submit"
            className="flex-1 rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
          >
            Добавить
          </button>
        </div>
      </form>
    </main>
  );
}
