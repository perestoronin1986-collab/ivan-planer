import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { OnlineIndicator } from "@/components/OnlineIndicator";

export default async function Home() {
  const user = await requireUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">IvanPlaner</h1>
          <OnlineIndicator />
        </div>
        <form action={signOut} className="flex items-center gap-3">
          <span className="text-sm text-neutral-500">{user.email}</span>
          <button className="text-sm underline">выйти</button>
        </form>
      </header>

      <nav className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/today", label: "Сегодня" },
          { href: "/week", label: "Неделя" },
          { href: "/month", label: "Месяц" },
          { href: "/inbox", label: "Inbox" },
          { href: "/spheres", label: "Сферы" },
          { href: "/projects", label: "Проекты" },
          { href: "/tasks", label: "Все активные задачи" },
          { href: "/recurring", label: "Регулярные задачи" },
          { href: "/done", label: "Выполненные задачи" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-neutral-200 p-4 text-center font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section className="rounded-lg border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700">
        Старт пуст. Зайди в «Сферы» → создай первую сферу → проект → задачу.
      </section>
    </main>
  );
}
