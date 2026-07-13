# Component Guidelines

## Overview

The UI uses Vue 3 Composition API with `<script setup lang="ts">`. Route pages live in `src/views/`; reusable presentation belongs in `src/components/`.

## Component Structure

- Keep durable mutations in Pinia actions. Components may format, filter, and hold short-lived interaction state.
- Use `computed` for derived display values and `watch` only for lifecycle side effects such as image preloading or timed feedback.
- Clean up timers and DOM listeners in `onBeforeUnmount`.
- Prefer one route-level concern per view instead of large conditional application shells.

## Props and State

- Type props and emitted payloads explicitly when creating reusable components.
- Read global data through `useAppStore()`.
- Local refs are appropriate for PIN input, active tabs, form drafts, pet interaction animation, and temporary messages.
- Do not directly implement points, growth, unlock, approval, or persistence rules in templates.

## Styling

- Reuse variables and shared classes in `src/style.css` before adding isolated colors or spacing.
- Keep mobile controls touch-friendly and verify the Pixel 7 Playwright project.
- Pet images use `object-fit: contain`; room imagery must not cause layout shifts or white flashes.

## Accessibility

- Important actions require visible text or an explicit `aria-label`.
- Locked, selected, pending, and approved states must not rely on color alone.
- Child-facing Chinese copy must remain short, warm, and non-punitive.

## Common Mistakes

### Durable mutation in a component

Wrong: changing `pointsBalance`, `currentPetId`, or task status directly from a view.

Correct: call the corresponding store action and let it validate, persist, roll back on failure, and emit feedback.

### Uncleaned timers

Any `window.setTimeout` owned by a view must be cleared when replaced and in `onBeforeUnmount`.
