---
title: Бэклог
updated: 2026-07-15
tags:
  - backlog
---
# Бэклог

> [!tip] Живой статус
> Деплой/миграции/очередь — в дэшборде [[HOME]] ([[Status.base]] по `Features/`). Здесь — полный список.

> Последнее обновление: 2026-07-15

---

## ✅ Реализовано

- Авторизация Supabase Auth (magic link), RLS на всех таблицах
- Иерархия: Сферы → Проекты → Задачи → Подзадачи
- CRUD сфер (название, цвет, icon-emoji)
- CRUD проектов (привязка к сфере, перенос между сферами, статус done)
- CRUD задач (название, сфера, проект, срок, overdue action)
- `/today` — задачи на сегодня + просроченные (overdue section)
- `/week` — недельная сетка 7 колонок, навигация по неделям
- Кнопка `+` на каждом дне в `/week` → создание задачи с pre-filled датой
- Иконки сфер справа от задачи в `/week`
- `/inbox` — быстрые заметки, конвертация в задачу/проект/сферу
- `/tasks` — все задачи пользователя
- Повторяющиеся задачи (weekly / monthly / interval, rrule, лимит 500)
- `processOverdueTasks` — reschedule или autocomplete при просрочке
- `carry_count` — счётчик переносов задачи
- Валидация через Zod во всех server actions
- Деплой на Vercel, автодеплой из `main`
- **Offline / PWA** — Local-first: Dexie (IndexedDB) + outbox + sync engine (LWW по `updated_at`, soft delete `deleted_at`). Service Worker (precache, network-first navigations, cache-first static, /offline fallback). Manifest + иконки 192/512. tasks/inbox/sphere/project — мутации через local mutations API
- **Единый дизайн внутренних экранов (2026-05-26)** — дизайн-токены в `globals.css` (фиолетовая brand-палитра, радиусы, тени), UI-компоненты `src/components/ui/` (PageShell, Section, Tile, ActionButton, Chip, EmptyState, formStyles). Переведены: today, week, month, year, projects, projects/done, spheres, spheres/[id], spheres/[id]/projects/[id], tasks, recurring, inbox, search, done, settings + модалки AddTaskModal/AddRecurringTaskModal + OverdueActionSelect + SphereSelectorForm + ProjectsList. Гайд — `wiki/DESIGN.md`. Превью — `wiki/design-unified.html`.
- **Приоритеты P1-P4 (2026-05-27)** — `task.priority` 1..4 в БД (default 4) + Dexie v3. UI: `PrioritySelector` чипы в AddTaskModal/TaskDetailsModal, цветная левая полоска в `TaskItem` (красный/оранж/синий/серый). Сортировка в `/today` и `/tasks` — по priority ASC, потом due_at.
- **Описание задачи + автоссылки (2026-05-27)** — поле `description` в форме (textarea), `AutoLinkText` рендерит URL как `<a target=_blank>`. Превью первой строки под title в списке + развёртывание по клику.
- **Плашка «Срочные задачи» (2026-05-27)** — на главной в блоке «Задачи» 4-я плашка `/tasks/urgent`, фильтр `priority === 1`, размер как тайлы Структура/Планирование. Новая страница `src/app/tasks/urgent/page.tsx`.
- **Срочные: секции P2 и P3 (2026-05-29)** — `/tasks/urgent` показывает три секции (P1/P2/P3) вместо одной. `byPriority(1|2|3)`, цвета из `PRIORITY_OPTIONS`. Подзаголовок `N P1 · N P2 · N P3`.
- **Привычки (2026-06-01)** — раздел `/habits`. Две sync-таблицы: `habit` (kind build/quit, frequency daily/weekly, target_per_week 1..7, color, icon) + `habit_log` (отметка по дню `date` yyyy-mm-dd). Dexie v4, sync engine + LWW RPC `upsert_habit*_if_newer`, mutations `addHabitLocal/updateHabitLocal/deleteHabitLocal/toggleHabitLogLocal`. UI — 4 кнопки: вкладки 🔥Сегодня (отметка ✓ + серия), 📅Неделя (сетка 7 дней, навигация недель), 📊Статистика (heatmap 13 нед + серия/рекорд/% за 30д) + ➕Новая (модалка). Серии/проценты/heatmap считаются на клиенте (`src/app/habits/stats.ts`). Плитка 🌱 в блоке «Структура» на главной. Миграция `drizzle/0005_habits.sql` — **применить вручную через Supabase SQL Editor**.
- **Числовые привычки (2026-06-02)** — тип привычки `numeric`: записывает число за день (вес и т.п.), без дневной цели. `habit.type` (binary/numeric) + `habit.unit`, `habit_log.value` (миграция `0006_numeric_habits`, **применить вручную через Supabase SQL Editor**; RPC дополнены новыми колонками). UI: блок «Тип отметки» + поле «Единица» при создании; в «Сегодня» — поле ввода + индикатор; в «Неделе» — число в клетке (правка через `prompt()`); в «Статистике» — последнее/мин/макс/среднее + sparkline. Мутация `setHabitValueLocal`, функции `numericStats`/`numericSeries` в `stats.ts`. Dexie bump не нужен.
- **Раскрытие задач проекта в сфере (2026-07-15)** — в `/spheres/[sphereId]` клик по проекту раскрывает его незаконченные задачи на месте + счётчик в строке. Переход на страницу проекта — ссылкой «→ открыть проект» внутри раскрытого блока. Компонент `SphereProjectsList` (не `ProjectsList` — то компонент `/projects`). Состояние раскрытия не персистится.
- **Push-уведомления (2026-05-27)** — VAPID + Web Push API. `task.remind_at` → Postgres trigger `sync_task_notification` создаёт строку в `notification`. Крон `/api/cron/push` каждые 5 мин (GitHub Actions — Vercel Hobby не даёт чаще раза в сутки) читает pending notifications и шлёт через `web-push`. SW обрабатывает `push` event. Подписка/отписка через `/api/push/subscribe`+`/unsubscribe`. UI: тоггл в `/settings`. `RemindAtPicker` в форме задачи — пресеты «10 мин / 1 час / 1 день в 9:00 / точно» + datetime-local.

