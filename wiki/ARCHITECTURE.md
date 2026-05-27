# Архитектура IvanPlaner

> Последнее обновление: 2026-05-26

## Стек

| Слой | Технология |
|------|-----------|
| Фреймворк | Next.js 16 App Router, TypeScript |
| UI | Tailwind CSS v4 + brand-палитра в `@theme` (см. `wiki/DESIGN.md`), компоненты `src/components/ui/`, lucide-react |
| Auth | Supabase Auth (magic link / email) |
| БД | Supabase Postgres через PostgREST (`@supabase/supabase-js`) |
| Схема | Drizzle ORM — только `schema.ts` + drizzle-kit для миграций |
| Recurring | `rrule` — генерация дат повторяющихся задач |
| Валидация | Zod — в server actions |
| Деплой | Vercel |

> **Важно:** Drizzle runtime удалён. Все запросы — через `createClient()` (PostgREST), не через drizzle.

---

## Маршруты

```
/                          главная (ссылки на разделы)
/login                     вход (Supabase magic link)
/today                     задачи на сегодня + просроченные
/week                      недельная сетка (7 колонок), навигация по неделям
/spheres                   список сфер жизни
/spheres/[sphereId]        сфера: проекты + задачи
/spheres/[sphereId]/projects/[projectId]  задачи проекта
/tasks                     все задачи (без фильтра по дате)
/inbox                     inbox — быстрые заметки → задачи
/projects                  все проекты
/auth/callback             OAuth callback Supabase
/api/push/subscribe        POST — сохранить push_subscription
/api/push/unsubscribe      POST — удалить push_subscription
/api/cron/push             Vercel Cron */5min — отправка Web Push по notification.fire_at
```

---

## Push-уведомления (2026-05-27)

Pipeline:

```
task.remind_at  ──trigger──▶  notification(fire_at, sent_at=null)
                                        │
                                        ▼
                               Vercel Cron каждые 5 мин
                                        │
                                        ▼
                             /api/cron/push → web-push.sendNotification()
                                        │
                                        ▼
                                  Service Worker (push event)
                                        │
                                        ▼
                              showNotification → user
```

- **VAPID**: env `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` + клиентский `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Генерация: `npm run vapid`.
- **CRON_SECRET**: проверяется в `/api/cron/push` через `Authorization: Bearer <secret>` или `?secret=`.
- **SUPABASE_SERVICE_ROLE_KEY**: нужен для cron (читает все строки минуя RLS). Если не задан — fallback на anon (только публичные данные).
- **Postgres trigger `sync_task_notification`** на `task` — при INSERT/UPDATE если `remind_at IS NOT NULL AND status != 'done' AND deleted_at IS NULL` создаёт/обновляет строку `notification`. При done/delete/clearing remind_at — удаляет.
- **iOS**: push работает только если PWA добавлен на главный экран (iOS 16.4+).
- **SW handler** в `public/sw.js`: `push` → `showNotification`, `notificationclick` → открыть `/today`.

---

## Авторизация

- Supabase Auth: magic link на email
- `requireUser()` в `src/lib/supabase/server.ts` — проверяет сессию, редиректит на `/login`
- RLS на всех таблицах: `user_id = auth.uid()` — данные изолированы по пользователю
- Middleware (`src/middleware.ts`) — обновляет куки Supabase сессии на каждом запросе

---

## Слой данных

### Клиент

```typescript
import { createClient } from "@/lib/supabase/server";   // server components / actions
import { createClient } from "@/lib/supabase/client";   // client components
```

### Паттерн запроса

```typescript
const supabase = await createClient();
const { data, error } = await supabase
  .from("task")
  .select("id, title, sphere:sphere_id(name, color, icon)")
  .eq("user_id", user.id)
  .returns<Row[]>();
