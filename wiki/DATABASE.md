# База данных

> Схема: `src/db/schema.ts` (Drizzle ORM)  
> СУБД: Supabase Postgres `zrxineexwmucsoyttwrx`  
> Миграции: `drizzle-kit` → `npm run db:generate && npm run db:migrate`

---

## Таблицы

### `sphere` — Сферы жизни

| Колонка | Тип | Описание |
|---------|-----|---------|
| `id` | uuid PK | авто |
| `user_id` | uuid | владелец |
| `name` | text | название |
| `color` | text | hex-цвет, по умолчанию `#6366f1` |
| `icon` | text? | emoji иконка |
| `order` | int | порядок отображения |
| `archived` | bool | архивирована |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | LWW marker, auto-bump триггером |
| `deleted_at` | timestamptz? | soft delete |

Индексы: `sphere_user_idx` на `user_id`, `sphere_updated_idx` на `(user_id, updated_at)`

---

### `project` — Проекты

| Колонка | Тип | Описание |
|---------|-----|---------|
| `id` | uuid PK | авто |
| `user_id` | uuid | владелец |
| `sphere_id` | uuid FK→sphere | cascade delete |
| `name` | text | название |
| `description` | text? | |
| `status` | enum | `active` / `paused` / `done` / `archived` |
| `order` | int | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | LWW marker |
| `deleted_at` | timestamptz? | soft delete |

Индексы: `project_user_idx`, `project_sphere_idx`, `project_updated_idx` на `(user_id, updated_at)`

---

### `task` — Задачи

| Колонка | Тип | Описание |
|---------|-----|---------|
| `id` | uuid PK | авто |
| `user_id` | uuid | владелец |
| `sphere_id` | uuid? FK→sphere | cascade delete |
| `project_id` | uuid? FK→project | cascade delete |
| `parent_id` | uuid? FK→task | cascade delete (подзадача или вхождение rrule) |
| `title` | text | |
| `description` | text? | |
| `status` | enum | `todo` / `doing` / `done` |
| `due_at` | timestamptz? | срок |
| `remind_at` | timestamptz? | напоминание |
| `rrule` | text? | строка RRule (только у шаблона) |
| `rrule_until` | timestamptz? | конец rrule |
| `order` | int | |
| `priority` | int | 1..4 (1=urgent, 4=none, default 4) |
| `carry_count` | int | кол-во переносов (overdue reschedule) |
| `completed_at` | timestamptz? | когда выполнена |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | LWW marker |
| `deleted_at` | timestamptz? | soft delete |

Индексы: `task_user_idx`, `task_project_idx`, `task_sphere_idx`, `task_parent_idx`, `task_due_idx`, `task_priority_idx` на `(user_id, priority, due_at)`, `task_updated_idx` на `(user_id, updated_at)`

Constraint: `task_context_chk` — хотя бы один из `sphere_id`, `project_id`, `parent_id` NOT NULL; `task_priority_chk` — `priority BETWEEN 1 AND 4`

---

### `inbox_item` — Inbox

| Колонка | Тип | Описание |
|---------|-----|---------|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `content` | text | текст записи |
| `processed_at` | timestamptz? | когда обработана |
| `converted_task_id` | uuid? FK→task | set null on delete |
| `converted_sphere_id` | uuid? FK→sphere | set null on delete |
| `converted_project_id` | uuid? FK→project | set null on delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | LWW marker |
| `deleted_at` | timestamptz? | soft delete |

Индексы: `inbox_user_idx`, `inbox_updated_idx` на `(user_id, updated_at)`

---

### `habit` — Привычки

| Колонка | Тип | Описание |
|---------|-----|---------|
| `id` | uuid PK | |
| `user_id` | uuid | владелец |
| `name` | text | название |
| `icon` | text? | emoji |
| `color` | text | hex-цвет, default `#6366f1` |
| `kind` | enum | `build` (формировать) / `quit` (отказ), default `build` |
| `frequency` | enum | `daily` / `weekly`, default `daily` |
| `target_per_week` | int | цель раз/нед (daily=7), default 7 |
| `order` | int | |
| `archived` | bool | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | LWW marker |
| `deleted_at` | timestamptz? | soft delete |

Индексы: `habit_user_idx`, `habit_updated_idx` на `(user_id, updated_at)`. Constraint `habit_target_chk` — `target_per_week BETWEEN 1 AND 7`.

---

### `habit_log` — Отметки выполнения привычки

| Колонка | Тип | Описание |
|---------|-----|---------|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `habit_id` | uuid FK→habit | cascade delete |
| `date` | text | день отметки, `yyyy-mm-dd` (локальный) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | LWW marker |
| `deleted_at` | timestamptz? | soft delete |

Индексы: `habit_log_user_idx`, `habit_log_habit_idx`, `habit_log_date_idx` на `(user_id, date)`, `habit_log_updated_idx` на `(user_id, updated_at)`.

Отметка дня = строка `habit_log` для `(habit_id, date)`; снятие = удаление строки (soft delete на сервере). Серии/heatmap/проценты считаются на клиенте (`src/app/habits/stats.ts`). Уникального ограничения на `(habit_id, date)` нет — Dexie-индекс `[habit_id+date]` гарантирует один лог на день при тоггле.

---

### `push_subscription` — Push-подписки

| Колонка | Тип | Описание |
|---------|-----|---------|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `endpoint` | text UNIQUE | Web Push endpoint |
| `p256dh` | text | ключ шифрования |
| `auth` | text | ключ авторизации |
| `created_at` | timestamptz | |

Индекс: `push_user_idx`

---

### `notification` — Уведомления

| Колонка | Тип | Описание |
|---------|-----|---------|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `task_id` | uuid FK→task | cascade delete |
| `fire_at` | timestamptz | когда отправить |
| `sent_at` | timestamptz? | когда отправлено |
| `created_at` | timestamptz | |

Индексы: `notif_user_idx`, `notif_fire_idx` на `(fire_at, sent_at)`

---

## Триггеры

`set_updated_at()` — `BEFORE UPDATE` на `sphere`, `project`, `task`, `inbox_item`, `habit`, `habit_log`. Перед каждым `UPDATE` пишет `NEW.updated_at = now()`. Нужен для LWW-синхронизации (см. ARCHITECTURE → Offline / PWA).

`sync_task_notification()` — `AFTER INSERT OR UPDATE` на `task`. Зеркалит `task.remind_at` → строка `notification(fire_at)`. Удаляет уведомление при done/delete/clearing `remind_at`. См. ARCHITECTURE → Push-уведомления.

---

## RLS политики

На всех таблицах: `user_id = auth.uid()` — пользователь видит только свои данные.

## Каскады

```
sphere → project → task → task (подзадачи)
                 ↗
inbox_item (set null при удалении)
```
