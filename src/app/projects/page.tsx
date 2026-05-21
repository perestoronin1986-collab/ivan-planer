import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import { ProjectsList } from "./ProjectsList";

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
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← главная
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Проекты</h1>
      </div>

      <ProjectsList sphereList={sphereList} />
    </main>
  );
}
