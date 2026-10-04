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
VAPID + Web Push API. `task.remind_at` → Postgres trigger `sync_task_notification` создаёт строку в `notification`. Системный крон на VPS (`/etc/cron.d/planer`, каждые 5 мин, с 2026-10-04) дёргает `/api/cron/push`, тот шлёт pending через `web-push`. Раньше крон был снаружи (cron-job.org + GitHub Actions + Vercel) из-за лимитов Vercel Hobby; GitHub `*/5` давал по факту раз в час, см. [[ERRORS]]. При переезде VAPID-ключи сгенерированы заново — подписки переоформлены. SW обрабатывает `push`. Схема — [[ARCHITECTURE]].

## Реализация
- Подписка/отписка `/api/push/subscribe`+`/unsubscribe`, тоггл в `/settings`
- `RemindAtPicker` — пресеты «10 мин / 1 час / 1 день в 9:00 / точно» + datetime-local

## Связи
- Схема: [[DATABASE]]
