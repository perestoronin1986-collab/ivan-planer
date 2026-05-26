type Props = {
  emoji?: string;
  title: string;
  hint?: string;
};

export function EmptyState({ emoji = "✨", title, hint }: Props) {
  return (
    <div className="py-8 text-center">
      <div className="text-3xl mb-2">{emoji}</div>
      <div className="text-sm font-medium text-ink">{title}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
