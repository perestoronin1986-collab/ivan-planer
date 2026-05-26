# Дизайн-система IvanPlaner

Единый фиолетовый стиль, унаследованный от главной (`/`). Все внутренние экраны должны его придерживаться.

## Токены (`src/app/globals.css`)

Палитра brand-50…900 + ink, muted, line. Радиусы `--r-card 20px`, `--r-tile 14px`, `--r-chip 999px`. Тени `--shadow-card`, `--shadow-accent`, `--shadow-primary`. Градиенты `--grad-card-accent`, `--grad-primary`.

Tailwind v4 видит палитру через `@theme` — можно писать `text-brand-600`, `bg-brand-50` и т.п.

## UI-компоненты (`src/components/ui/`)

| Компонент | Назначение |
|---|---|
| `PageShell` | Внешняя обёртка экрана: `← главная` → emoji + title (22/700) → subtitle (muted). Mobile-first `max-w-md`. Поддерживает `actions` справа от заголовка. |
| `Section` | Карточка с радиусом 20px и тенью. Опции: `label` (10px uppercase brand-300/600), `accent` (фиолетовый градиент-фон + brand-400 border). |
| `Tile` | Плитка-ссылка с emoji + label, `primary` даёт фиолетовый градиент. |
| `ActionButton` | Кнопка с вариантами `primary` / `ghost` / `danger`. |
| `Chip` | Маленький бейдж (счётчик, тег). |
| `EmptyState` | Заглушка для пустого списка. |

## Текст и тон

- Заголовки одним словом: «Сегодня», «Неделя», «Проекты», «Активные», «Регулярные», «Инбокс», «Выполнено», «Настройки».
- Subtitle нижним регистром: «обзор недели», «5 сфер жизни», «быстрые записи — потом разберёшь».
- Кнопки — глагол + объект: «Добавить», «Записать», «Новая сфера».
- Назад — `← главная` (12px, серый).

## Шпаргалка

```tsx
import { PageShell, Section, EmptyState } from "@/components/ui";

export default function Page() {
  return (
    <PageShell title="Сегодня" emoji="☀️" subtitle="26 мая, вторник">
      <Section label="⚡ Активные" accent>
        {/* список */}
      </Section>
      <Section>
        <EmptyState emoji="✨" title="Задач нет" />
      </Section>
    </PageShell>
  );
}
```

## Что ещё не унифицировано

- Диалоги `AddTaskModal`, `AddRecurringTaskModal`, форма sphere edit `[sphereId]/page.tsx` — серая палитра внутри. Кандидаты на следующий заход.
- Компонент `TaskItem` — оставлен как есть, визуально совместим.

## Превью

`wiki/design-unified.html` — статический мок целевого вида (открыть в браузере).
