# Vue H5/PWA Migration Implementation Plan

## 1. Scaffold And Tooling

- Configure the repository root with Vue 3, TypeScript, and Vite.
- Add Pinia, Vue Router, `idb`, `vite-plugin-pwa`, Lucide Vue, Vitest, Vue Test Utils, and Playwright.
- Configure strict TypeScript, linting, formatting, tests, and production build scripts.
- Establish shared design tokens and mobile viewport constraints.

## 2. Domain And Persistence

- Implement the domain enums and models in TypeScript.
- Add seed data for the agreed product defaults.
- Implement serialization, schema validation, and the repository interface.
- Implement IndexedDB persistence and JSON backup/restore.
- Add domain and repository tests before connecting pages.

## 3. Application State

- Implement the Pinia app store and derived getters.
- Port task submission and task review actions.
- Port reward request, freeze, approval, rejection, and ledger actions.
- Port task and reward management actions.
- Add store tests covering success paths, invalid transitions, and balance invariants.

## 4. Child Experience

- Build the mobile application shell and bottom navigation.
- Build the pet room using existing room and pet assets.
- Build task list and submission states.
- Build reward shop, affordability states, and redemption feedback.
- Build the pet collection using the available pet assets and catalog rules.

## 5. Parent Experience

- Build the fixed-grid PIN keypad and parent route guard.
- Build the parent dashboard with pending counts.
- Build task review and redemption review workflows.
- Build task management, reward management, ledger, backup, and restore views.

## 6. PWA And Documentation

- Configure manifest, icons, service worker, offline assets, and update handling.
- Document H5/PWA development commands and the removal of the retired native implementation.
- Document local data location, reset, backup, and restore behavior.

## 7. Verification

- Run `npm run type-check`.
- Run `npm run lint`.
- Run `npm run test`.
- Run `npm run build`.
- Run Playwright at representative mobile and desktop viewports.
- Verify offline reload and IndexedDB persistence.
- Verify the full task and reward workflows against the product acceptance criteria.

## 8. Pet Collection

- Rename the four new pet image groups to descriptive species and expression filenames.
- Add a typed pet catalog and level-based unlock helpers.
- Add the selected pet id to app state and migrate schema version 1 persistence and backups.
- Add validated pet switching and unlock feedback to the Pinia store.
- Rebuild the dex with complete collection, unlock progress, and switching controls.
- Make the pet room use the selected pet's four expression assets and name.
- Add unit and mobile end-to-end coverage for migration, locked selection, unlocking, switching, and persistence.

## Risk And Rollback Points

- Complete domain tests before UI work so state-rule regressions are isolated.
- Keep asset naming and catalog mapping deterministic.
- Delete the retired Flutter/Android implementation only after the H5 quality gate passes.
- If PWA caching interferes with development, disable service worker registration in development rather than removing the production configuration.
