---
area: tasks
status: shipped
deployed: true
migration:
updated: 2026-05-29
tags:
  - feature
---
# Приоритеты P1–P4

> [!info] Статус
> **Область:** tasks · **Статус:** в проде · **Деплой:** да

## Суть
`task.priority` 1..4 (default 4) + Dexie v3. `PrioritySelector` чипы, цветная левая полоска в `TaskItem`. Сортировка `/today` и `/tasks` — priority ASC, затем due_at. `/tasks/urgent` — секции P1/P2/P3.

## Связи
- Схема: [[DATABASE]]
