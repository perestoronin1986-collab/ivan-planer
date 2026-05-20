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

Индекс: `sphere_user_idx` на `user_id`

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

Индексы: `project_user_idx`, `project_sphere_idx`

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
| `carry_count` | int | кол-во переносов (overdue reschedule) |
| `completed_at` | timestamptz? | когда выполнена |
| `created_at` | timestamptz | |

Индексы: `task_user_idx`, `task_project_idx`, `task_sphere_idx`, `task_parent_idx`, `task_due_idx`

Constraint: `task_context_chk` — хотя бы один из `sphere_id`, `project_id`, `parent_id` NOT NULL

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

Индекс: `inbox_user_idx`

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

## RLS политики

На всех таблицах: `user_id = auth.uid()` — пользователь видит только свои данные.

## Каскады

```
sphere → project → task → task (подзадачи)
                 ↗
inbox_item (set null при удалении)
```
