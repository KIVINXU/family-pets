# State Management and Persistence Contract

## 1. Scope / Trigger

Read this spec for any change to `AppState`, Pinia actions, IndexedDB, JSON backups, pet selection, task review, reward redemption, points, or growth.

## 2. Signatures

```ts
const store = useAppStore();

interface AppRepository {
  load(): Promise<AppState>;
  save(state: AppState): Promise<void>;
  restore(raw: string): Promise<AppState>;
  export(state: AppState): string;
}
```

Durable mutations are async store actions such as `submitTask`, `approveTask`, `requestReward`, `switchPet`, and `updateChildProfile`.

## 3. Contracts

- Pinia `state` is the active in-memory aggregate.
- IndexedDB database: `family-pets`.
- Object store: `app`.
- Storage key: `family_pets_app_state_v1`.
- Current persisted schema: version `2`.
- Before saving, convert Vue proxies into a plain JSON-compatible snapshot.
- A durable action captures the previous snapshot, applies rules, saves, and restores the previous snapshot if persistence fails.
- UI components never call IndexedDB directly.
- `currentPetId` is persisted; unlock eligibility is derived from the current level and the catalog.

## 4. Validation and Error Matrix

| Condition | Required behavior |
| --- | --- |
| Missing stored state | Return `seedState()` |
| Schema version 1 | Normalize missing `currentPetId`, save as version 2 |
| Unsupported schema | Ignore it and return seed state |
| Invalid backup JSON | Throw `备份文件不是有效 JSON` |
| Missing backup aggregates | Throw a format or incomplete-field error |
| Restored selected pet is locked | Fall back to Tuantuan |
| Repository save fails | Restore the previous state and show a save error |
| Locked pet switch | Return `false`, do not save, show unlock guidance |

## 5. Good / Base / Bad Cases

- Good: an unlocked pet is selected, persisted, and restored after reload.
- Base: schema version 1 data without a pet id keeps the existing pet nickname and defaults to Tuantuan.
- Bad: a component assigns `store.state.child.currentPetId` directly and bypasses validation and rollback.

## 6. Tests Required

- Unit test every new store rule and invalid transition.
- Migration tests must assert both normalized in-memory state and the upgraded saved version.
- Persistence regressions must prove the object passed to IndexedDB is cloneable.
- Playwright must cover at least one durable action surviving a page reload.
- Pet changes require locked selection, unlocked selection, room image, and reload assertions.

## 7. Wrong vs Correct

Wrong:

```ts
store.state.child.currentPetId = pet.id;
```

Correct:

```ts
await store.switchPet(pet.id);
```

The action validates the level, updates the display name, persists the snapshot, rolls back failures, and emits feedback.
