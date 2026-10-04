<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# IvanPlaner — персональный планер

Иерархия: Сферы → Проекты → Задачи, плюс инбокс, привычки и push-напоминания. Проект стоит в стороне от связки CRM ↔ ЛК ↔ Сайт: данными не связан ни с кем, но ведёт учёт работ по всем трём — задачи по ним заводятся сюда.

**Общение в этом проекте — только на русском.** Код, коммиты, комментарии, ответы.

## Где что искать

| Вопрос | Куда |
|---|---|
| Стек, маршруты, слой данных, sync | `wiki/ARCHITECTURE.md` |
| На чём уже обжигались | `wiki/ERRORS.md` — **читать перед правкой чужого кода** |
| Схема БД | `wiki/DATABASE.md` |
| Токены и UI-компоненты | `wiki/DESIGN.md` |
| Статус фич, что ждёт миграции или деплоя | `wiki/HOME.md` → `Status.base` (Bases по `Features/`) |
| «Где определён X», «кто зовёт Y» | `graphify explain "X"` по графу в `graphify-out/` — дешевле, чем Grep + Read |

## Запуск

```bash
npm run dev          # http://localhost:3000
npm run db:generate  # drizzle-kit generate — после правки src/db/schema.ts
npm run db:migrate   # drizzle-kit migrate
npm run planer          # CLI задач: task / project / done / list (без аргументов печатает справку)
```

## Стек — и две вещи, которые выглядят не так, как называются

- **Next.js 16** App Router, React 19, TypeScript, Tailwind **v4** (палитра в `@theme`), lucide-react.
- **Supabase** (свой, в Docker на VPS): Auth (вход по паролю, не magic link) + Postgres **через PostgREST** (`@supabase/supabase-js`).
- **Drizzle — только схема.** Runtime удалён: `src/db/schema.ts` + drizzle-kit существуют ради миграций, ни один запрос через drizzle не идёт. Все данные — `createClient()`. Прямой TCP к облачному Supabase (5432/6543) из России не проходил, поэтому PostgREST не «вкусовщина», а единственный рабочий путь.
- **Local-first.** UI читает из Dexie (IndexedDB) через `useLiveQuery`, мутации идут **только через `@/lib/local/mutations`** и падают в outbox-очередь, фоновый sync-engine гоняет их в Supabase. Прямой Supabase допустим лишь в `src/lib/local/sync.ts`. LWW по `updated_at`, удаление мягкое через `deleted_at`. Новую таблицу заводить — значит трогать и Dexie-схему (`src/lib/local/db.ts`, версионируется), и sync.

## Правила, которые ловили руками

- **Даты сравнивать только через `new Date(x).getTime()`.** Supabase отдаёт `+00:00`, JS пишет `.000Z` — лексикографическое сравнение ISO-строк врёт.
- **`<input type="datetime-local">` никогда не отдавать в БД напрямую** — возвращает локальную строку без таймзоны. Только через `toIso()`.
- **Любой мутирующий server action → `revalidatePath`** на все затронутые маршруты. Забыли один раз — чекбокс задачи не обновлялся до ручного refresh.
- **Генерация массива из пользовательского ввода — всегда с лимитом сверху** (у recurring-задач кап 500 вхождений).
- **Dexie не индексирует `null`.** `.where(x).equals(null)` падает — фильтровать после `toArray()`.

## Миграции и прод

- Прод с 2026-10-04: **VPS Timeweb, https://plan.afrolatin.ru**, автодеплой из `main` (`.github/workflows/deploy-vps.yml`, откат автоматический). Vercel и облачный Supabase `zrxineexwmucsoyttwrx` — только откат до ~01.11.2026. БД — свой Supabase в Docker (`/opt/planer-db`); браузер ходит в него через nginx на том же домене.
- Миграции применяются **вручную в БД на VPS** (SSH-туннель `-L 15433:127.0.0.1:5433`, пароль postgres в `/opt/planer-db/.env`), не через SQL Editor. Перед деплоем фичи, трогающей БД, — убедиться, что миграция реально применена; статус ведётся в `Status.base`, колонка «Миграция».
- **Два env-файла локально:** `.env.planer` — прод (его читает `npm run planer`, печатает `→ plan.afrolatin.ru`); `.env.local` — облачная копия, только для `npm run dev`. Задачи, записанные в копию, никуда не попадают.
- **Крон push-уведомлений** — `/etc/cron.d/planer` на VPS, каждые 5 мин, бьёт в `127.0.0.1:3002/api/cron/push` с `Bearer CRON_SECRET`. cron-job.org, GitHub Actions и `vercel.json`-крон убраны.
- Бэкапы БД: на сервере ночной дамп 01:45 МСК (`/var/backups/planer/`), ПК забирает его `scripts/backup/pull-vps-backup.ps1` (Планировщик, 09:00). Старый репо `ivanplaner-backups` — архив 23.08–04.10.
- Устройство VPS, nginx, откат — `wiki/ARCHITECTURE.md`, раздел «Инфраструктура (VPS)».

## После работы

Обновлять `wiki/` в той же сессии: `Features/<фича>.md` — статус, миграция, деплой; `ARCHITECTURE.md` — если поменялось решение или появился паттерн; `ERRORS.md` — если что-то сломалось и починилось. Пересказ кода в вики не нужен — для «что где лежит» есть граф.
