import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { RecurringList } from "./RecurringList";
import { RecurringHeader } from "./RecurringHeader";

export default async function RecurringPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← главная
        </Link>
        <div className="mt-1">
          <RecurringHeader />
          <p className="text-sm text-neutral-500">
            Для каждой регулярки — только ближайшая. Отметишь — появится следующая.
          </p>
        </div>
      </div>

      <RecurringList />
    </main>
  );
}
