"use client";

import { deleteSphere } from "@/app/spheres/actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

export function SphereDeleteButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  return (
    <ConfirmDeleteButton
      onConfirm={async () => {
        await deleteSphere(id);
      }}
      message="Удалить сферу?"
      description={`${name} — будут удалены связанные проекты и задачи`}
      size={16}
    />
  );
}
