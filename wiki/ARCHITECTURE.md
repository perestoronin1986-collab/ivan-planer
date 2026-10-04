---
title: Архитектура IvanPlaner
updated: 2026-10-04
tags:
  - architecture
---
# Архитектура IvanPlaner

> [!tip] Навигация
> Схема → [[DATABASE]] · дизайн → [[DESIGN]] · уроки → [[ERRORS]] · статус фич → [[HOME]] + `Features/`.

> Последнее обновление: 2026-05-26

## Стек

| Слой | Технология |
|------|-----------|
| Фреймворк | Next.js 16 App Router, TypeScript |
| UI | Tailwind CSS v4 + brand-палитра в `@theme` (см. `wiki/DESIGN.md`), компоненты `src/components/ui/`, lucide-react |
| Auth | Supabase Auth (GoTrue), вход по паролю `signInWithPassword` |
| БД | Свой Supabase в Docker на VPS (Postgres + GoTrue + PostgREST), клиент — `@supabase/supabase-js` |
| Схема | Drizzle ORM — только `schema.ts` + drizzle-kit для миграций |
| Recurring | `rrule` — генерация дат повторяющихся задач |
| Валидация | Zod — в server actions |
| Деплой | VPS Timeweb: systemd `planer` + nginx, автодеплой из `main` через GitHub Actions (до 2026-10-04 — Vercel) |

> **Важно:** Drizzle runtime удалён. Все запросы — через `createClient()` (PostgREST), не через drizzle.

---

## Маршруты

```
/                          главная (ссылки на разделы)
/login                     вход (email + пароль)
/today                     задачи на сегодня + просроченные; вкладка «❄ Заморожено»
/week                      недельная сетка (7 колонок), навигация по неделям
/spheres                   список сфер жизни
/spheres/[sphereId]        сфера: проекты + задачи
/spheres/[sphereId]/projects/[projectId]  задачи проекта
/tasks                     все задачи (без фильтра по дате)
/inbox                     inbox — быстрые заметки → задачи
/habits                    привычки — вкладки Сегодня/Неделя/Статистика + создание
/projects                  все проекты
/auth/callback             OAuth callback Supabase
/api/push/subscribe        POST — сохранить push_subscription
/api/push/unsubscribe      POST — удалить push_subscription
/api/cron/push             крон на VPS (`/etc/cron.d/planer`) */5min — отправка Web Push по notification.fire_at
```

---

## Push-уведомления (2026-05-27)

Pipeline:

```
task.remind_at  ──trigger──▶  notification(fire_at, sent_at=null)
                                        │
                                        ▼
                    /etc/cron.d/planer каждые 5 мин на VPS  ◀── единственный драйвер
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

> [!important] Крон — системный, на VPS (изменено 2026-10-04)
> Раньше из-за лимитов Vercel Hobby (крон раз в сутки) эндпоинт дёргали снаружи тремя уровнями: cron-job.org (5 мин), GitHub Actions (час), `vercel.json` (сутки). С переездом на VPS это лишнее — настоящий крон есть на сервере.
> - **`/etc/cron.d/planer`, каждые 5 мин, пользователь `planer`:** POST на `http://127.0.0.1:3002/api/cron/push` (мимо nginx), `CRON_SECRET` достаётся из `.env.production` через `sed`, а не `source` — cron запускает `dash`.
> - cron-job.org отключён владельцем, `cron-push.yml` удалён, крон из `vercel.json` убран.
> - Таймзона сервера — UTC.
> - Снаружи `/api/cron/` закрыт в nginx (404).
>
> Двойной вызов безопасен: эндпоинт помечает `notification.sent_at`, уже отправленное пропускается.

> [!warning] Почему не GitHub Actions
> `schedule` в Actions при `*/5` давал по факту ~1 запуск в час (см. [[ERRORS]], 2026-08-07). Системный крон на своём сервере этой проблемы лишён.

