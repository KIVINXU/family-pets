# Type Safety

## Overview

The application uses strict TypeScript. Domain types live in `src/domain.ts`; pet-specific types live in `src/pets.ts`.

## Type Organization

- Persisted aggregate types: `AppState`, `ChildProfile`, `ChildProgress`, tasks, rewards, redemptions, and ledger entries in `domain.ts`.
- Pet identity is the `PetId` union; expressions use the `PetExpression` union.
- Vue view-only unions stay local when they are not shared.
- Repository compatibility shapes may make newly introduced fields optional only at the migration boundary.

## Validation

- JSON and IndexedDB data are runtime input and must be checked before being treated as `AppState`.
- Schema normalization owns defaults and compatibility upgrades.
- Never spread an unvalidated payload directly into active state.
- Type assertions are allowed only immediately after sufficient boundary validation or JSON snapshot creation.

## Patterns

```ts
export type PetExpression = "normal" | "happy" | "excited" | "low_energy";

assets: Record<PetExpression, string>;
```

Use discriminated string unions for finite statuses and expressions so all consumers share the same vocabulary.

## Forbidden Patterns

- Do not use `any` for persisted or UI payloads.
- Do not duplicate partial versions of `AppState` inside components.
- Do not accept arbitrary strings where a `PetId`, status union, or ledger type is available.
- Do not bypass errors with `@ts-ignore` or unchecked double assertions.

## Testing

Run `npm run type-check`. Any new persisted field also requires tests for seed state, save/load, old schema migration, backup restore, and invalid input behavior.
