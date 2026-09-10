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
- **Supabase**: Auth (magic link) + Postgres **через PostgREST** (`@supabase/supabase-js`).
- **Drizzle — только схема.** Runtime удалён: `src/db/schema.ts` + drizzle-kit существуют ради миграций, ни один запрос через drizzle не идёт. Все данные — `createClient()`. Прямой TCP к Supabase (5432/6543) из России не проходит, поэтому PostgREST не «вкусовщина», а единственный рабочий путь.
- **Local-first.** UI читает из Dexie (IndexedDB) через `useLiveQuery`, мутации идут **только через `@/lib/local/mutations`** и падают в outbox-очередь, фоновый sync-engine гоняет их в Supabase. Прямой Supabase допустим лишь в `src/lib/local/sync.ts`. LWW по `updated_at`, удаление мягкое через `deleted_at`. Новую таблицу заводить — значит трогать и Dexie-схему (`src/lib/local/db.ts`, версионируется), и sync.

## Правила, которые ловили руками

- **Даты сравнивать только через `new Date(x).getTime()`.** Supabase отдаёт `+00:00`, JS пишет `.000Z` — лексикографическое сравнение ISO-строк врёт.
- **`<input type="datetime-local">` никогда не отдавать в БД напрямую** — возвращает локальную строку без таймзоны. Только через `toIso()`.
- **Любой мутирующий server action → `revalidatePath`** на все затронутые маршруты. Забыли один раз — чекбокс задачи не обновлялся до ручного refresh.
- **Генерация массива из пользовательского ввода — всегда с лимитом сверху** (у recurring-задач кап 500 вхождений).
- **Dexie не индексирует `null`.** `.where(x).equals(null)` падает — фильтровать после `toArray()`.

## Миграции и прод

- Деплой: **Vercel, автодеплой из `main`**. БД: Supabase `zrxineexwmucsoyttwrx` (eu-central-1).
- Часть миграций применяется **вручную через Supabase SQL Editor**. Перед деплоем фичи, трогающей БД, — убедиться, что миграция реально применена; статус ведётся в `Status.base`, колонка «Миграция».
- **Крон push-уведомлений живёт вне Vercel** (Hobby даёт максимум раз в сутки): основной драйвер — cron-job.org каждые 5 мин, резерв — GitHub Actions раз в час, последняя подстраховка — `vercel.json` раз в сутки. Все трое бьют в `/api/cron/push` с `Bearer CRON_SECRET`. Меняешь секрет — меняешь в трёх местах.
- Бэкапы БД: ежедневный `pg_dump` в 06:00 МСК в приватный репозиторий `ivanplaner-backups`, отдельно от этого проекта.

## После работы

Обновлять `wiki/` в той же сессии: `Features/<фича>.md` — статус, миграция, деплой; `ARCHITECTURE.md` — если поменялось решение или появился паттерн; `ERRORS.md` — если что-то сломалось и починилось. Пересказ кода в вики не нужен — для «что где лежит» есть граф.
