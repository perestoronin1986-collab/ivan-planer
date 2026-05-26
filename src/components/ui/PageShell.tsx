import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  emoji?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({
  title,
  emoji,
  subtitle,
  backHref = "/",
  backLabel = "главная",
  actions,
  children,
}: Props) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-2 p-3">
      <header className="pb-1">
        <Link
          href={backHref}
          className="text-xs text-gray-400 hover:underline"
        >
          ← {backLabel}
        </Link>
        <div className="mt-1 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-[22px] font-bold text-ink leading-tight">
              {emoji ? <span className="mr-1">{emoji}</span> : null}
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
            ) : null}
          </div>
          {actions}
        </div>
      </header>
      {children}
    </main>
  );
}