---

## 💡 Идеи на будущее

### Высокий приоритет

| Идея | Заметка |
|------|---------|
| **Drag-and-drop в `/week`** | Перетаскивать задачи между днями |
| **Метки / теги** | Кросс-сферная классификация задач |
| **Перетаскивание задач между сферами** | Быстрая реорганизация |
| **Цели / OKR** | Сфера → Цель → Проект → Задача |
| **Оценка времени (estimated/actual minutes)** | Реализм планирования |
| **GTD-контексты** | @home, @work, @errands — кросс-сферный фильтр |

### Ученик (пользователь)

| Идея | Заметка |
|------|---------|
| Подзадачи в UI | Форма для `parent_id`, вложенный список |
| Поиск по задачам | Глобальный поиск по title |
| Фильтр по сфере в `/tasks` | Показать только задачи одной сферы |
| Архив выполненных | Отдельная страница done-задач |
| Комментарии к задаче | Заметки/лог в description |
| Экспорт в CSV | Все задачи за период |

### Вид

| Идея | Заметка |
|------|---------|
| Мобильный вид `/week` | Горизонтальный скролл на узких экранах |
| Тёмная/светлая тема | Переключатель |
| Цветовые метки задач | Помимо сферы |

### Технический долг

| Идея | Заметка |
|------|---------|
| Middleware → proxy файл | Next.js 16 deprecated warning |
| local-first для /today /week /month | Аудит 17.07: sphere/project уже в Dexie, а страницы ходят на сервер. Перевод = мгновенная навигация + оффлайн + чинит TZ-баг бакетинга (month/page.tsx:74 — UTC-сервер кладёт задачу 00:30 МСК в чужую клетку). Задача в планере |
| processOverdueTasks → cron | Аудит 17.07: сейчас write-on-read при каждом открытии today/week/month. Задача в планере |
| Главная на дизайн-систему | Аудит 17.07: 200 строк инлайн-стилей мимо PageShell/Section. Задача в планере |
| Тесты (Playwright) | E2E smoke test |
| Логирование ошибок (Sentry) | Аналогично AfroLatin |
| Пагинация inbox | При большом количестве записей |
