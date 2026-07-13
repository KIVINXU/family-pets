# Directory Structure

## Overview

All runtime product code lives at the repository root. Do not add native Android, Flutter, Dart, or a second application root.

## Directory Layout

```text
public/assets/          # immutable room and pet image URLs
src/
  components/           # reusable Vue presentation components
  views/                # route-level Vue pages
  activity.ts           # optional local activity timestamps
  domain.ts             # persisted domain types and seed data
  pets.ts               # typed pet catalog and unlock rules
  repository.ts         # IndexedDB, backup, and schema normalization
  store.ts              # Pinia state, getters, and durable actions
  router.ts             # Vue Router routes and parent guard
  style.css             # shared design tokens and responsive styles
tests/                  # Playwright mobile workflows
```

Unit tests live beside their TypeScript owner as `*.test.ts`. Public image paths are referenced through `/assets/...` and must resolve under `public/`.

## Module Organization

- Put persisted data types and seed values in `domain.ts`.
- Keep pet identity, four-state assets, and unlock levels only in `pets.ts`.
- Put all browser storage and backup format handling in `repository.ts`.
- Route-level UI belongs in `src/views`; shared hosts and navigation belong in `src/components`.
- Extract a new module only when it owns a distinct contract or repeated logic.

## Naming Conventions

- Vue pages and components: `PascalCase.vue`.
- TypeScript modules: lowercase descriptive names such as `repository.ts`.
- Tests: `<owner>.test.ts` for unit tests and descriptive `*.spec.ts` for Playwright.
- Pet assets: `<species>-<expression>.png`, using kebab-case.

## Example

`pets.ts` is the single catalog consumed by both `Dex.vue` and `PetRoom.vue`; neither page defines its own pet list or unlock thresholds.
