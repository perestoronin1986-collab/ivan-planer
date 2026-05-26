export function OverdueActionSelect({ showOnly }: { showOnly?: boolean }) {
  void showOnly;
  return (
    <select
      name="overdueAction"
      title="Если не выполнить к сроку"
      className="rounded-[10px] border border-[var(--brand-200)] bg-white px-2 py-1.5 text-xs text-[var(--brand-900)] outline-none focus:border-[var(--brand-500)]"
    >
      <option value="">если просрочить…</option>
      <option value="reschedule">→ на следующий день</option>
      <option value="autocomplete">→ выполнить авто</option>
    </select>
  );
}
