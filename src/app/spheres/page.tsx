import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { SphereRow } from "@/lib/db";
import { createSphere } from "./actions";
import { SphereDeleteButton } from "@/components/SphereDeleteButton";
import { PageShell, Section, EmptyState } from "@/components/ui";

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
    <PageShell title="Сферы" emoji="🌐" subtitle={`${list.length} сфер жизни`}>
      <Section>
        {list.length === 0 ? (
          <EmptyState emoji="🌐" title="Нет сфер" hint="Создай первую снизу" />
        ) : (
          <div className="flex flex-col gap-1">
            {list.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 px-2 py-2 rounded-[10px]"
                style={{ background: "var(--brand-50)" }}
              >
                <div
                  className="h-4 w-4 rounded-full flex-shrink-0"
                  style={{ background: s.color }}
                />
                <Link
                  href={`/spheres/${s.id}`}
                  className="flex-1 font-medium text-sm"
                  style={{ color: "var(--brand-900)" }}
                >
                  {s.icon && <span className="mr-2">{s.icon}</span>}
                  {s.name}
                </Link>
                <SphereDeleteButton id={s.id} name={s.name} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section label="➕ Новая сфера">
        <form action={createSphere} className="space-y-2">
          <div className="flex gap-2">
            <input
              name="name"
              required
              placeholder="Название (напр. Здоровье)"
              className="flex-1 rounded-[10px] border border-[var(--brand-200)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)]"
            />
            <input
              name="icon"
              placeholder="🏃"
              maxLength={2}
              className="w-14 rounded-[10px] border border-[var(--brand-200)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)]"
            />
          </div>
          <div className="flex gap-2">
            <input
              name="color"
              type="color"
              defaultValue="#7c3aed"
              className="w-10 h-9 rounded-[10px] border border-[var(--brand-200)] p-0.5 cursor-pointer"
            />
            <button
              type="submit"
              className="flex-1 rounded-[14px] bg-[linear-gradient(135deg,#7c3aed,#8b5cf6)] px-3 py-2 text-sm font-semibold text-white shadow-[0_4px_15px_rgba(124,58,237,0.4)]"
            >
              Добавить
            </button>
          </div>
        </form>
      </Section>
    </PageShell>
  );
}
