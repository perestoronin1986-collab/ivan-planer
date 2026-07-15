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
VAPID + Web Push API. `task.remind_at` → Postgres trigger `sync_task_notification` создаёт строку в `notification`. GitHub Actions cron (`.github/workflows/cron-push.yml`, `*/5`) дёргает `/api/cron/push`, тот шлёт pending через `web-push`. SW обрабатывает `push`. Крон вынесен в Actions, потому что Vercel Hobby не даёт чаще раза в сутки — см. [[ARCHITECTURE]].

## Реализация
- Подписка/отписка `/api/push/subscribe`+`/unsubscribe`, тоггл в `/settings`
- `RemindAtPicker` — пресеты «10 мин / 1 час / 1 день в 9:00 / точно» + datetime-local

## Связи
- Схема: [[DATABASE]]
