---
area: habits
status: shipped
deployed: true
migration: "0006"
updated: 2026-06-02
tags:
  - feature
---
# Числовые привычки

> [!info] Статус
> **Область:** habits · **Статус:** в проде · **Миграция:** 0006_numeric_habits

> [!warning] Миграция вручную
> `0006_numeric_habits` — применить через Supabase SQL Editor (RPC дополнены новыми колонками). Проверить применение.

## Суть
Тип привычки `numeric`: число за день (вес и т.п.), без дневной цели. `habit.type` (binary/numeric) + `habit.unit`, `habit_log.value`.

## Реализация
- UI: «Тип отметки» + «Единица» при создании; ввод в «Сегодня»; число в клетке «Недели» (`prompt()`); в «Статистике» — последнее/мин/макс/среднее + sparkline
- Мутация `setHabitValueLocal`, `numericStats`/`numericSeries` в `stats.ts`. Dexie bump не нужен.

## Связи
- Базовые привычки: [[Features/habits]]