- **VAPID**: env `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` + клиентский `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Генерация: `npm run vapid`.
- **CRON_SECRET**: проверяется в `/api/cron/push` через `Authorization: Bearer <secret>` или `?secret=`.
- **SUPABASE_SERVICE_ROLE_KEY**: нужен для cron (читает все строки минуя RLS). Если не задан — fallback на anon (только публичные данные).
- **Postgres trigger `sync_task_notification`** на `task` — при INSERT/UPDATE если `remind_at IS NOT NULL AND status != 'done' AND deleted_at IS NULL` создаёт/обновляет строку `notification`. При done/delete/clearing remind_at — удаляет.
- **iOS**: push работает только если PWA добавлен на главный экран (iOS 16.4+).
- **SW handler** в `public/sw.js`: `push` → `showNotification`, `notificationclick` → открыть `/today`.

---

## Авторизация

- Supabase Auth (GoTrue): вход **по паролю** (`signInWithPassword`). Magic link убран при переезде на VPS — в self-hosted GoTrue нет SMTP. Регистрация закрыта (`signup disabled`; в облаке была открыта). Пароль владелец задаёт на сервере: `ssh -t root@147.45.253.77 /opt/planer-db/set-password.sh <email>` (пароль идёт через stdin, не в чат и не в историю). После полного восстановления БД из дампа пароль станет тем, что был в дампе.
- Куки сессии — `sb-plan-auth-token` (домен один, CORS нет)
- `requireUser()` в `src/lib/supabase/server.ts` — проверяет сессию, редиректит на `/login`
- RLS на всех таблицах: `user_id = auth.uid()` — данные изолированы по пользователю
- Middleware (`src/middleware.ts`) — обновляет куки Supabase сессии на каждом запросе

---

## Инфраструктура (VPS)

С 2026-10-04 ~23:05 МСК прод — VPS Timeweb `147.45.253.77` (Москва, общий с CRM, ЛК и сайтом), https://plan.afrolatin.ru. Старый `ivan-planer.vercel.app` редиректит на новый домен (`vercel.json` → `redirects`).

> [!tip] Зачем переехали
> - **Доступность из России:** IP Vercel блокируются, а Supabase сидит за Cloudflare, который российские провайдеры душат.
> - **Независимость от Supabase Free:** пауза после 7 дней простоя, бэкапов нет.
> - **Настоящий крон** вместо трёх костылей.

**Раскладка**

| Что | Где |
|-----|-----|
| Приложение | `/opt/planer/releases/<sha>-<timestamp>`, симлинк `current`, systemd `planer` (User `planer`, не root, не pm2) на `127.0.0.1:3002` |
| Env приложения | `/opt/planer/shared/.env.production` (640 root:planer) |
| БД | свой минимальный Supabase в Docker, `/opt/planer-db`: supabase/postgres 17.6.1.127, GoTrue v2.197.0 (= версия облака), PostgREST v14.5 |
| Порты (только 127.0.0.1) | Postgres `:5433`, GoTrue `:9998`, PostgREST `:3012` |
| nginx | `/etc/nginx/sites-available/planer` = `scripts/vps/nginx-planer.conf` |
| Файлы стенда в репо | `scripts/vps/planer-db/`: `docker-compose.yml`, `db-restore.sh`, `set-password.sh`, `gen-keys.mjs`, `acl-check.sql`, `init/99-roles.sql` |

**Ключевое отличие от CRM.** У CRM в Supabase ходит только сервер, у планера — **браузер напрямую** (логин, Dexie-синк). Поэтому nginx отдаёт `/auth/v1/` и `/rest/v1/` на том же домене `plan.afrolatin.ru`: CORS не нужен, cookie общая. Стенд отдельный от `/opt/crm-db` (свой GoTrue, свой JWT secret, независимые обновления).

**Решения по БД**
- JWT secret **не** лежит настройкой БД (`app.settings.jwt_secret` убран): любой `current_setting()` смог бы его прочитать.
- `PGRST_DB_MAX_ROWS=1000` — как в облаке (измерено); синк тянет страницы по 1000.
- OpenAPI выключен, регистрация закрыта.
- Секреты — `/opt/planer-db/.env` (600), сгенерированы на сервере `gen-keys.mjs`.

**nginx**
- 404 на `/_next/image` (RCE GHSA-2xp9-vwfh-vxw4), на `/api/cron/` снаружи и на `/auth/v1/admin`.
- Лимит на `POST /auth/v1/token`: 10/мин, burst 5, ответ 429. Исключение — только точный `grant_type=refresh_token`. Map инвертирован намеренно: `$arg_grant_type` сырой, и белый список «password» обходился через `%70assword` (см. [[ERRORS]]). Location — regex `^/auth/v1/token/?$`.
- Security-заголовки; gzip включён и для `application/json` (без него первая синхронизация на мобильной сети не заканчивалась, см. [[ERRORS]]).

**Автодеплой.** Push в `main` → `.github/workflows/deploy-vps.yml` (tsc + lint) → `git archive | ssh` ключом с forced-command (секрет `VPS_DEPLOY_KEY`) → `/opt/planer/ci-deploy.sh` → `/opt/planer/deploy.sh`: сборка от пользователя `planer`, health check `/login`, авто-откат на прошлый релиз при провале. Руками: Actions → Deploy VPS → Run workflow.

**Service worker.** `isSupabaseRequest` теперь обходит и same-origin `/auth/v1/`, `/rest/v1/` — иначе runtime-кэш сложил бы личные ответы API. `VERSION = v8-same-origin-api-2026-10-04`.

**Бэкапы**
- Сервер: `/opt/planer/backup-db.sh`, 22:45 UTC (01:45 МСК) → `/var/backups/planer/planer_*.sql.gz`, 30 дней, `latest.sql.gz`.
- ПК: `scripts/backup/pull-vps-backup.ps1`, задача Планировщика Windows «IvanPlaner Backup», ежедневно 09:00 (`StartWhenAvailable`), в `Бэкап\` (в gitignore), 30 дней.
- Конфиги сервера (env планера, скрипты, `.env` стенда, unit systemd) входят в ночной архив конфигов VPS из репо CRM (`vps-config-backup.sh`).
- Старый workflow репо `ivanplaner-backups` отключён (облако больше не меняется); репо оставлен архивом 23.08–04.10.

**Обслуживание.** Раз в месяц вместе со стендом CRM: `cd /opt/planer-db && docker compose pull && docker compose up -d`.

**CLI задач.** `npm run planer` читает `.env.planer` (`PLANER_URL=https://plan.afrolatin.ru`, `PLANER_SERVICE_ROLE_KEY`) раньше `.env.local` и печатает целевой хост `→ plan.afrolatin.ru` в stderr. `.env.local` смотрит на облачную копию — только для локальной разработки.

