---
area: pwa
status: shipped
deployed: true
migration:
updated: 2026-05-21
tags:
  - feature
---
# Offline / PWA (local-first)

> [!info] Статус
> **Область:** pwa · **Статус:** в проде, смоук-тест пройден · **Деплой:** да (Vercel)

## Суть
Local-first: Dexie (IndexedDB) + outbox + sync engine (LWW по `updated_at`, soft delete `deleted_at`). Service Worker (precache, network-first navigations, cache-first static, `/offline` fallback). Manifest + иконки 192/512.

## Реализация
- Мутации tasks/inbox/sphere/project через local mutations API
- Уроки: dead-letter outbox, Dexie null-фильтр, PWA public paths, SW VERSION bump — см. [[ERRORS]]

## Связи
- Схема: [[DATABASE]]
- Баги: [[ERRORS]]
