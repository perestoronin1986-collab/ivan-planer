# IvanPlaner — Wiki

Персональный планер задач с иерархией: Сферы → Проекты → Задачи.

## Навигация

| Раздел | Описание |
|--------|---------|
| [[ARCHITECTURE]] | Стек, маршруты, слой данных, server actions |
| [[DATABASE]] | Схема БД (Drizzle + Supabase Postgres) |
| [[BACKLOG]] | Запланированные фичи + реализованное |
| [[CHANGELOG]] | История изменений |

## Быстрый старт

```bash
npm run dev          # http://localhost:3000
npm run db:generate  # drizzle-kit generate (после правки schema.ts)
npm run db:migrate   # drizzle-kit migrate (применить миграцию)
```

## Продакшн

- **Деплой:** Vercel (автодеплой из ветки `main`)
- **БД:** Supabase Postgres `zrxineexwmucsoyttwrx` (eu-central-1, Frankfurt)
- **Репозиторий:** https://github.com/perestoronin1986-collab/ivan-planer

## Переменные окружения

| Переменная | Описание |
|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase проекта |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon ключ для PostgREST |
