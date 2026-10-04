---
project: IvanPlaner
type: Планер задач
stack: Next.js 16, Supabase Postgres (PostgREST, self-hosted), VPS Timeweb
prod: https://plan.afrolatin.ru (VPS, autodeploy main)
repo: https://github.com/perestoronin1986-collab/ivan-planer
updated: 2026-10-04
tags:
  - moc
aliases:
  - IvanPlaner
---
# IvanPlaner — Wiki

Персональный планер задач с иерархией: Сферы → Проекты → Задачи.

## Навигация

| Раздел | Описание |
|--------|---------|
| [[ARCHITECTURE]] | Стек, маршруты, слой данных, server actions |
| [[DATABASE]] | Схема БД (Drizzle + Supabase Postgres) |
| [[BACKLOG]] | Запланированные фичи + реализованное |
| [[CHANGELOG]] | История изменений |
| [[DESIGN]] | Дизайн-система: токены, UI-компоненты |
| [[ERRORS]] | Допущенные ошибки и уроки — чтобы не повторять |
| [INTEGRATION](../../all/INTEGRATION.md) | Схема экосистемы: CRM ↔ ЛК ↔ Сайт + место Планера в ней. Общий файл в `Projects/all/`, вне этого vault |
| `Features/` | Заметки по фичам (кормят [[Status.base]]) |

## 🔧 Статус фич (Bases)
Дэшборд из `Features/`. Виды: миграция/деплой · очередь · все.

![[Status.base]]

## Ключевые фичи
- [[Features/offline-pwa|Offline/PWA]] · [[Features/habits|Привычки]] · [[Features/numeric-habits|Числовые привычки]]
- [[Features/push-notifications|Push]] · [[Features/priorities|Приоритеты]] · [[Features/design-system|Дизайн-система]]
- [[Features/frozen-tasks|Заморозка задач]] — вкладка «❄ Заморожено» на `/today`
- [[Features/voice-inbox|Голосовой инбокс]] — диктовка 🎤 на `/inbox` + ярлык PWA «Записать мысль»
- Очередь: [[Features/dnd-week|DnD в /week]] · [[Features/okr-goals|Цели/OKR]]

## Быстрый старт

```bash
npm run dev          # http://localhost:3000
npm run db:generate  # drizzle-kit generate (после правки schema.ts)
npm run db:migrate   # drizzle-kit migrate (применить миграцию)
```

> [!warning] Миграции — вручную
> Миграции применяются вручную, автоматом их нет. С 2026-10-04 — в БД на VPS, а не в Supabase SQL Editor: SSH-туннель `ssh -L 15433:127.0.0.1:5433 root@147.45.253.77`, затем `psql` на `127.0.0.1:15433` (пароль `postgres` — в `/opt/planer-db/.env` на сервере). Перед деплоем фичи с БД — проверить, что миграция применена. См. [[Status.base]] колонку «Миграция».
>
> Облачная база `zrxineexwmucsoyttwrx` — только откат до ~01.11.2026; миграции туда больше не катить.

## Продакшн

- **URL:** https://plan.afrolatin.ru. Старый `ivan-planer.vercel.app` редиректит все пути сюда (`vercel.json` → `redirects`).
- **Хостинг:** VPS Timeweb `147.45.253.77` (Москва, тот же сервер, что CRM, ЛК и сайт). С 2026-10-04 ~23:05 МСК; до этого — Vercel + облачный Supabase.
- **Деплой:** автодеплой при push в `main` — `.github/workflows/deploy-vps.yml`; руками: Actions → Deploy VPS → Run workflow. Подробности и откат — [[ARCHITECTURE#Инфраструктура (VPS)]].
- **БД:** свой минимальный Supabase в Docker, `/opt/planer-db` на VPS (Postgres на 127.0.0.1:5433).
- **Откат:** Vercel-проект и облачная БД `zrxineexwmucsoyttwrx` оставлены до ~01.11.2026, потом удалить (решает владелец).
- **Репозиторий:** https://github.com/perestoronin1986-collab/ivan-planer

## Переменные окружения

Прод: `/opt/planer/shared/.env.production` на VPS (640 root:planer). Локально: `.env.local` (разработка, смотрит на **облачную копию** — задачи, записанные туда, никуда не попадают) и `.env.planer` (CLI `npm run planer`, смотрит на прод).

| Переменная | Описание |
|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://plan.afrolatin.ru` — браузер ходит в Supabase через nginx на том же домене |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon ключ для PostgREST |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role: крон читает все строки мимо RLS |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY` | Публичный VAPID-ключ (клиент и сервер) |
| `VAPID_PRIVATE_KEY` | Приватный VAPID-ключ |
| `VAPID_SUBJECT` | `https://plan.afrolatin.ru` |
| `CRON_SECRET` | Bearer для `/api/cron/push` |

Секреты БД (JWT secret, пароль postgres, ключи) — `/opt/planer-db/.env` (600), сгенерированы на сервере `gen-keys.mjs`.
