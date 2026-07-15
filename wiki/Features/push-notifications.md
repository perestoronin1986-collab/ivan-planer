---
area: push
status: shipped
deployed: true
migration:
updated: 2026-05-27
tags:
  - feature
---
# Push-уведомления

> [!info] Статус
> **Область:** push · **Статус:** в проде · **Деплой:** да

## Суть
VAPID + Web Push API. `task.remind_at` → Postgres trigger `sync_task_notification` создаёт строку в `notification`. Vercel Cron `/api/cron/push` каждые 5 мин шлёт pending через `web-push`. SW обрабатывает `push`.

## Реализация
- Подписка/отписка `/api/push/subscribe`+`/unsubscribe`, тоггл в `/settings`
- `RemindAtPicker` — пресеты «10 мин / 1 час / 1 день в 9:00 / точно» + datetime-local

## Связи
- Схема: [[DATABASE]]
