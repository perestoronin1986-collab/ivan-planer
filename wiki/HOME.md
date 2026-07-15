---
project: IvanPlaner
type: Планер задач
stack: Next.js 16, Supabase Postgres (PostgREST), Vercel
prod: Vercel (autodeploy main)
repo: https://github.com/perestoronin1986-collab/ivan-planer
updated: 2026-06-02
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
- Очередь: [[Features/dnd-week|DnD в /week]] · [[Features/okr-goals|Цели/OKR]]

## Быстрый старт

```bash
npm run dev          # http://localhost:3000
npm run db:generate  # drizzle-kit generate (после правки schema.ts)
npm run db:migrate   # drizzle-kit migrate (применить миграцию)
```

> [!warning] Миграции — вручную
> Часть миграций (habits `0005`, numeric `0006`) применяются вручную через Supabase SQL Editor. Перед деплоем фичи с БД — проверить, что миграция применена. См. [[Status.base]] колонку «Миграция».

## Продакшн

- **Деплой:** Vercel (автодеплой из ветки `main`)
- **БД:** Supabase Postgres `zrxineexwmucsoyttwrx` (eu-central-1, Frankfurt)
- **Репозиторий:** https://github.com/perestoronin1986-collab/ivan-planer

## Переменные окружения

| Переменная | Описание |
|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase проекта |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon ключ для PostgREST |
