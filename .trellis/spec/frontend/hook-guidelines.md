# Vue Composable and Lifecycle Guidelines

## Overview

This project currently favors direct Composition API usage in small views. Create a reusable `useXxx` composable only when stateful logic is shared by multiple components or has an independent lifecycle contract.

## Patterns

- Name reusable composables `useXxx` and keep them under `src/` near the domain they serve.
- Return typed refs, computed values, and actions rather than exposing mutable implementation details.
- Use Pinia for state that survives navigation or must persist.
- Use local refs for transient form and animation state.
- There is no remote data-fetching layer in the local-first MVP.

## Watchers and Lifecycle

- Watch the narrowest source possible, for example `() => store.currentPet.id`.
- Use `{ immediate: true }` only when the side effect must also run at mount.
- Remove event listeners and clear timers in `onBeforeUnmount`.
- Browser APIs such as `localStorage`, `document`, and `window` must be guarded when code may execute outside the browser.

## Common Mistake

Do not create a composable that duplicates a Pinia getter or Repository action. Shared durable behavior belongs in `store.ts` or `repository.ts`, not in multiple UI hooks.
