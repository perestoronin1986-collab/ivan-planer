---
area: design
status: shipped
deployed: true
migration:
updated: 2026-05-26
tags:
  - feature
---
# Дизайн-система (единые экраны)

> [!info] Статус
> **Область:** design · **Статус:** в проде · **Деплой:** да

## Суть
Токены в `globals.css` + `@theme inline` (фиолетовая brand-палитра, радиусы, тени). UI-компоненты `src/components/ui/`: PageShell, Section, Tile, ActionButton, Chip, EmptyState, formStyles. Все внутренние экраны унифицированы.

> [!tip] Правило
> Любая новая страница → `PageShell` + `Section`, никогда `<div className="bg-white border">`. Дизайн-систему фиксировать ДО фич.

## Связи
- Гайд: [[DESIGN]] · превью `design-unified.html`
- Урок разнобоя: [[ERRORS]]
