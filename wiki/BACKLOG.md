# Бэклог

> Последнее обновление: 2026-05-26

---

## ✅ Реализовано

- Авторизация Supabase Auth (magic link), RLS на всех таблицах
- Иерархия: Сферы → Проекты → Задачи → Подзадачи
- CRUD сфер (название, цвет, icon-emoji)
- CRUD проектов (привязка к сфере, перенос между сферами, статус done)
- CRUD задач (название, сфера, проект, срок, overdue action)
- `/today` — задачи на сегодня + просроченные (overdue section)
- `/week` — недельная сетка 7 колонок, навигация по неделям
- Кнопка `+` на каждом дне в `/week` → создание задачи с pre-filled датой
- Иконки сфер справа от задачи в `/week`
- `/inbox` — быстрые заметки, конвертация в задачу/проект/сферу
- `/tasks` — все задачи пользователя
- Повторяющиеся задачи (weekly / monthly / interval, rrule, лимит 500)
- `processOverdueTasks` — reschedule или autocomplete при просрочке
- `carry_count` — счётчик переносов задачи
- Валидация через Zod во всех server actions
- Деплой на Vercel, автодеплой из `main`
- **Offline / PWA** — Local-first: Dexie (IndexedDB) + outbox + sync engine (LWW по `updated_at`, soft delete `deleted_at`). Service Worker (precache, network-first navigations, cache-first static, /offline fallback). Manifest + иконки 192/512. tasks/inbox/sphere/project — мутации через local mutations API
- **Единый дизайн внутренних экранов (2026-05-26)** — дизайн-токены в `globals.css` (фиолетовая brand-палитра, радиусы, тени), UI-компоненты `src/components/ui/` (PageShell, Section, Tile, ActionButton, Chip, EmptyState, formStyles). Переведены: today, week, month, year, projects, projects/done, spheres, spheres/[id], spheres/[id]/projects/[id], tasks, recurring, inbox, search, done, settings + модалки AddTaskModal/AddRecurringTaskModal + OverdueActionSelect + SphereSelectorForm + ProjectsList. Гайд — `wiki/DESIGN.md`. Превью — `wiki/design-unified.html`.
- **Приоритеты P1-P4 (2026-05-27)** — `task.priority` 1..4 в БД (default 4) + Dexie v3. UI: `PrioritySelector` чипы в AddTaskModal/TaskDetailsModal, цветная левая полоска в `TaskItem` (красный/оранж/синий/серый). Сортировка в `/today` и `/tasks` — по priority ASC, потом due_at.
- **Описание задачи + автоссылки (2026-05-27)** — поле `description` в форме (textarea), `AutoLinkText` рендерит URL как `<a target=_blank>`. Превью первой строки под title в списке + развёртывание по клику.
- **Плашка «Срочные задачи» (2026-05-27)** — на главной в блоке «Задачи» 4-я плашка `/tasks/urgent`, фильтр `priority === 1`, размер как тайлы Структура/Планирование. Новая страница `src/app/tasks/urgent/page.tsx`.
- **Срочные: секции P2 и P3 (2026-05-29)** — `/tasks/urgent` показывает три секции (P1/P2/P3) вместо одной. `byPriority(1|2|3)`, цвета из `PRIORITY_OPTIONS`. Подзаголовок `N P1 · N P2 · N P3`.
- **Push-уведомления (2026-05-27)** — VAPID + Web Push API. `task.remind_at` → Postgres trigger `sync_task_notification` создаёт строку в `notification`. Vercel Cron `/api/cron/push` каждые 5 мин читает pending notifications и шлёт через `web-push`. SW обрабатывает `push` event. Подписка/отписка через `/api/push/subscribe`+`/unsubscribe`. UI: тоггл в `/settings`. `RemindAtPicker` в форме задачи — пресеты «10 мин / 1 час / 1 день в 9:00 / точно» + datetime-local.

---

## 💡 Идеи на будущее

### Высокий приоритет

| Идея | Заметка |
|------|---------|
| **Drag-and-drop в `/week`** | Перетаскивать задачи между днями |
| **Метки / теги** | Кросс-сферная классификация задач |
| **Перетаскивание задач между сферами** | Быстрая реорганизация |
| **Цели / OKR** | Сфера → Цель → Проект → Задача |
| **Оценка времени (estimated/actual minutes)** | Реализм планирования |
| **GTD-контексты** | @home, @work, @errands — кросс-сферный фильтр |

### Ученик (пользователь)

| Идея | Заметка |
|------|---------|
| Подзадачи в UI | Форма для `parent_id`, вложенный список |
| Поиск по задачам | Глобальный поиск по title |
| Фильтр по сфере в `/tasks` | Показать только задачи одной сферы |
| Архив выполненных | Отдельная страница done-задач |
| Комментарии к задаче | Заметки/лог в description |
| Экспорт в CSV | Все задачи за период |

### Вид

| Идея | Заметка |
|------|---------|
| Мобильный вид `/week` | Горизонтальный скролл на узких экранах |
| Тёмная/светлая тема | Переключатель |
| Цветовые метки задач | Помимо сферы |

### Технический долг

| Идея | Заметка |
|------|---------|
| Middleware → proxy файл | Next.js 16 deprecated warning |
| Тесты (Playwright) | E2E smoke test |
| Логирование ошибок (Sentry) | Аналогично AfroLatin |
| Пагинация inbox | При большом количестве записей |
