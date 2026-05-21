import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { BackupSection } from "./BackupSection";

export default async function SettingsPage() {
  await requireUser();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 p-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← главная
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Настройки</h1>
      </div>

      <BackupSection />
    </main>
  );
}
