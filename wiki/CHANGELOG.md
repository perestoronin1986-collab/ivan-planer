# Changelog

> История изменений из git log

---

## 2026-05-20

- **feat:** add per-day task creation and sphere icons to week view
  - `WeekDayColumn` client component с кнопкой `+` на каждом дне
  - Клик открывает диалог с pre-filled датой
  - Иконка сферы (emoji или цветной кружок) справа от задачи

---

## 2026-05-19 — Повторяющиеся задачи

- **feat:** add recurring task button to today page
- **feat:** add `AddRecurringTaskModal` component with live preview
- **feat:** add `createRecurringTask` server action (rrule + вхождения)
- **fix:** log rollback failures and surface server errors in recurring task modal
- **fix:** reset form on close and add a11y attributes to recurring task modal
- **fix:** validate inputs and cap occurrences in `createRecurringTask`
- **feat(task):** track `carry_count` for rescheduled tasks
- **fix:** compare `due_at` as Date objects (Supabase +00:00 vs .000Z)
- **fix:** only reschedule tasks due before today, not before current time
- **fix:** reschedule overdue tasks to midnight of next day

---

## 2026-05-18 — Страница Сегодня

- **feat:** add overdue action select to today task modal
- **feat:** replace inline form with modal dialog on `/today` page
- **feat:** add task creation form to `/today` page with sphere+project selects
- **feat:** add `Сегодня` nav button on home page
- **feat:** add `/today` page with overdue + today tasks
- **fix:** add `revalidatePath(/today)` to `toggleTask` and `deleteTask`
- **fix:** use date-only input in today task modal

---

## 2026-05-17 — Первый рабочий деплой

- **feat:** wrap sphere form color+button to second row on mobile
- **fix:** stack header vertically on mobile
- **chore:** trigger vercel deploy

---

## 2026-05-16 — Инициализация

- **feat:** Initial commit — IvanPlaner Next.js + Supabase PostgREST
  - Рефакторинг Drizzle+postgres → Supabase PostgREST
  - Все страницы: `/`, `/spheres`, `/spheres/[id]`, `/spheres/[id]/projects/[id]`, `/tasks`, `/inbox`, `/week`
  - Server actions: spheres/actions.ts, inbox/actions.ts
  - RLS на всех таблицах Supabase
