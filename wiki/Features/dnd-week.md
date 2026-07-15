---
area: week
status: planned
deployed: false
migration:
updated: 2026-06-02
tags:
  - feature
---
# Drag-and-drop в /week

> [!info] Статус
> **Область:** week · **Статус:** в очереди (высокий приоритет) · **Деплой:** нет

## Суть
Перетаскивать задачи между днями недели.

> [!caution] Тех.долг
> `order` колонка int — при drag-and-drop потребуется fractional indexing (`order: 1.5`). См. [[ERRORS]] (тех.долг).

## Связи
- Бэклог: [[BACKLOG]]
