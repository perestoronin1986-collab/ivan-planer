"use client";

import { useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check } from "lucide-react";
import { localDb } from "@/lib/local/db";
import { useUserId } from "@/lib/local/useUser";
import {
  toggleHabitLogLocal,
  setHabitValueLocal,
  deleteHabitLocal,
} from "@/lib/local/mutations";
import type { HabitRow } from "@/lib/db";
import { Section, EmptyState, Chip } from "@/components/ui";
import { NewHabitModal } from "./NewHabitModal";
import {
  dayStr,
  addDays,
  weekKey,
  currentStreak,
  bestDailyStreak,
  completionRate,
  buildHeatmap,
  numericStats,
  numericSeries,
} from "./stats";

type Tab = "today" | "week" | "stats";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function mondayOf(date: string): string {
  const d = new Date(date + "T00:00:00");
  const dow = (d.getDay() + 6) % 7; // Mon=0
  return addDays(date, -dow);
}

type HabitData = {
  habits: HabitRow[];
  doneByHabit: Map<string, Set<string>>;
  valueByHabit: Map<string, Map<string, number>>;
};

function useHabitData(): HabitData | undefined {
  return useLiveQuery(async () => {
    const db = localDb();
    const [habits, logs] = await Promise.all([
      db.habit.toArray(),
      db.habit_log.toArray(),
    ]);
    const visible = habits
      .filter((h) => !h.deleted_at && !h.archived)
      .sort((a, b) => a.order - b.order || a.created_at.localeCompare(b.created_at));

    const doneByHabit = new Map<string, Set<string>>();
    const valueByHabit = new Map<string, Map<string, number>>();
    for (const h of visible) {
      doneByHabit.set(h.id, new Set());
      valueByHabit.set(h.id, new Map());
    }
    for (const l of logs) {
      if (l.deleted_at) continue;
      doneByHabit.get(l.habit_id)?.add(l.date);
      if (l.value != null) valueByHabit.get(l.habit_id)?.set(l.date, l.value);
    }
    return { habits: visible, doneByHabit, valueByHabit };
  });
}

