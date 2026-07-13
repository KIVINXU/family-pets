# Frontend Development Guidelines

The repository root is the single Vue H5/PWA product implementation.

## Guidelines Index

| Guide | Description | Status |
| --- | --- | --- |
| [Directory Structure](./directory-structure.md) | Root source, test, and asset ownership | Complete |
| [Component Guidelines](./component-guidelines.md) | Vue SFC, accessibility, and UI mutation rules | Complete |
| [Hook Guidelines](./hook-guidelines.md) | Vue composable and lifecycle conventions | Complete |
| [State Management](./state-management.md) | Pinia and IndexedDB contracts | Complete |
| [Quality Guidelines](./quality-guidelines.md) | Required checks and regression coverage | Complete |
| [Type Safety](./type-safety.md) | TypeScript and runtime boundary validation | Complete |

## Pre-Development Checklist

- Read `directory-structure.md` before adding or moving files.
- Read `component-guidelines.md` for Vue page or component work.
- Read `state-management.md` and `type-safety.md` for durable state, backup, migration, or store changes.
- Read `quality-guidelines.md` before changing behavior or tests.
- Read `hook-guidelines.md` when adding watchers, lifecycle logic, or reusable composables.

## Quality Check

- Run the commands in `quality-guidelines.md` from the repository root.
- Trace durable writes from component to Pinia action to Repository to IndexedDB.
- Verify PWA builds still include required public assets in the Service Worker manifest.
- Search the repository for retired Flutter, Dart, and Android runtime references when changing project structure.
