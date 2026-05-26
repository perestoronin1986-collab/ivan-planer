import type { ReactNode } from "react";

export function Chip({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "neutral";
}) {
  const palette =
    tone === "brand"
      ? { background: "var(--brand-100)", color: "var(--brand-600)" }
      : { background: "#f3f4f6", color: "#6b7280" };

  return (
    <span
      className="inline-block text-[11px] font-medium px-2 py-0.5"
      style={{ ...palette, borderRadius: "var(--r-chip)" }}
    >
      {children}
    </span>
  );
}
