# Recurring Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "+ Регулярная задача" button to /today that opens a modal for configuring a repeating task, pre-generating all occurrences as individual `task` rows.

**Architecture:** Template task (status=done, carries rrule string) is inserted first; N occurrence tasks (status=todo, parent_id→template, individual due_at) are batch-inserted. Existing toggleTask/deleteTask/processOverdueTasks work unchanged on occurrences. Preview computed client-side via `rrule` npm package.

**Tech Stack:** Next.js 16 server actions, `rrule@2.8.1` (already installed), Supabase PostgREST, React 19 hooks, date-fns.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/spheres/actions.ts` | Modify | Add `createRecurringTask` server action |
| `src/app/today/AddRecurringTaskModal.tsx` | Create | Modal UI with live preview |
| `src/app/today/page.tsx` | Modify | Add ↻ button + import modal |

---

## Task 1: Add `createRecurringTask` server action

**Files:**
- Modify: `src/app/spheres/actions.ts`

- [ ] **Step 1: Add the action at the bottom of `src/app/spheres/actions.ts`**

Add this import at the top of the file (alongside existing `RRule` — if not there yet, add it):

```ts
import { RRule } from "rrule";
```

Then append this action at the bottom of the file:

```ts
export async function createRecurringTask(formData: FormData) {
  const user = await requireUser();

  const title = (formData.get("title") as string)?.trim();
  const sphereId = formData.get("sphereId") as string;
  const projectId = (formData.get("projectId") as string) || null;
  const pattern = formData.get("pattern") as "weekly" | "monthly" | "interval";
  const startDate = formData.get("startDate") as string;
  const endType = formData.get("endType") as "date" | "count";
  const endDateRaw = (formData.get("endDate") as string) || null;
  const endCountRaw = (formData.get("endCount") as string) || null;
  const overdueActionRaw = formData.get("overdueAction") as string | null;
  const overdueAction = overdueActionRaw === "reschedule" ? ("reschedule" as const) : null;

  if (!title || !sphereId || !startDate) throw new Error("Missing required fields");

  const dtstart = new Date(startDate + "T00:00:00Z");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: Record<string, any> = { dtstart };

  if (pattern === "weekly") {
    const weekdaysRaw = (formData.get("weekdays") as string) || "";
    const weekInterval = Math.max(1, parseInt(formData.get("weekInterval") as string) || 1);
    const dayMap: Record<string, typeof RRule.MO> = {
      MO: RRule.MO, TU: RRule.TU, WE: RRule.WE, TH: RRule.TH,
      FR: RRule.FR, SA: RRule.SA, SU: RRule.SU,
    };
    const byweekday = weekdaysRaw.split(",").filter(Boolean).map((d) => dayMap[d]).filter(Boolean);
    if (!byweekday.length) throw new Error("Select at least one weekday");
    opts.freq = RRule.WEEKLY;
    opts.interval = weekInterval;
    opts.byweekday = byweekday;
  } else if (pattern === "monthly") {
    const monthDaysRaw = (formData.get("monthDays") as string) || "";
    const monthInterval = Math.max(1, parseInt(formData.get("monthInterval") as string) || 1);
    const bymonthday = monthDaysRaw
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((n) => n >= 1 && n <= 31);
    if (!bymonthday.length) throw new Error("Select at least one day of month");
    opts.freq = RRule.MONTHLY;
    opts.interval = monthInterval;
    opts.bymonthday = bymonthday;
  } else {
    const dayInterval = Math.max(1, parseInt(formData.get("dayInterval") as string) || 1);
    opts.freq = RRule.DAILY;
    opts.interval = dayInterval;
  }

  if (endType === "date" && endDateRaw) {
    const until = new Date(endDateRaw + "T23:59:59Z");
    if (isNaN(until.getTime()) || until <= dtstart) throw new Error("Invalid end date");
    opts.until = until;
  } else if (endType === "count" && endCountRaw) {
    const count = parseInt(endCountRaw);
    if (count < 1 || count > 500) throw new Error("Count must be 1–500");
    opts.count = count;
  } else {
    throw new Error("End condition required");
  }

  const rule = new RRule(opts);
  const dates = rule.all();
  if (!dates.length) throw new Error("No occurrences generated");

  const rruleStr = rule.toString();
  const rruleUntil = opts.until ? (opts.until as Date).toISOString() : null;

  const supabase = await createClient();

  const { data: template, error: tErr } = await supabase
    .from("task")
    .insert({
      title,
      sphere_id: sphereId,
      project_id: projectId,
      rrule: rruleStr,
      rrule_until: rruleUntil,
      status: "done",
      user_id: user.id,
      overdue_action: overdueAction,
    })
    .select("id")
    .single();
  if (tErr) throw new Error(tErr.message);

  const occurrences = dates.map((d) => ({
    title,
    sphere_id: sphereId,
    project_id: projectId,
    parent_id: template.id,
    due_at: new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    ).toISOString(),
    overdue_action: overdueAction,
    status: "todo" as const,
    user_id: user.id,
  }));

  const { error: oErr } = await supabase.from("task").insert(occurrences);
  if (oErr) throw new Error(oErr.message);

  revalidatePath("/today");
}
```

- [ ] **Step 2: Type-check**

```bash
cd c:\Claude\Code\Projects\IvanPlaner
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/spheres/actions.ts
git commit -m "feat: add createRecurringTask server action"
```

---

## Task 2: Create `AddRecurringTaskModal.tsx`

**Files:**
- Create: `src/app/today/AddRecurringTaskModal.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useRef, useState, useMemo } from "react";
import { RRule } from "rrule";
import { format } from "date-fns";
import { createRecurringTask } from "@/app/spheres/actions";

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
}: {
  spheres: Sphere[];
  projects: Project[];
  todayDefault: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [title, setTitle] = useState("");
  const [sphereId, setSphereId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [pattern, setPattern] = useState<"weekly" | "monthly" | "interval">("weekly");
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [weekInterval, setWeekInterval] = useState(1);
  const [monthDays, setMonthDays] = useState<number[]>([]);
  const [monthInterval, setMonthInterval] = useState(1);
  const [dayInterval, setDayInterval] = useState(1);
  const [startDate, setStartDate] = useState(todayDefault);
  const [endType, setEndType] = useState<"date" | "count">("count");
  const [endDate, setEndDate] = useState("");
  const [endCount, setEndCount] = useState(10);
  const [overdueAction, setOverdueAction] = useState<"reschedule" | "">("reschedule");
  const [pending, setPending] = useState(false);

  const toggleWeekday = (key: string) =>
    setWeekdays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );

  const toggleMonthDay = (day: number) =>
    setMonthDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

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
      } else {
        opts.freq = RRule.DAILY;
        opts.interval = Math.max(1, dayInterval);
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
  }, [pattern, weekdays, weekInterval, monthDays, monthInterval, dayInterval, startDate, endType, endDate, endCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview.length) return;
    setPending(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("sphereId", sphereId);
      if (projectId) fd.append("projectId", projectId);
      fd.append("pattern", pattern);
      fd.append("startDate", startDate);
      fd.append("endType", endType);
      if (endType === "date") fd.append("endDate", endDate);
      else fd.append("endCount", String(endCount));
      if (pattern === "weekly") {
        fd.append("weekdays", weekdays.join(","));
        fd.append("weekInterval", String(weekInterval));
      } else if (pattern === "monthly") {
        fd.append("monthDays", monthDays.join(","));
        fd.append("monthInterval", String(monthInterval));
      } else {
        fd.append("dayInterval", String(dayInterval));
      }
      if (overdueAction) fd.append("overdueAction", overdueAction);
      await createRecurringTask(fd);
      dialogRef.current?.close();
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
        className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        ↻ Регулярная задача
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-neutral-200 p-6 shadow-xl backdrop:bg-black/40 dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <h2 className="mb-4 text-base font-semibold">Регулярная задача</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Название</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно делать?"
              className={inputCls}
            />
          </div>

          {/* Sphere */}
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Сфера</label>
            <select
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
            <label className="text-xs text-neutral-500">Проект (необязательно)</label>
            <select
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
          </div>

          {/* Start date */}
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">С какого числа</label>
            <input
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

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
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
```

- [ ] **Step 2: Type-check**

```bash
cd c:\Claude\Code\Projects\IvanPlaner
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/today/AddRecurringTaskModal.tsx
git commit -m "feat: add AddRecurringTaskModal component with live preview"
```

---

## Task 3: Wire button into today/page.tsx

**Files:**
- Modify: `src/app/today/page.tsx`

- [ ] **Step 1: Add import and second button**

In `src/app/today/page.tsx`, add the import:

```ts
import { AddRecurringTaskModal } from "./AddRecurringTaskModal";
```

Replace the existing `<AddTaskModal ... />` line with:

```tsx
<div className="flex gap-2">
  <AddTaskModal spheres={spheres} projects={projects} todayDefault={todayDefault} />
  <AddRecurringTaskModal spheres={spheres} projects={projects} todayDefault={todayDefault} />
</div>
```

- [ ] **Step 2: Type-check + build**

```bash
cd c:\Claude\Code\Projects\IvanPlaner
npx tsc --noEmit && npm run build
```

Expected: no errors, build succeeds.

- [ ] **Step 3: Smoke test manually**

```bash
npm run dev
```

Open http://localhost:3000/today. Verify:
1. "↻ Регулярная задача" button visible next to "+ Новая задача"
2. Click opens modal
3. Select "Дни недели" tab → click Пн, Ср → preview shows dates
4. Switch to "Числа месяца" → click day 1, 15 → preview updates
5. Switch to "Интервал" → set 3 дня → preview updates
6. Set "Кол-во раз" = 5 → preview shows 5 dates
7. "Создать (5)" button active; click → modal closes → tasks appear in today list (if startDate = today)
8. Check Supabase dashboard: 1 template task (status=done) + 5 occurrences (status=todo, parent_id set)

- [ ] **Step 4: Commit**

```bash
git add src/app/today/page.tsx
git commit -m "feat: add recurring task button to today page"
```
