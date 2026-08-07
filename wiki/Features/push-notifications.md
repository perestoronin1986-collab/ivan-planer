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
VAPID + Web Push API. `task.remind_at` → Postgres trigger `sync_task_notification` создаёт строку в `notification`. Внешний крон cron-job.org (каждые 5 мин) дёргает `/api/cron/push`, тот шлёт pending через `web-push`. GitHub Actions (`.github/workflows/cron-push.yml`, `23 * * * *`) остался резервом — раньше был основным с `*/5`, но GitHub давал по факту раз в час, см. [[ERRORS]]. SW обрабатывает `push`. Крон вынесен в Actions, потому что Vercel Hobby не даёт чаще раза в сутки — см. [[ARCHITECTURE]].

## Реализация
- Подписка/отписка `/api/push/subscribe`+`/unsubscribe`, тоггл в `/settings`
- `RemindAtPicker` — пресеты «10 мин / 1 час / 1 день в 9:00 / точно» + datetime-local

## Связи
- Схема: [[DATABASE]]
