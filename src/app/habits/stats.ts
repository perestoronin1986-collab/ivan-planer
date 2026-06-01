import { format } from "date-fns";
import type { HabitRow } from "@/lib/db";

/** Local calendar day as `yyyy-mm-dd`. */
export function dayStr(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

/** Shift a `yyyy-mm-dd` string by `n` days (can be negative). */
export function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return dayStr(d);
}

/** Monday-based ISO week key, e.g. `2026-W23`, for weekly grouping. */
export function weekKey(date: string): string {
  const d = new Date(date + "T00:00:00");
  // Shift to Thursday of the same week (ISO rule), then derive year+week.
  const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const fDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - fDay + 3);
  const week =
    1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Current streak for a habit.
 * - daily / quit: consecutive days (ending today or yesterday) with a mark.
 *   Today missing doesn't break the streak yet — counts back from yesterday.
 * - weekly: consecutive weeks (ending this week) that met `target_per_week`.
 *   The current week counts toward the streak as soon as it hits target.
 */
export function currentStreak(
  habit: Pick<HabitRow, "frequency" | "target_per_week">,
  doneDates: Set<string>,
  today: string = dayStr(),
): number {
  if (habit.frequency === "weekly") {
    return currentWeekStreak(habit.target_per_week, doneDates, today);
  }
  let streak = 0;
  // Allow the chain to start today or, if today isn't marked, yesterday.
  let cursor = doneDates.has(today) ? today : addDays(today, -1);
  while (doneDates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive done-days across all logs (daily/quit). */
export function bestDailyStreak(doneDates: Set<string>): number {
  if (doneDates.size === 0) return 0;
  const sorted = [...doneDates].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === addDays(sorted[i - 1], 1)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

function countByWeek(doneDates: Set<string>): Map<string, number> {
  const byWeek = new Map<string, number>();
  for (const d of doneDates) {
    const k = weekKey(d);
    byWeek.set(k, (byWeek.get(k) ?? 0) + 1);
  }
  return byWeek;
}

function currentWeekStreak(
  target: number,
  doneDates: Set<string>,
  today: string,
): number {
  const byWeek = countByWeek(doneDates);
  let streak = 0;
  let cursor = today;
  // Walk back week by week. The current week counts only if target met;
  // otherwise start from last week so an unfinished week doesn't break it.
  if ((byWeek.get(weekKey(cursor)) ?? 0) < target) {
    cursor = addDays(cursor, -7);
  }
  while ((byWeek.get(weekKey(cursor)) ?? 0) >= target) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

/**
 * Completion rate over the trailing `windowDays` days.
 * - daily/quit: marked days / windowDays.
 * - weekly: weeks meeting target / weeks in window.
 * Returns 0..100 (rounded int).
 */
export function completionRate(
  habit: Pick<HabitRow, "frequency" | "target_per_week">,
  doneDates: Set<string>,
  windowDays = 30,
  today: string = dayStr(),
): number {
  if (habit.frequency === "weekly") {
    const byWeek = countByWeek(doneDates);
    const weeks = new Set<string>();
    for (let i = 0; i < windowDays; i++) weeks.add(weekKey(addDays(today, -i)));
    if (weeks.size === 0) return 0;
    let met = 0;
    for (const w of weeks) if ((byWeek.get(w) ?? 0) >= habit.target_per_week) met++;
    return Math.round((met / weeks.size) * 100);
  }
  let done = 0;
  for (let i = 0; i < windowDays; i++) {
    if (doneDates.has(addDays(today, -i))) done++;
  }
  return Math.round((done / windowDays) * 100);
}

/**
 * Build a GitHub-style heatmap grid for the trailing `weeks` weeks.
 * Returns columns (oldest→newest), each a 7-cell array (Mon→Sun) of
 * `{ date, done }`; cells in the future are `null`.
 */
export function buildHeatmap(
  doneDates: Set<string>,
  weeks = 13,
  today: string = dayStr(),
): Array<Array<{ date: string; done: boolean } | null>> {
  const todayDow = (new Date(today + "T00:00:00").getDay() + 6) % 7; // Mon=0
  // Start at Monday of the week (weeks-1) weeks ago.
  const start = addDays(today, -(todayDow + (weeks - 1) * 7));
  const cols: Array<Array<{ date: string; done: boolean } | null>> = [];
  for (let w = 0; w < weeks; w++) {
    const col: Array<{ date: string; done: boolean } | null> = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      if (date > today) col.push(null);
      else col.push({ date, done: doneDates.has(date) });
    }
    cols.push(col);
  }
  return cols;
}

// ---------------- Numeric habits ----------------

/**
 * Trailing-window series for a numeric habit, oldest→newest, only days that
 * have a recorded value. Used to draw a sparkline.
 */
export function numericSeries(
  valueByDate: Map<string, number>,
  windowDays = 30,
  today: string = dayStr(),
): Array<{ date: string; value: number }> {
  const out: Array<{ date: string; value: number }> = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const v = valueByDate.get(date);
    if (v != null) out.push({ date, value: v });
  }
  return out;
}

/**
 * Aggregate stats over all recorded values for a numeric habit.
 * `last` is the value on the most recent dated entry.
 */
export function numericStats(valueByDate: Map<string, number>): {
  last: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number;
} {
  const entries = [...valueByDate.entries()];
  if (entries.length === 0) {
    return { last: null, min: null, max: null, avg: null, count: 0 };
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const values = entries.map((e) => e[1]);
  const sum = values.reduce((s, v) => s + v, 0);
  return {
    last: entries[entries.length - 1][1],
    min: Math.min(...values),
    max: Math.max(...values),
    avg: sum / values.length,
    count: values.length,
  };
}
