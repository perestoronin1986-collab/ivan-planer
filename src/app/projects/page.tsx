import { createClient, requireUser } from "@/lib/supabase/server";
import { ProjectsList } from "./ProjectsList";
import { PageShell } from "@/components/ui";

export default async function ProjectsPage() {
  await requireUser();
  const supabase = await createClient();

  const { data: spheres } = await supabase
    .from("sphere")
    .select("id, name, color, icon")
    .order("order", { ascending: true });

  const sphereList = (spheres ?? []) as {
    id: string;
    name: string;
    color: string;
    icon: string | null;
  }[];

  return (
    <PageShell title="Проекты" emoji="📁" subtitle="активные">
      <ProjectsList sphereList={sphereList} />
    </PageShell>
  );
}
