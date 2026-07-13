# Quality Guidelines

## Required Commands

Run from the repository root:

```powershell
$ErrorActionPreference = 'Stop'
npm run type-check
npm run test
npm run test:e2e
npm run build
```

There is currently no `lint` script; do not report lint as passed unless one is added and executed.

## Required Patterns

- Behavior changes require a unit or Playwright regression.
- Persisted state changes require migration and round-trip review.
- Production builds must generate `dist/sw.js`.
- Core public assets required offline must appear in the Service Worker precache manifest.
- Standard `npm run test:e2e` must work without manual proxy setup; `playwright.config.ts` adds loopback hosts to `NO_PROXY`.

## Forbidden Patterns

- No native Android, Flutter, or Dart runtime code.
- No direct browser storage calls from Vue views.
- No `console.log`, `console.debug`, `debugger`, suppressed type errors, or silent catch blocks around durable state.
- Do not duplicate pet names, asset paths, or unlock levels outside `pets.ts`.

## Test Coverage

- `src/*.test.ts`: domain, Repository, and Pinia action rules.
- `tests/*.spec.ts`: mobile user workflows, route protection, persistence, and UI feedback.
- Use `fake-indexeddb` for unit storage behavior and real browser IndexedDB for reload E2E.

## Review Checklist

- Type check, unit tests, E2E, and build pass.
- No retired Flutter/Android references in active source or current documentation.
- Store writes use plain snapshots and roll back failed persistence.
- Locked/selected/pending states are accessible without color-only meaning.
- Generated output and test artifacts remain ignored.
