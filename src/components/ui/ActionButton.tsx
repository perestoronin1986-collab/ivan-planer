import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const styles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "var(--grad-primary)",
    color: "#fff",
    border: "none",
    boxShadow: "var(--shadow-primary)",
  },
  ghost: {
    background: "var(--brand-50)",
    color: "var(--brand-900)",
    border: "1px solid var(--brand-200)",
  },
  danger: {
    background: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
  },
};

export function ActionButton({
  variant = "primary",
  children,
  className = "",
  style,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={`px-3.5 py-2.5 text-[13px] font-semibold ${className}`}
      style={{
        ...styles[variant],
        borderRadius: "var(--r-tile)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
