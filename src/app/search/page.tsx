import { requireUser } from "@/lib/supabase/server";
import { SearchClient } from "./SearchClient";
import { PageShell } from "@/components/ui";

export default async function SearchPage() {
  await requireUser();

  return (
    <PageShell
      title="Поиск"
      emoji="🔍"
      subtitle="по задачам и инбоксу"
    >
      <SearchClient />
    </PageShell>
  );
}
