/**
 * Task priority: 1=urgent (P1), 2=important (P2), 3=normal (P3), 4=none (P4).
 * Sorted ASC — lower number = more urgent.
 */
export type Priority = 1 | 2 | 3 | 4;

export const PRIORITY_OPTIONS: {
  value: Priority;
  label: string;
  color: string;
  ring: string;
  bg: string;
}[] = [
  {
    value: 1,
    label: "P1",
    color: "#dc2626",
    ring: "#fecaca",
    bg: "#fef2f2",
  },
  {
    value: 2,
    label: "P2",
    color: "#ea580c",
    ring: "#fed7aa",
    bg: "#fff7ed",
  },
  {
    value: 3,
    label: "P3",
    color: "#2563eb",
    ring: "#bfdbfe",
    bg: "#eff6ff",
  },
  {
    value: 4,
    label: "P4",
    color: "#9ca3af",
    ring: "#e5e7eb",
    bg: "#f9fafb",
  },
];

export function priorityMeta(p: number | null | undefined) {
  const v = (p ?? 4) as Priority;
  return PRIORITY_OPTIONS.find((o) => o.value === v) ?? PRIORITY_OPTIONS[3];
}
