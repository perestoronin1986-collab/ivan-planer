import type { ReactNode } from "react";

type Props = {
  label?: string;
  accent?: boolean;
  children: ReactNode;
  className?: string;
};

export function Section({ label, accent = false, children, className = "" }: Props) {
  const style = accent
    ? {
        background: "var(--grad-card-accent)",
        border: "1.5px solid var(--brand-400)",
        borderRadius: "var(--r-card)",
        boxShadow: "var(--shadow-accent)",
      }
    : {
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-card)",
        boxShadow: "var(--shadow-card)",
      };

  return (
    <section style={style} className={`p-3 ${className}`}>
      {label ? (
        <p
          className="mb-2 text-[10px] font-bold uppercase tracking-[1px]"
          style={{ color: accent ? "var(--brand-600)" : "var(--brand-400)" }}
        >
          {label}
        </p>
      ) : null}
      {children}
    </section>
  );
}