```

### Embed-joins (PostgREST)

Связанные поля через FK запрашиваются синтаксисом `relation:foreign_key(fields)`:

```
sphere:sphere_id(name, color, icon)
project:project_id(name)
sphere:sphere_id(name, color, icon), project:project_id(name)
```

### Нюансы

- Поля БД в **snake_case** (`user_id`, `due_at`, `sphere_id`)
- Типы TypeScript в `src/lib/db.ts` — `SphereRow`, `ProjectRow`, `TaskRow` и т.д.
- `datetime-local` input → не ISO; конверсия через хелпер `toIso()` в `spheres/actions.ts`
- Supabase возвращает даты с `+00:00`, JS Date сравнивать только через `.getTime()`

---

## Server Actions

Все мутации — server actions (Next.js `"use server"`).

### `src/app/spheres/actions.ts`

| Action | Описание |
|--------|---------|
| `createSphere(fd)` | Создать сферу (name, color, icon) |
| `deleteSphere(id)` | Удалить сферу (cascade → проекты, задачи) |
| `createProject(fd)` | Создать проект, редирект на страницу проекта |
| `updateProjectSphere(id, newSphereId)` | Переместить проект в другую сферу |
| `toggleProjectDone(id, sphereId, done)` | Пометить проект выполненным |
| `deleteProject(id, sphereId)` | Удалить проект, редирект на сферу |
| `createTask(fd)` | Создать задачу (title, sphere, project, dueAt, overdueAction) |
| `toggleTask(id, done)` | Отметить задачу выполненной / снять |
| `deleteTask(id)` | Удалить задачу |
| `createRecurringTask(fd)` | Создать повторяющуюся задачу (rrule + вхождения) |

### `src/app/inbox/actions.ts`

| Action | Описание |
|--------|---------|
| `createInboxItem(fd)` | Добавить запись в inbox |
| `processInboxItem(fd)` | Конвертировать inbox → задача/проект/сфера |
| `deleteInboxItem(id)` | Удалить запись |

### `src/app/actions.ts`

| Action | Описание |
|--------|---------|
| `signOut()` | Выход из аккаунта |

---

## Повторяющиеся задачи

Паттерн: шаблон-задача (`status: "done"`, `rrule` строка) + N дочерних (`parent_id`, `due_at` на каждую дату).

Поддерживаемые паттерны:
- **weekly** — дни недели + интервал в неделях
- **monthly** — числа месяца + интервал в месяцах
- **interval** — каждые N дней

Лимит: 500 вхождений. При ошибке вставки вхождений — rollback шаблона.

---

## Просроченные задачи

`processOverdueTasks(supabase)` в `src/lib/processOverdueTasks.ts`:
- Вызывается на `/today` и `/week` при каждом рендере
- Задачи с `due_at < сегодня` и `status != done`:
  - `reschedule` → переносит на сегодня + инкремент `carry_count`
  - `autocomplete` → меняет `status: "done"`

---

## Иерархия данных

```
Sphere (сфера жизни)
  └── Project (проект)
        └── Task (задача)
              └── Task (подзадача, parent_id)
