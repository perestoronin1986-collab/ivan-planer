import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  emoji?: string;
  label: string;
  hint?: string;
  primary?: boolean;
  children?: ReactNode;
};

export function Tile({ href, emoji, label, hint, primary = false }: Props) {
  const style = primary
    ? {
        background: "var(--grad-primary)",
        border: "none",
        boxShadow: "var(--shadow-primary)",
        color: "#fff",
      }
    : {
        background: "var(--brand-50)",
        border: "1px solid var(--brand-200)",
        color: "var(--brand-900)",
      };

  return (
    <Link
      href={href}
      style={{
        ...style,
        borderRadius: "var(--r-tile)",
        padding: "11px 10px",
        textAlign: "center",
        display: "block",
        textDecoration: "none",
      }}
    >
      {emoji ? <div className="text-[18px] leading-none mb-1">{emoji}</div> : null}
      <div className="text-[13px] font-semibold">{label}</div>
      {hint ? (
        <div className="mt-0.5 text-[10px] opacity-70">{hint}</div>
      ) : null}
    </Link>
  );
}
