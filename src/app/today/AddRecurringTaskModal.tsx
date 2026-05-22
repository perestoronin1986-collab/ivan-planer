"use client";

import { useRef, useState, useMemo } from "react";
import { RRule } from "rrule";
import { format } from "date-fns";
import { createRecurringTaskLocal } from "@/lib/local/mutations";
import { useUserId } from "@/lib/local/useUser";

type Sphere = { id: string; name: string; icon: string | null };
type Project = { id: string; name: string; sphere_id: string };

const WEEKDAYS = [
  { key: "MO", label: "Пн", rrule: RRule.MO },
  { key: "TU", label: "Вт", rrule: RRule.TU },
  { key: "WE", label: "Ср", rrule: RRule.WE },
  { key: "TH", label: "Чт", rrule: RRule.TH },
  { key: "FR", label: "Пт", rrule: RRule.FR },
  { key: "SA", label: "Сб", rrule: RRule.SA },
  { key: "SU", label: "Вс", rrule: RRule.SU },
];

export function AddRecurringTaskModal({
  spheres,
  projects,
  todayDefault,
  triggerChildren,
  triggerClassName,
}: {
  spheres: Sphere[];
  projects: Project[];
  todayDefault: string;
  triggerChildren?: React.ReactNode;
  triggerClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const userId = useUserId();

  const [title, setTitle] = useState("");
  const [sphereId, setSphereId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [pattern, setPattern] = useState<"weekly" | "monthly" | "interval" | "yearly">("weekly");
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [weekInterval, setWeekInterval] = useState(1);
  const [monthDays, setMonthDays] = useState<number[]>([]);
  const [monthInterval, setMonthInterval] = useState(1);
  const [dayInterval, setDayInterval] = useState(1);
  const [yearInterval, setYearInterval] = useState(1);
  const [startDate, setStartDate] = useState(todayDefault);
  const [endType, setEndType] = useState<"date" | "count">("count");
  const [endDate, setEndDate] = useState("");
  const [endCount, setEndCount] = useState(10);
  const [overdueAction, setOverdueAction] = useState<"reschedule" | "">("reschedule");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleWeekday = (key: string) =>
    setWeekdays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );

  const toggleMonthDay = (day: number) =>
    setMonthDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  const resetForm = () => {
    setTitle("");
    setSphereId("");
    setProjectId("");
    setPattern("weekly");
    setWeekdays([]);
    setWeekInterval(1);
    setMonthDays([]);
    setMonthInterval(1);
    setDayInterval(1);
    setYearInterval(1);
    setStartDate(todayDefault);
    setEndType("count");
    setEndDate("");
    setEndCount(10);
    setOverdueAction("reschedule");
    setError(null);
  };

  const preview = useMemo(() => {
    try {
      const dtstart = new Date(startDate + "T00:00:00Z");
      if (isNaN(dtstart.getTime())) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts: Record<string, any> = { dtstart };

      if (pattern === "weekly") {
        if (!weekdays.length) return [];
        const dayMap: Record<string, typeof RRule.MO> = {
          MO: RRule.MO, TU: RRule.TU, WE: RRule.WE, TH: RRule.TH,
          FR: RRule.FR, SA: RRule.SA, SU: RRule.SU,
        };
        opts.freq = RRule.WEEKLY;
        opts.interval = weekInterval;
        opts.byweekday = weekdays.map((d) => dayMap[d]).filter(Boolean);
      } else if (pattern === "monthly") {
        if (!monthDays.length) return [];
        opts.freq = RRule.MONTHLY;
        opts.interval = monthInterval;
        opts.bymonthday = monthDays;
      } else if (pattern === "interval") {
        opts.freq = RRule.DAILY;
        opts.interval = Math.max(1, dayInterval);
      } else {
        opts.freq = RRule.YEARLY;
        opts.interval = Math.max(1, yearInterval);
      }

      if (endType === "date" && endDate) {
        const until = new Date(endDate + "T23:59:59Z");
        if (isNaN(until.getTime()) || until <= dtstart) return [];
        opts.until = until;
      } else if (endType === "count" && endCount > 0) {
        opts.count = endCount;
      } else {
        return [];
      }

      return new RRule(opts).all();
    } catch {
      return [];
    }
  }, [pattern, weekdays, weekInterval, monthDays, monthInterval, dayInterval, yearInterval, startDate, endType, endDate, endCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview.length) return;
    if (!userId) {
      setError("Нет авторизации");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await createRecurringTaskLocal({
        userId,
        title,
        sphereId,
        projectId: projectId || null,
        pattern,
        startDate,
        endType,
        endDate: endType === "date" ? endDate : null,
        endCount: endType === "count" ? endCount : null,
        weekdays: pattern === "weekly" ? weekdays : undefined,
        weekInterval: pattern === "weekly" ? weekInterval : undefined,
        monthDays: pattern === "monthly" ? monthDays : undefined,
        monthInterval: pattern === "monthly" ? monthInterval : undefined,
        dayInterval: pattern === "interval" ? dayInterval : undefined,
        yearInterval: pattern === "yearly" ? yearInterval : undefined,
        overdueAction: overdueAction === "reschedule" ? "reschedule" : null,
      });
      resetForm();
      dialogRef.current?.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при создании задачи");
    } finally {
      setPending(false);
    }
  };

  const inputCls =
    "w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800";
  const tabCls = (active: boolean) =>
    `px-3 py-1 rounded text-xs font-medium transition-colors ${
      active
        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
        : "border border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
    }`;
  const dayCls = (active: boolean) =>
    `w-9 h-9 rounded text-xs font-medium transition-colors ${
      active
        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
        : "border border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
    }`;

  return (
    <>
      <button
        onClick={() => dialogRef.current?.showModal()}
        className={triggerClassName ?? "rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"}
      >
        {triggerChildren ?? "↻ Регулярная задача"}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="rt-dialog-title"
        className="w-full max-w-md rounded-xl border border-neutral-200 p-6 shadow-xl backdrop:bg-black/40 dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => {
          if (e.target === dialogRef.current) { resetForm(); dialogRef.current?.close(); }
        }}
      >
        <h2 id="rt-dialog-title" className="mb-4 text-base font-semibold">Регулярная задача</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">

          {/* Title */}
          <div className="space-y-1">
            <label htmlFor="rt-title" className="text-xs text-neutral-500">Название</label>
            <input
              id="rt-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно делать?"
              className={inputCls}
            />
          </div>

          {/* Sphere */}
          <div className="space-y-1">
            <label htmlFor="rt-sphere" className="text-xs text-neutral-500">Сфера</label>
            <select
              id="rt-sphere"
              required
              value={sphereId}
              onChange={(e) => setSphereId(e.target.value)}
              className={inputCls + " bg-white dark:bg-neutral-800"}
            >
              <option value="">— выберите сферу —</option>
              {spheres.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon ? `${s.icon} ` : ""}
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div className="space-y-1">
            <label htmlFor="rt-project" className="text-xs text-neutral-500">Проект (необязательно)</label>
            <select
              id="rt-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={inputCls + " bg-white dark:bg-neutral-800"}
            >
              <option value="">— без проекта —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pattern tabs */}
          <div className="space-y-3">
            <label className="text-xs text-neutral-500">Когда повторять</label>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className={tabCls(pattern === "weekly")} onClick={() => setPattern("weekly")}>
                Дни недели
              </button>
              <button type="button" className={tabCls(pattern === "monthly")} onClick={() => setPattern("monthly")}>
                Числа месяца
              </button>
              <button type="button" className={tabCls(pattern === "interval")} onClick={() => setPattern("interval")}>
                Интервал
              </button>
              <button type="button" className={tabCls(pattern === "yearly")} onClick={() => setPattern("yearly")}>
                Раз в год
              </button>
            </div>

            {pattern === "weekly" && (
              <div className="space-y-2">
                <div className="flex gap-1 flex-wrap">
                  {WEEKDAYS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={dayCls(weekdays.includes(key))}
                      onClick={() => toggleWeekday(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>Каждые</span>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={weekInterval}
                    onChange={(e) => setWeekInterval(Math.max(1, Number(e.target.value)))}
                    className="w-14 rounded border border-neutral-300 px-2 py-1 text-sm text-center dark:border-neutral-700 dark:bg-neutral-800"
                  />
                  <span>нед.</span>
                </div>
              </div>
            )}

            {pattern === "monthly" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={dayCls(monthDays.includes(day))}
                      onClick={() => toggleMonthDay(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>Каждые</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={monthInterval}
                    onChange={(e) => setMonthInterval(Math.max(1, Number(e.target.value)))}
                    className="w-14 rounded border border-neutral-300 px-2 py-1 text-sm text-center dark:border-neutral-700 dark:bg-neutral-800"
                  />
                  <span>мес.</span>
                </div>
              </div>
            )}

            {pattern === "interval" && (
              <div className="flex items-center gap-2 text-sm">
                <span>Каждые</span>
                <input
                  type="number"
                  min={1}
                  value={dayInterval}
                  onChange={(e) => setDayInterval(Math.max(1, Number(e.target.value)))}
                  className="w-14 rounded border border-neutral-300 px-2 py-1 text-sm text-center dark:border-neutral-700 dark:bg-neutral-800"
                />
                <span>дней</span>
              </div>
            )}

            {pattern === "yearly" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span>Каждые</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={yearInterval}
                    onChange={(e) => setYearInterval(Math.max(1, Number(e.target.value)))}
                    className="w-14 rounded border border-neutral-300 px-2 py-1 text-sm text-center dark:border-neutral-700 dark:bg-neutral-800"
                  />
                  <span>год(а)</span>
                </div>
                <p className="text-xs text-neutral-500">Повторяется в день старта каждый год.</p>
              </div>
            )}
          </div>

          {/* Start date */}
          <div className="space-y-1">
            <label htmlFor="rt-start" className="text-xs text-neutral-500">С какого числа</label>
            <input
              id="rt-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* End condition */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-500">Завершить повторение</label>
            <div className="flex gap-2">
              <button type="button" className={tabCls(endType === "date")} onClick={() => setEndType("date")}>
                До даты
              </button>
              <button type="button" className={tabCls(endType === "count")} onClick={() => setEndType("count")}>
                Кол-во раз
              </button>
            </div>
            {endType === "date" && (
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
              />
            )}
            {endType === "count" && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={endCount}
                  onChange={(e) => setEndCount(Math.max(1, Number(e.target.value)))}
                  className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm text-center dark:border-neutral-700 dark:bg-neutral-800"
                />
                <span>раз</span>
              </div>
            )}
          </div>

          {/* Overdue action */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-500">При пропуске</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={tabCls(overdueAction === "reschedule")}
                onClick={() => setOverdueAction("reschedule")}
              >
                Перенести
              </button>
              <button
                type="button"
                className={tabCls(overdueAction === "")}
                onClick={() => setOverdueAction("")}
              >
                Ничего
              </button>
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-1 rounded border border-neutral-200 p-3 dark:border-neutral-700">
              <p className="text-xs font-medium text-neutral-500">
                Вхождений: {preview.length}
              </p>
              <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-0.5">
                {preview.slice(0, 10).map((d, i) => (
                  <div key={i}>{format(d, "dd.MM.yyyy")}</div>
                ))}
                {preview.length > 10 && (
                  <div className="text-neutral-400">+{preview.length - 10} ещё</div>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { resetForm(); dialogRef.current?.close(); }}
              className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={pending || !preview.length}
              className="flex-1 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {pending ? "Создание..." : `Создать (${preview.length})`}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