> [!warning] Откат (до ~01.11.2026)
> Вернуть `vercel.json` и коммит с логином, включить `cron-push.yml` и cron-job.org, убрать `/etc/cron.d/planer`. Облачная БД цела, но без изменений, сделанных на VPS после 04.10 23:04 МСК. После ~01.11 Vercel-проект и облачный Supabase удалить (решает владелец).

Пуши: VAPID-ключи при переезде сгенерированы заново (в Vercel они были Sensitive, `vercel env pull` отдал пустые строки), старые подписки удалены, владелец подписался заново на новом домене.

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
- Замороженные (`frozen_at IS NOT NULL`) пропускаются: заморозка = «сейчас не делаю», автозакрытие тут сработало бы против пользователя

### Заморозка

Кнопка ❄ в строке задачи ставит `frozen_at`, задача уходит из «Просрочено»/«Активные» во вкладку «❄ Заморожено» на том же `/today`. Возврат — только руками (↩), автопробуждения по дате нет: оно вернуло бы шум в «Просрочено». Подробности — [[Features/frozen-tasks]].

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
| `src/lib/local/db.ts` | Dexie schema: 6 синхр. таблиц (sphere, project, task, inbox_item, habit, habit_log) + `outbox` + `outbox_dead` + `sync_meta`. Текущая версия v4 (v4 = habits) |
| `src/lib/local/sync.ts` | `runSync()`, `pushOutbox()`, `pullTable()`, `installSyncListeners()` |
| `src/lib/local/mutations.ts` | Local-first мутации: `addTaskLocal`, `updateTaskLocal`, `deleteTaskLocal`, `toggleTaskStatusLocal`, `addInboxItemLocal`, `addSphereLocal`, `addProjectLocal`, `processInboxToTaskLocal`, `addHabitLocal`, `updateHabitLocal`, `deleteHabitLocal`, `toggleHabitLogLocal` |
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

---

## Скрипты (dev)

`scripts/*.ts`, запуск через `tsx`. Работают вне Next.js — env читают сами (`dotenv` → `.env.local`).

| Скрипт | Команда | Зачем |
|--------|---------|-------|
| `vapid.ts` | `npm run vapid` | Сгенерировать VAPID-пару для push |
| `migrate.ts` | — | Прогон `drizzle/*.sql` напрямую (TCP; обычно недоступен, см. [[ERRORS]]) |
| `planer.ts` | `npm run planer -- <cmd>` | Завести/закрыть проект/задачу из CLI, минуя UI |

### `planer.ts`

Нужен, чтобы ассистент заводил задачи по другим проектам без ручного клика в UI. Пишет через **PostgREST + `SUPABASE_SERVICE_ROLE_KEY`** — RLS (`user_id = auth.uid()`) режет любой доступ без сессии, а прямой TCP к Postgres заблокирован. `user_id` берётся из найденной сферы/проекта, не из env.

```bash
npm run planer -- task "Заголовок" --project "CRM АфроЛатин" [--due 2026-07-20] [--priority 2] [--desc "..."]
npm run planer -- project "Имя" [--sphere "Работа с ИИ"] [--desc "..."]
npm run planer -- done "часть заголовка" [--project "..."]
npm run planer -- list [--project "..."]
```

> [!warning] Правила
> - Сфера/проект ищутся по имени (`ilike`) — при переименовании команды ломаются, это осознанный размен на удобство.
> - Даты только через `toIso()`; голая дата = 12:00 местного, чтобы не улетать в соседний день при конверсии в UTC.
> - **Любая правка строки — бампать `updated_at`.** Синк клиентов — LWW по `updated_at`; запись без бампа осядет в БД, но до открытых вкладок не доедет. `done` это делает, будущие команды обязаны тоже.
> - `done` при неоднозначном совпадении не трогает ничего, а печатает кандидатов: закрыть молча не ту задачу дороже, чем переспросить.
> - Скрипт работает мимо offline-слоя: пишет в Postgres напрямую, Dexie/outbox не трогает. Клиент подтянет запись обычным sync по `updated_at`.
