import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { SearchClient } from "./SearchClient";

export default async function SearchPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← главная
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Поиск</h1>
        <p className="text-sm text-neutral-500">
          По названию, описанию задач и записям inbox.
        </p>
      </div>

      <SearchClient />
    </main>
  );
}
