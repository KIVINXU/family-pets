# Vue H5/PWA Migration Design

## Architecture

The repository root is the product runtime and build root.

```text
Vue pages and components
        |
        v
Pinia app store and domain actions
        |
        v
AppRepository interface
        |
        v
IndexedDB repository
```

Recommended project structure:

```text
src/
  app/
    router/
    stores/
  domain/
    models/
    rules/
    seed/
  infrastructure/
    persistence/
    backup/
  features/
    pet-room/
    tasks/
    rewards/
    parent/
    ledger/
    dex/
  shared/
    components/
    styles/
    utils/
```

## Technology Choices

- Vue 3 Composition API with `<script setup lang="ts">`.
- Pinia for application state and domain actions.
- Vue Router with separate child and parent route groups.
- IndexedDB through `idb` for structured local persistence.
- `vite-plugin-pwa` for installability and offline application assets.
- Vitest and Vue Test Utils for domain, store, and component tests.
- Playwright for critical mobile workflow verification.
- Lucide Vue for standard interface icons.

No component framework is required for the first migration. The existing visual direction is custom and child-focused; a large UI framework would add styling constraints without removing meaningful domain complexity.

## Route Mapping

| Vue route | Purpose |
| --- | --- |
| `/` | Pet room |
| `/tasks` | Child task list |
| `/rewards` | Reward shop |
| `/dex` | Pet collection |
| `/parent/unlock` | PIN gate |
| `/parent/:section?` | Parent dashboard and management views |

Parent routes use an in-memory unlocked-session guard. Reloading a parent route requires PIN entry again; the PIN remains persisted as application data for the local prototype.

## State And Domain Boundaries

`AppState` remains the aggregate persisted by the repository. TypeScript types cover child profile, progress, task templates, task completions, rewards, redemption requests, ledger entries, and the parent PIN.

Pinia actions own the application behavior:

- `loadApp`
- `verifyPin`
- `submitTask`
- `approveTask`
- `rejectTask`
- `requestReward`
- `approveRedemption`
- `rejectRedemption`
- `addTaskTemplate`
- `toggleTaskTemplate`
- `addReward`
- `toggleReward`

Every mutating action applies domain rules first, creates a new state value, persists it, and only then exposes the completed update to the UI. Components call actions and consume derived getters such as available points and pending review counts.

## Persistence Contract

The repository stores one versioned envelope:

```ts
interface PersistedAppData {
  schemaVersion: 1
  savedAt: string
  state: SerializedAppState
}
```

Domain dates are represented as `Date` in active application state and ISO strings in serialized state. Serialization and validation live in the repository boundary. Invalid or unsupported data must not partially overwrite current state.

The browser storage key retains the semantic name `family_pets_app_state_v1`; browser persistence does not import retired native-app storage automatically.

## Asset Migration

Store room and pet PNG assets under `public/assets/` and expose them through stable Vite public paths. Preserve descriptive filenames so visual-state mapping remains obvious.

The pet room uses the room image as the full visual background and overlays the current pet image. Stable layout dimensions and responsive constraints prevent state changes from shifting the primary scene.

## Pet Catalog And Unlocks

A typed pet catalog is the single source of truth for pet identity, display copy, four expression assets, and unlock level. The persisted child profile stores only the selected pet id and its current display name; unlock eligibility is derived from the child's level so it cannot drift from progression.

Unlock milestones are level 1 for Tuantuan, level 3 for Paopao, level 5 for Meimei, level 7 for Xingya, and level 10 for Mili. The store validates every switch before persisting it. Repository schema migration adds the default pet id to version 1 data and rejects a selected pet that is not available at the restored level.

The pet room resolves its active image through the catalog rather than hard-coded Tuantuan paths. The dex consumes the same catalog to render unlocked, locked, and selected states.

## PWA And Offline Behavior

- Cache the application shell, fonts, icons, room image, and pet state images.
- IndexedDB remains the source of truth for user data.
- Service worker updates use an explicit update notification rather than silently replacing an active session.
- No network availability is required for the MVP workflow.

## Migration And Rollback

- The H5 implementation lives at the repository root and is the only product runtime.
- The retired Flutter/Android implementation is removed after H5 behavioral tests pass.
- Rollback relies on repository history or an external backup rather than keeping duplicate runtime code.
- Future cloud sync must implement the same repository contract instead of moving persistence calls into components or stores.

## Trade-Offs

- Local-only storage cannot synchronize a parent's phone with a child's device. This matches the current MVP and avoids premature authentication and backend work.
- IndexedDB is more complex than localStorage but better matches the structured state, backups, schema evolution, and future repository replacement.
- Keeping PIN unlock in memory prevents a stale browser tab from remaining permanently unlocked, at the cost of re-entering PIN after reload.