export function HabitsClient() {
  const [tab, setTab] = useState<Tab>("today");
  const data = useHabitData();

  const habits = data?.habits ?? [];
  const doneByHabit = data?.doneByHabit ?? new Map<string, Set<string>>();
  const valueByHabit =
    data?.valueByHabit ?? new Map<string, Map<string, number>>();
  const empty = habits.length === 0;

  return (
    <div className="flex flex-col gap-2">
      {/* 4 кнопки: 3 вкладки + создание */}
      <div className="grid grid-cols-4 gap-1.5">
        <TabBtn active={tab === "today"} onClick={() => setTab("today")} emoji="🔥" label="Сегодня" />
        <TabBtn active={tab === "week"} onClick={() => setTab("week")} emoji="📅" label="Неделя" />
        <TabBtn active={tab === "stats"} onClick={() => setTab("stats")} emoji="📊" label="Статистика" />
        <NewHabitModal
          triggerChildren={
            <span className="flex flex-col items-center gap-0.5">
              <span className="text-base leading-none">➕</span>
              <span className="text-[11px] font-semibold leading-none">Новая</span>
            </span>
          }
          triggerClassName="flex items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#7c3aed,#8b5cf6)] py-2 text-white shadow-[0_4px_15px_rgba(124,58,237,0.4)]"
        />
      </div>

      {empty && (
        <Section>
          <EmptyState
            emoji="🌱"
            title="Привычек пока нет"
            hint="Нажми «Новая», чтобы добавить первую"
          />
        </Section>
      )}

      {!empty && tab === "today" && (
        <TodayTab
          habits={habits}
          doneByHabit={doneByHabit}
          valueByHabit={valueByHabit}
        />
      )}
      {!empty && tab === "week" && (
        <WeekTab
          habits={habits}
          doneByHabit={doneByHabit}
          valueByHabit={valueByHabit}
        />
      )}
      {!empty && tab === "stats" && (
        <StatsTab
          habits={habits}
          doneByHabit={doneByHabit}
          valueByHabit={valueByHabit}
        />
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 rounded-[12px] py-2 transition"
      style={{
        background: active ? "var(--brand-100)" : "#fff",
        border: active ? "1.5px solid var(--brand-500)" : "1px solid var(--line)",
      }}
    >
      <span className="text-base leading-none">{emoji}</span>
      <span
        className="text-[11px] font-semibold leading-none"
        style={{ color: active ? "var(--brand-700)" : "var(--brand-900)" }}
      >
        {label}
      </span>
    </button>
  );
}

function freqLabel(h: HabitRow): string {
  if (h.frequency === "daily") return "каждый день";
  return `${h.target_per_week}×/нед`;
}

// ---------------- Сегодня ----------------

function TodayTab({ habits, doneByHabit, valueByHabit }: HabitData) {
  const userId = useUserId();
  const today = dayStr();
  const thisWeek = weekKey(today);

  async function toggle(habitId: string) {
    if (!userId) return;
    await toggleHabitLogLocal({ userId, habitId, date: today });
  }

  return (
    <Section label="🔥 Сегодня">
      <div className="space-y-1.5">
        {habits.map((h) => {
          const done = doneByHabit.get(h.id) ?? new Set<string>();
          const isDone = done.has(today);
          const streak = currentStreak(h, done, today);
          const weekCount =
            h.frequency === "weekly"
              ? [...done].filter((d) => weekKey(d) === thisWeek).length
              : 0;
          const todayValue = valueByHabit.get(h.id)?.get(today) ?? null;
          return (
            <div
              key={h.id}
              className="flex items-center gap-3 rounded-[12px] px-3 py-2"
              style={{ background: "var(--brand-50)", border: "1px solid var(--brand-100)" }}
            >
              <span className="text-xl leading-none">{h.icon ?? "•"}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{h.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                  <span>{freqLabel(h)}</span>
                  {h.kind === "quit" && <Chip>отказ</Chip>}
                  {streak > 0 && <span>🔥 {streak}</span>}
                  {h.frequency === "weekly" && (
                    <span>
                      {weekCount}/{h.target_per_week} за неделю
                    </span>
                  )}
                </div>
              </div>
              {h.type === "numeric" ? (
                <NumericTodayInput
                  key={`${h.id}:${today}`}
                  habit={h}
                  value={todayValue}
                  onCommit={(v) => {
                    if (userId)
                      void setHabitValueLocal({
                        userId,
                        habitId: h.id,
                        date: today,
                        value: v,
                      });
                  }}
                />
              ) : (
                <button
                  onClick={() => toggle(h.id)}
                  aria-label={isDone ? "Снять отметку" : "Отметить выполнено"}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition"
                  style={{
                    background: isDone ? h.color : "#fff",
                    border: isDone ? "none" : "2px solid var(--brand-200)",
                  }}
                >
                  {isDone && <Check size={18} color="#fff" strokeWidth={3} />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/**
 * Numeric value input for the Today tab. Holds local draft state and commits
 * on a 500ms debounce (and on blur). Empty string commits `null` (removes the
 * day's log). A small color dot indicates a value is recorded.
 */
function NumericTodayInput({
  habit,
  value,
  onCommit,
}: {
  habit: HabitRow;
  value: number | null;
  onCommit: (v: number | null) => void;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function parse(s: string): number | null {
    const t = s.trim().replace(",", ".");
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  function schedule(s: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(parse(s)), 500);
  }

  function flush(s: string) {
    if (timer.current) clearTimeout(timer.current);
    onCommit(parse(s));
  }

  const hasValue = draft.trim() !== "";

  return (
    <div className="flex flex-shrink-0 items-center gap-1.5">
      <input
        value={draft}
        inputMode="decimal"
        placeholder="—"
        aria-label={`Значение: ${habit.name}`}
        onChange={(e) => {
          setDraft(e.target.value);
          schedule(e.target.value);
        }}
        onBlur={() => flush(draft)}
        className="h-9 w-16 rounded-[10px] border bg-white px-2 text-right text-sm font-semibold text-ink outline-none"
        style={{ borderColor: "var(--brand-200)" }}
      />
      {habit.unit && (
        <span className="text-[11px] text-muted">{habit.unit}</span>
      )}
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{
          background: hasValue ? habit.color : "transparent",
          border: hasValue ? "none" : "2px solid var(--brand-200)",
        }}
      />
    </div>
  );
}

// ---------------- Неделя ----------------

function WeekTab({ habits, doneByHabit, valueByHabit }: HabitData) {
  const userId = useUserId();
  const [weekOffset, setWeekOffset] = useState(0);
  const today = dayStr();
  const monday = addDays(mondayOf(today), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  async function toggle(habitId: string, date: string) {
    if (!userId || date > today) return; // нельзя отмечать будущее
    await toggleHabitLogLocal({ userId, habitId, date });
  }

  function editValue(h: HabitRow, date: string) {
    if (!userId || date > today) return; // нельзя редактировать будущее
    const current = valueByHabit.get(h.id)?.get(date) ?? null;
    const unit = h.unit ? ` (${h.unit})` : "";
    const input = window.prompt(
      `${h.name}${unit} за ${date.slice(8)}.${date.slice(5, 7)}:`,
      current == null ? "" : String(current),
    );
    if (input === null) return; // Cancel
    const t = input.trim().replace(",", ".");
    const value = t === "" ? null : Number(t);
    void setHabitValueLocal({
      userId,
      habitId: h.id,
      date,
      value: value != null && Number.isFinite(value) ? value : null,
    });
  }

  const rangeLabel = `${days[0].slice(8)}–${days[6].slice(8)}.${days[6].slice(5, 7)}`;

  return (
    <Section label="📅 Неделя">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="rounded-[8px] px-2 py-1 text-xs"
          style={{ background: "var(--brand-50)", border: "1px solid var(--brand-200)" }}
        >
          ←
        </button>
        <span className="text-xs font-semibold text-muted">
          {weekOffset === 0 ? "Эта неделя" : rangeLabel}
        </span>
        <button
          onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
          disabled={weekOffset === 0}
          className="rounded-[8px] px-2 py-1 text-xs disabled:opacity-30"
          style={{ background: "var(--brand-50)", border: "1px solid var(--brand-200)" }}
        >
          →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-px"></th>
              {days.map((d, i) => (
                <th key={d} className="px-0.5 pb-1 text-center">
                  <div className="text-[10px] font-semibold text-muted">{WEEKDAYS[i]}</div>
                  <div
                    className="text-[10px]"
                    style={{ color: d === today ? "var(--brand-600)" : "var(--brand-300)" }}
                  >
                    {d.slice(8)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map((h) => {
              const done = doneByHabit.get(h.id) ?? new Set<string>();
              const values = valueByHabit.get(h.id) ?? new Map<string, number>();
              const numeric = h.type === "numeric";
              return (
                <tr key={h.id}>
                  <td className="pr-1.5 align-middle">
                    <span className="text-base">{h.icon ?? "•"}</span>
                  </td>
                  {days.map((d) => {
                    const future = d > today;
                    if (numeric) {
                      const v = values.get(d) ?? null;
                      const has = v != null;
                      return (
                        <td key={d} className="p-0.5 text-center">
                          <button
                            onClick={() => editValue(h, d)}
                            disabled={future}
                            aria-label={`${h.name} ${d}`}
                            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[10px] font-semibold transition disabled:opacity-30"
                            style={{
                              background: has ? h.color : "var(--brand-50)",
                              color: has ? "#fff" : "var(--brand-400)",
                              border: has ? "none" : "1px solid var(--brand-200)",
                            }}
                          >
                            {has ? v : ""}
                          </button>
                        </td>
                      );
                    }
                    const isDone = done.has(d);
                    return (
                      <td key={d} className="p-0.5 text-center">
                        <button
                          onClick={() => toggle(h.id, d)}
                          disabled={future}
                          aria-label={`${h.name} ${d}`}
                          className="h-7 w-7 rounded-[8px] transition disabled:opacity-30"
                          style={{
                            background: isDone ? h.color : "var(--brand-50)",
                            border: isDone ? "none" : "1px solid var(--brand-200)",
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Тапни клетку, чтобы отметить день (для числовых — ввести значение).
        Будущие дни недоступны.
      </p>
    </Section>
  );
}

// ---------------- Статистика ----------------

function StatsTab({ habits, doneByHabit, valueByHabit }: HabitData) {
  return (
    <div className="flex flex-col gap-2">
      {habits.map((h) =>
        h.type === "numeric" ? (
          <NumericStatsCard
            key={h.id}
            habit={h}
            values={valueByHabit.get(h.id) ?? new Map<string, number>()}
          />
        ) : (
          <BinaryStatsCard
            key={h.id}
            habit={h}
            done={doneByHabit.get(h.id) ?? new Set<string>()}
          />
        ),
      )}
    </div>
  );
}

function StatsHeader({ habit }: { habit: HabitRow }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-xl">{habit.icon ?? "•"}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{habit.name}</div>
        <div className="text-[11px] text-muted">{freqLabel(habit)}</div>
      </div>
      <DeleteHabit id={habit.id} name={habit.name} />
    </div>
  );
}

function BinaryStatsCard({ habit, done }: { habit: HabitRow; done: Set<string> }) {
  const streak = currentStreak(habit, done);
  const best = bestDailyStreak(done);
  const rate = completionRate(habit, done, 30);
  const heatmap = buildHeatmap(done, 13);
  return (
    <Section>
      <StatsHeader habit={habit} />
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat value={`🔥 ${streak}`} label="серия" />
        <Stat value={`🏆 ${best}`} label="рекорд" />
        <Stat value={`${rate}%`} label="за 30 дней" />
      </div>
      <Heatmap cols={heatmap} color={habit.color} />
    </Section>
  );
}

function fmtNum(n: number | null): string {
  if (n == null) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function NumericStatsCard({
  habit,
  values,
}: {
  habit: HabitRow;
  values: Map<string, number>;
}) {
  const s = numericStats(values);
  const series = numericSeries(values, 30);
  const unit = habit.unit ? ` ${habit.unit}` : "";
  return (
    <Section>
      <StatsHeader habit={habit} />
      {s.count === 0 ? (
        <EmptyState emoji="📈" title="Нет записей" hint="Введи значение во вкладке «Сегодня»" />
      ) : (
        <>
          <div className="mb-2 grid grid-cols-3 gap-2">
            <Stat value={`${fmtNum(s.last)}${unit}`} label="последнее" />
            <Stat value={`${fmtNum(s.min)}${unit}`} label="мин" />
            <Stat value={`${fmtNum(s.max)}${unit}`} label="макс" />
          </div>
          <div className="mb-2 text-center text-[11px] text-muted">
            среднее: {fmtNum(s.avg)}{unit} · записей: {s.count}
          </div>
          <Sparkline points={series.map((p) => p.value)} color={habit.color} />
        </>
      )}
    </Section>
  );
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) {
    return (
      <div className="text-center text-[11px] text-muted">
        Мало точек для графика
      </div>
    );
  }
  const W = 280;
  const H = 48;
  const pad = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (W - pad * 2) / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (H - pad * 2) * (1 - (v - min) / range);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-[10px] py-2 text-center"
      style={{ background: "var(--brand-50)", border: "1px solid var(--brand-100)" }}
    >
      <div className="text-sm font-bold text-ink">{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}

function Heatmap({
  cols,
  color,
}: {
  cols: Array<Array<{ date: string; done: boolean } | null>>;
  color: string;
}) {
  return (
    <div className="flex gap-[3px] overflow-x-auto">
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {col.map((cell, ri) => (
            <div
              key={ri}
              title={cell?.date}
              className="h-3 w-3 rounded-[3px]"
              style={{
                background: !cell
                  ? "transparent"
                  : cell.done
                    ? color
                    : "var(--brand-100)",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function DeleteHabit({ id, name }: { id: string; name: string }) {
  return (
    <button
      onClick={async () => {
        if (confirm(`Удалить привычку «${name}»? История отметок тоже исчезнет.`)) {
          await deleteHabitLocal(id);
        }
      }}
      className="flex-shrink-0 rounded-[8px] px-2 py-1 text-[11px]"
      style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
    >
      Удалить
    </button>
  );
}
