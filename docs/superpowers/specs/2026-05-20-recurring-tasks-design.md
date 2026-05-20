# Recurring Tasks — Design Spec
_Date: 2026-05-20_

## Overview

Add a "+ Регулярная задача" button to the /today page. Opens a modal where the user configures a repeating task. On submit, the system pre-generates all individual task occurrences as separate rows in the `task` table, each with a computed `due_at`. The Today page requires no changes — occurrences are plain tasks.

---

## Data Model

### Template task (1 row)

| Field | Value |
|---|---|
| `title` | from form |
| `sphere_id`, `project_id` | from form |
| `rrule` | built RRULE string (RFC 5545) |
| `rrule_until` | ISO end date, or `null` if COUNT used |
| `due_at` | `null` |
| `status` | `'done'` (invisible in Today) |
| `overdue_action` | from form |
| `user_id` | current user |

### Occurrence tasks (N rows)

| Field | Value |
|---|---|
| `title` | copied from template |
| `sphere_id`, `project_id` | copied |
| `parent_id` | template task id |
| `rrule` | `null` |
| `due_at` | computed date (start of day, ISO) |
| `overdue_action` | copied from template |
| `status` | `'todo'` |
| `user_id` | current user |

### RRULE string formats

| Pattern | RRULE |
|---|---|
| Дни недели | `FREQ=WEEKLY;INTERVAL=N;BYDAY=MO,WE;DTSTART=...;UNTIL=...` |
| Числа месяца | `FREQ=MONTHLY;INTERVAL=N;BYMONTHDAY=1,15;DTSTART=...;COUNT=N` |
| Интервал (дни) | `FREQ=DAILY;INTERVAL=N;DTSTART=...;UNTIL=...` |

End condition: either `UNTIL=<ISO>` or `COUNT=N` (mutually exclusive).

---

## UI — AddRecurringTaskModal

New file: `src/app/today/AddRecurringTaskModal.tsx` (client component, `<dialog>` pattern matching existing `AddTaskModal`).

### Fields

1. **Название** — text input (required)
2. **Сфера** — select (required)
3. **Проект** — select (optional)
4. **Когда повторять** — 3 tabs:
   - _Дни недели_: checkboxes Пн–Вс + "Каждые N недель" number input
   - _Числа месяца_: toggleable day buttons 1–31 + "Каждые N месяцев" number input
   - _Интервал_: "Каждые N дней" number input
5. **С какого числа** — date input (default: today)
6. **Завершить повторение** — radio: "До даты" (date input) | "Кол-во раз" (number input)
7. **При пропуске** — radio: "Перенести на след. день" (`reschedule`) | "Ничего" (`null`)
8. **Список вхождений** — computed client-side on every field change; first 10 shown, "+N ещё" if more

### Preview list

Computed in the browser using the `rrule` npm package (`RRule` class). Updates live as the user changes any field. No server round-trip.

---

## Server Action — createRecurringTask

Location: `src/app/spheres/actions.ts`

### Steps

1. Parse + validate `FormData`:
   - title non-empty
   - at least 1 weekday selected (if "Дни недели" tab)
   - at least 1 day-of-month selected (if "Числа месяца" tab)
   - N ≥ 1 for interval
   - start date valid
   - end condition: until date > start, or count ≥ 1

2. Build RRULE string from validated inputs

3. Generate occurrence dates server-side:
   ```ts
   import { RRule } from "rrule";
   const dates = RRule.fromString(rruleStr).all();
   ```

4. Insert template task (`status: 'done'`) → get `templateId`

5. Batch-insert occurrences:
   ```ts
   supabase.from("task").insert(dates.map(d => ({
     title, sphere_id, project_id,
     parent_id: templateId,
     due_at: startOfDay(d).toISOString(),
     overdue_action,
     status: "todo",
     user_id: user.id,
   })))
   ```

6. `revalidatePath("/today")`

---

## Files to Create / Modify

| File | Change |
|---|---|
| `src/app/today/AddRecurringTaskModal.tsx` | New — modal component |
| `src/app/today/page.tsx` | Add button + import modal |
| `src/app/spheres/actions.ts` | Add `createRecurringTask` action |
| `package.json` | No change — `rrule@^2.8.1` already installed |

---

## Out of Scope

- Editing or deleting a recurring series (delete individual occurrences only via existing deleteTask)
- Notifications / reminders
- Separate page listing all occurrences
