"use client";

import { useTransition } from "react";
import { updateProjectSphere } from "@/app/spheres/actions";

type Sphere = { id: string; name: string; color: string; icon: string | null };

export function SphereSelectorForm({
  projectId,
  currentSphereId,
  spheres,
}: {
  projectId: string;
  currentSphereId: string;
  spheres: Sphere[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentSphereId}
      disabled={isPending}
      onChange={(e) => {
        const newId = e.target.value;
        if (newId !== currentSphereId) {
          startTransition(() => {
            updateProjectSphere(projectId, newId);
          });
        }
      }}
      className={`text-xs border border-[var(--brand-200)] rounded-[8px] px-2 py-1 outline-none bg-white cursor-pointer ${
        isPending ? "opacity-50" : "text-[var(--brand-600)]"
      }`}
    >
      {spheres.map((s) => (
        <option key={s.id} value={s.id}>
          {s.icon} {s.name}
        </option>
      ))}
    </select>
  );
}
