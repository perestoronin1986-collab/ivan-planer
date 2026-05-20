# Архитектура IvanPlaner

> Последнее обновление: 2026-05-20

## Стек

| Слой | Технология |
|------|-----------|
| Фреймворк | Next.js 16 App Router, TypeScript |
| UI | Tailwind CSS v4, lucide-react |
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
```

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
| `week/WeekDayColumn.tsx` | Колонка дня в недельной сетке с кнопкой `+` |
| `components/SphereSelectorForm.tsx` | Форма выбора сферы |
| `components/OverdueActionSelect.tsx` | Селект "что делать при просрочке" |
