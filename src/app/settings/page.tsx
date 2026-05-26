import { requireUser } from "@/lib/supabase/server";
import { BackupSection } from "./BackupSection";
import { PageShell } from "@/components/ui";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <PageShell title="Настройки" emoji="⚙️" subtitle={user.email ?? undefined}>
      <BackupSection />
    </PageShell>
  );
}
