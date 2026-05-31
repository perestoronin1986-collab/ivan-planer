import { requireUser } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui";
import { HabitsClient } from "./HabitsClient";

export default async function HabitsPage() {
  await requireUser();

  return (
    <PageShell title="Привычки" emoji="🌱" subtitle="ежедневные и еженедельные">
      <HabitsClient />
    </PageShell>
  );
}
