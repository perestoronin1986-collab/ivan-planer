"use client";

import { deleteProject } from "@/app/spheres/actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

export function ProjectDeleteButton({
  projectId,
  sphereId,
  name,
}: {
  projectId: string;
  sphereId: string;
  name: string;
}) {
  return (
    <ConfirmDeleteButton
      onConfirm={async () => {
        await deleteProject(projectId, sphereId);
      }}
      message="Удалить проект?"
      description={`${name} — будут удалены связанные задачи`}
      size={18}
    />
  );
}
