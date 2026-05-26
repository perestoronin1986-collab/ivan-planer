import { requireUser } from "@/lib/supabase/server";
import { RecurringList } from "./RecurringList";
import { RecurringAddButton } from "./RecurringHeader";
import { PageShell } from "@/components/ui";

export default async function RecurringPage() {
  await requireUser();

  return (
    <PageShell
      title="Регулярные"
      emoji="🔄"
      subtitle="ближайшая на каждой регулярке"
      actions={<RecurringAddButton />}
    >
      <RecurringList />
    </PageShell>
  );
}
