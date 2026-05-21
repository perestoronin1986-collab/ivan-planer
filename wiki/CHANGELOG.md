# Changelog

> История изменений из git log

---

## 2026-05-21 — Offline / PWA (+ багфиксы смоук-теста)

- **fix(middleware):** разрешить публичный доступ к `/manifest.webmanifest`, `/offline`, `/icon`, `/icon1`, `/icon2`, `/apple-icon` (расширен `PUBLIC_PATHS`). Иначе PWA не загрузила бы манифест и иконки на устройстве без активной сессии
- **fix(inbox):** убран `Dexie.where("processed_at").equals(null)` — IndexedDB не принимает null как ключ. Заменено на `toArray().filter()`

---

## 2026-05-21 — Offline / PWA

- **feat:** offline-first архитектура для tasks / inbox / sphere / project
  - Миграция `0002_offline_sync.sql`: `updated_at` + `deleted_at` + индексы `(user_id, updated_at)` + триггер `set_updated_at()` на 4 таблицах
  - Dexie schema (`src/lib/local/db.ts`): `sphere`, `project`, `task`, `inbox_item`, `outbox`, `sync_meta`
  - Sync engine (`src/lib/local/sync.ts`): push (outbox→Supabase) + pull (delta-pull по `updated_at`), LWW конфликт-резолюция, `installSyncListeners()` на `online` / custom event / mount
  - Local-first мутации (`src/lib/local/mutations.ts`): `add*Local`, `update*Local`, `delete*Local`, `toggle*Local` — пишут в Dexie + outbox, kick off sync
  - Service Worker (`public/sw.js`): precache app shell + network-first navigations + cache-first static + push + background sync (`outbox-sync`)
  - PWA manifest (`src/app/manifest.ts`) + иконки `/icon1` (192) + `/icon2` (512, maskable)
  - `ServiceWorkerRegister` + `SyncProvider` в `app/layout.tsx`
  - `/offline` fallback страница
  - tasks page переведена на `useLiveQuery` + local mutations; аналогично inbox

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
