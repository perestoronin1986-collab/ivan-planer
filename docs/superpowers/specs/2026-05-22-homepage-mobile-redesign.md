# Spec: Homepage Mobile Redesign

**Date:** 2026-05-22  
**Status:** Approved

## Goal

Redesign `src/app/page.tsx` for mobile-first use. Current page is an unstyled grid of 11 links — no visual hierarchy, hard to tap on mobile.

## Design

Light background (`#f3f4f6`), purple accent (`#7c3aed / #8b5cf6`) on all buttons and borders. Four grouped blocks with rounded cards.

### Block 1 — Планирование (highlighted)
Visually distinct: light purple gradient background (`#f5f3ff → #ede9fe`), purple border, drop shadow.

- Row: **Сегодня** (purple gradient fill, white text, shadow) | **Неделя** (white bg, purple border)
- Centered below: **Месяц** (white bg, smaller, muted)

### Block 2 — Структура
White card, gray border.

- Row: **Сферы** | **Проекты** (light purple bg `#faf5ff`, purple border `#e9d5ff`, dark purple text)

### Block 3 — Задачи
White card, gray border.

- Row: **Активные** | **Регулярные** (same style as Block 2)
- Centered below: **Выполнено** (muted purple)

### Block 4 — Утилиты
White card, gray border.

- Row: **Поиск** | **Настройки** (same style as Block 2)

## Tokens

```
Purple primary:   #7c3aed (button fill, labels)
Purple light:     #8b5cf6 (gradient end)
Purple bg:        #faf5ff (button background)
Purple border:    #e9d5ff (button border)
Purple text:      #4c1d95 (button text)
Purple muted:     #a78bfa (section labels)
Block bg:         #ffffff
Page bg:          #f3f4f6
```

## Changes

- `src/app/page.tsx` — full rewrite of `<main>` content
- No new files, no new routes, no new dependencies
- Header retains: user email, OnlineIndicator, SyncHealth, sign-out button
- Inbox (`/inbox`) absent from nav blocks — accessible via search or direct URL (not in user's top list)

## Out of scope

- Other pages
- Dark mode toggle
- Bottom navigation bar
