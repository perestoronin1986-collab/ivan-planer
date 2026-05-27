# Changelog

> История изменений из git log

---

## 2026-05-27 — Плитка Инбокс на главной

- **feat(home):** в блок «Структура» добавлена плитка `📥 Инбокс — быстрые заметки` (полная ширина, между сеткой Сферы/Проекты и кнопкой Выполненные проекты). Ведёт на существующий `/inbox` — быстрый захват с конвертацией в задачу через `processInboxToTaskLocal`

---

## 2026-05-26 — Перф-рефакторинг IndexedDB слоя

- **perf(week):** новый `WeekGrid` — один `useLiveQuery` на всю неделю вместо 7×3 запросов в `WeekDayColumn`. Использует индексный `between()` по `due_at`. Дочерние шаблоны вычисляются через `anyOf(parentIds)`, не полным сканом
- **perf(tasks):** новый хук `useSubtasksMap` — один `where('parent_id').anyOf(ids)` для всех родителей вместо N подписок в `TaskItem`. Применён в `TodayList`, `WeekGrid`, `ProjectsList`, `ProjectTasksList`, `SphereTasksList`, `/done`, `/tasks`, `SearchClient`
- **perf(today):** `where('due_at').belowOrEqual()` вместо `toArray()`+JS-filter
- **perf(sync):** `Promise.all` для pull 4 таблиц вместо последовательного цикла
- **perf(today/week/month):** `processOverdueTasks` в `Promise.all` со фетчами sphere/project — не блокирует TTFB
- **perf(bundle):** `experimental.optimizePackageImports` для `lucide-react`, `date-fns`, `rrule`
- **fix(sw):** cache.put для навигаций только для маршрутов из `SHELL_URLS` (раньше кешировались все авторизованные HTML — растущий кэш + риск показа чужого рендера). VERSION → v4
- **chore:** выпил мёртвых server actions `toggleTask`, `deleteTask`, `createRecurringTask` из `spheres/actions.ts` (заменены `*Local` аналогами в `mutations.ts`)

---

## 2026-05-26 — Единая дизайн-система

- **feat(ui):** унификация всех внутренних экранов под фиолетовый brand (`PageShell`, `Section`, `Tile`, `ActionButton`, `Chip`, `EmptyState`)
- **feat(ui):** модалки (`AddTaskModal`, `AddRecurringTaskModal`), `sphere-edit`, `project-edit`, `ProjectsList` переведены на дизайн-систему
- **docs:** `wiki/DESIGN.md` + `wiki/design-unified.html`

---

## 2026-05-25 — Год / Месяц / структура проектов

- **feat(year):** страница `/year` — 3x4 сетка месяцев с количеством задач
- **fix(year):** включать вхождения recurring задач в подсчёт по месяцам
- **feat(home):** все 4 кнопки планирования одинакового размера, 2x2 grid
- **feat(structure):** секция "Завершённые проекты"
- **feat(projects):** переключатель показа done-задач в проекте + persist в localStorage
- **feat(recurring):** фильтры по паттерну (неделя/месяц/год/интервал)
- **feat(tasks,recurring):** кнопка `+` рядом с заголовком страницы для создания задачи

---

## 2026-05-23..24 — Главная мобильная + sync stability

- **feat(home):** мобильный редизайн с фиолетовыми акцентными блоками
- **fix(home):** email на отдельной строке, уменьшить padding
- **fix(sw):** bump version для force re-install и re-precache shell URLs
- **fix(middleware):** keep offline users authenticated on network error
- **fix(today):** reschedule оставляет задачу overdue, не двигает `due_at`
- **fix(today):** reschedule сдвигает на сегодня, не завтра
- **feat(tasks):** checklist-подзадачи через `parent_id`
- **feat(search):** `/search` страница с client-side fuzzy lookup
- **feat(settings):** JSON backup + restore на `/settings`
- **feat(sync):** offline-first для recurring задач + LWW guard + safe pull
- **fix(sync):** dead-letter outbox + guard против poison entries
- **feat(tasks):** разделение done-задач в `/done` страницу
- **feat(recurring):** `/recurring` страница с next-due для каждой серии
- **fix(inbox):** включить submit QuickCapture при непустом input
- **fix(tasks):** binary checkbox toggle (todo ↔ done)
- **fix(pwa):** manifest `start_url` = `/login` (200 unauthenticated)

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
