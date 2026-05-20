export function OverdueActionSelect({ showOnly }: { showOnly?: boolean }) {
  return (
    <select
      name="overdueAction"
      title="Если не выполнить к сроку"
      className="rounded border border-neutral-300 px-2 py-1.5 text-xs text-neutral-500 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900"
    >
      <option value="">если просрочить…</option>
      <option value="reschedule">→ на следующий день</option>
      <option value="autocomplete">→ выполнить авто</option>
    </select>
  );
}
