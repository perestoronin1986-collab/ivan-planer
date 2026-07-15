---
area: habits
status: shipped
deployed: true
migration: "0005"
updated: 2026-06-01
tags:
  - feature
---
# Привычки

> [!info] Статус
> **Область:** habits · **Статус:** в проде · **Миграция:** 0005_habits

> [!warning] Миграция вручную
> `drizzle/0005_habits.sql` — применить через Supabase SQL Editor (не автоматом). Проверить, что применена.

## Суть
Раздел `/habits`. Таблицы `habit` (kind build/quit, frequency daily/weekly, target_per_week 1..7) + `habit_log` (отметка по дню). Вкладки: 🔥Сегодня / 📅Неделя / 📊Статистика (heatmap 13 нед) / ➕Новая.

## Реализация
- Dexie v4, sync engine + LWW RPC `upsert_habit*_if_newer`
- Мутации `addHabitLocal/updateHabitLocal/deleteHabitLocal/toggleHabitLogLocal`
- Серии/проценты/heatmap на клиенте (`src/app/habits/stats.ts`)

## Связи
- Числовые: [[Features/numeric-habits]]
- SQL Editor: `reference_supabase_sql` (память)