```

Constraint: у задачи обязан быть хотя бы один из: `sphere_id`, `project_id`, `parent_id`.

---

## Клиентские компоненты

| Файл | Назначение |
|------|-----------|
| `today/AddTaskModal.tsx` | Диалог создания задачи на сегодня |
| `today/AddRecurringTaskModal.tsx` | Диалог создания повторяющейся задачи |
| `week/WeekGrid.tsx` | Контейнер недели/выбранного дня. Один `useLiveQuery` на все колонки, индексный `between()` по `due_at`, передача `tasks/sphereById/projectById/subtasksByParentId` пропсами |
| `week/WeekDayColumn.tsx` | Презентационная колонка дня (без своих Dexie-запросов) с кнопкой `+` |
| `components/SphereSelectorForm.tsx` | Форма выбора сферы |
| `components/OverdueActionSelect.tsx` | Селект "что делать при просрочке" |
| `components/ServiceWorkerRegister.tsx` | Регистрация `/sw.js` + слушатель `RUN_OUTBOX_SYNC` |
| `components/SyncProvider.tsx` | `installSyncListeners()` на маунт top-level layout |
| `lib/local/useSubtasks.ts` | Хук `useSubtasksMap(parentIds)` — один `anyOf` запрос для всех subtasks. Заменяет per-task `useLiveQuery` в `TaskItem` |

---

## Offline / PWA

Local-first архитектура: UI читает из локального Dexie (IndexedDB), мутации идут в outbox-очередь, фоновый sync-engine двусторонне синхронизирует с Supabase. LWW по `updated_at`, soft delete через `deleted_at`.

### Слои

```
UI (useLiveQuery)  →  Dexie (IndexedDB)
                            ↓
                    outbox queue (FIFO)
                            ↓
                    sync engine (push + pull)
                            ↓
                    Supabase Postgres (PostgREST)
```

### Файлы

| Файл | Назначение |
|------|-----------|
| `src/lib/local/db.ts` | Dexie schema: 4 синхр. таблицы + `outbox` + `sync_meta` |
| `src/lib/local/sync.ts` | `runSync()`, `pushOutbox()`, `pullTable()`, `installSyncListeners()` |
| `src/lib/local/mutations.ts` | Local-first мутации: `addTaskLocal`, `updateTaskLocal`, `deleteTaskLocal`, `toggleTaskStatusLocal`, `addInboxItemLocal`, `addSphereLocal`, `addProjectLocal`, `processInboxToTaskLocal` |
| `src/lib/local/useUser.ts` | Хук получения `userId` из Supabase auth |
| `src/app/manifest.ts` | PWA manifest (`name`, `icons`, `display=standalone`) |
| `public/sw.js` | Service Worker: precache app shell + network-first navigations + cache-first static + push + background sync |
| `src/app/offline/page.tsx` | Fallback страница при оффлайне без кэша |

### Sync engine

**Push (outbox → Supabase):**
- Очередь FIFO, drain по `created_at`
- `upsert` для insert/update, `update {deleted_at: now()}` для delete
- При ошибке — `attempts++`, после 5 попыток лог в консоль, FIFO сохраняется (break цикла)
- Schema collapse: если для `[table+row_id]` уже есть entry — старый удаляется, новый пушится

**Pull (Supabase → Dexie):**
- Per-table: `select * where updated_at > last_sync_at:<table>` (limit 1000, ordered)
- Soft-deleted (`deleted_at != null`) → `bulkDelete` из Dexie
- Остальные → `bulkPut`
- `last_sync_at:<table>` в `sync_meta` KV store

**Триггеры запуска:**
- `online` event в window
- Custom event `ivanplaner:sync-outbox`
- SW background sync (`sync` event с тегом `outbox-sync`) → postMessage клиентам
- На маунт страниц через `installSyncListeners()`

### Service Worker стратегии

| Тип запроса | Стратегия |
|------------|-----------|
| Навигация (`mode: navigate`) | Network-first → shell-cache → `/offline` |
| Static (`/_next/static`, `/_next/image`, иконки, `.png/.svg/.css/.js`) | Cache-first |
| Same-origin GET | Network-first → runtime cache |
| Supabase API (`*.supabase.co`) | Bypass — sync engine разруливает |

Версия кэша в `VERSION` константе SW — при выкатке нового SW старые кэши удаляются на `activate`.

### Особенности

- **Auth оффлайн:** Supabase JWT кэширован в localStorage (~1ч), refresh без сети упадёт. Решение по необходимости — продлить срок сессии
- **Размер кэша:** app shell + иконки ~2-5 МБ, IndexedDB до 50 МБ на Android безопасно
- **Конфликты:** последняя запись по `updated_at` побеждает; field-level merge не делаем — один пользователь, конфликтов мало
