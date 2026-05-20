# Страница «Сегодня» — Design Spec

**Date:** 2026-05-20

## Goal

Add a `/today` page showing tasks that need attention today: overdue tasks from past days + tasks due today. Accessible via "Сегодня" nav button on the home page.

## Data

Query `task` table:
- `due_at <= end of today (23:59:59)` AND `status != done`
- Order: `due_at ASC`
- Include: `id, title, status, due_at, sphere:sphere_id(name, color), project:project_id(name)`

Run `processOverdueTasks` on load (same as tasks/week pages).

## Sections

1. **Просрочено** — tasks where `due_at < start of today`. Red date label. Shown only if overdue tasks exist.
2. **Сегодня** — tasks where `due_at` falls within today. Shown only if today tasks exist.

If both sections empty → show "Отличный день! Задач нет."

## Actions

- Toggle done: `toggleTask` server action (same as tasks/page.tsx)
- Delete: `deleteTask` server action (same as tasks/page.tsx)

## Navigation

`src/app/page.tsx` nav array: insert `{ href: "/today", label: "Сегодня" }` before `{ href: "/week", label: "Неделя" }`.

## Files

- **Create:** `src/app/today/page.tsx`
- **Modify:** `src/app/page.tsx` (nav item)
