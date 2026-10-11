# Frontend Build Migration: Create React App → Vite

**Scope:** `react-ystemandchess`
**Context:** Issue 4 (Vulnerable and Near-Deprecated Dependencies), Phase 2 follow-up
**Branch:** `chore/frontend-cra-to-vite` (`8c6a523c`) — pushed, **not merged**
**Status:** Ready for review. One verification step outstanding (see [Verification](#verification)).

---

## Summary

After `npm audit fix` cleared the safely-fixable findings, ~33 remained in the frontend. All of them
traced to a single root cause: `react-scripts@5.0.1` (Create React App), which is unmaintained
upstream and pins its own outdated build toolchain. Five options were scoped (A–E). This document
records why **Option D (migrate to Vite)** was the only one that could reach zero, why it was
substantially cheaper in this repository than the generic estimate assumed, and what the migration
uncovered.

**Result: 47 → 5 audit findings. Zero critical, zero high, zero low.**

| Metric | Before | After |
|---|---|---|
| Audit findings | 47 | **5** |
| Critical / High / Low | 0 / 26 / 10 | **0 / 0 / 0** |
| Moderate | 11 | 5 |
| Test suites / tests | 27 / 149 | 27 / 149 (parity) |
| Production build | webpack (CRA) | Vite 8.2.2, ~6.4s |
| Node (Docker) | `18.20.8-alpine` (EOL Apr 2025) | `20.19.0-alpine` |

---

## The ledger

Counts from `npm audit --package-lock-only`.

| Stage | Total | High | Moderate | Low | Provenance |
|---|---:|---:|---:|---:|---|
| `main`, pre-fix | 47 | 26 | 11 | 10 | Measured |
| After `npm audit fix` | 33 | — | — | — | As reported by Thrishma |
| After migration | **5** | 0 | 5 | 0 | Measured |

---

## Decision: why Option D

### Option B (npm overrides) provably cannot reach zero

`react-scripts` pins `webpack-dev-server: ^4.6.0`, while the advisory fix requires `>= 5.2.1`.
CRA's own dev-server config calls three APIs that webpack-dev-server 5 removed outright:

| File | Line | API |
|---|---|---|
| `node_modules/react-scripts/config/webpackDevServer.config.js` | 112 | `onBeforeSetupMiddleware` |
| " | 123 | `onAfterSetupMiddleware` |
| " | 102 | `https:` |

Forcing that override breaks `npm start`.

`react-scripts` itself cannot be patched at all — `npm audit` reports its `fixAvailable` as
`version: "0.0.0"`, npm's way of signalling that no fix exists. Sixteen findings sat behind that
wall: `@svgr/*`, `css-select`, `nth-check`, `postcss`, `resolve-url-loader`, `rollup-plugin-terser`,
`serialize-javascript`, `sockjs`, `svgo`, `uuid`, `webpack-dev-server`, `workbox-*`, and
`react-scripts`.

### The other options

- **Option A** (accept and document) — a valid *reporting posture* while a fix lands, but not a
  destination; the 16 CRA-locked findings never close.
- **Option C** (`npm audit fix --force` to measure) — superseded; the mechanism above already
  explains the breakage without an exploratory branch.
- **Option E** (craco / react-app-rewired) — a config layer over the same aging toolchain. Does not
  change the pinned versions.

### Why Option D was cheaper here than estimated

Option D was scoped as "medium–high, needs its own task." Three of its four cost drivers had already
been paid in this repository:

| Estimated cost | Actual state |
|---|---|
| Jest / test-runner config changes | Already standalone. `jest.config.js`, `babel.config.js` and `__mocks__/` existed; only the `test` script still pointed at `react-scripts test`. |
| `REACT_APP_*` → `VITE_*` sweep | **2** usages across **303** source files. Real config is `src/environments/environment.js`, a plain ES module. Handled with a Vite `define` and **zero source edits**. |
| Dev server / proxy setup | None needed — no CRA `proxy` field; the app calls absolute URLs. |
| Build script changes | One line. `build.outDir: 'build'` keeps the Dockerfile's `serve -s build` untouched. |

Other common migration blockers came back clear: no JSX inside `.js` files, no absolute-from-`src`
imports or `@/` aliases, and Sass, Tailwind, PostCSS and Autoprefixer already present as direct
devDependencies.

---

## What CRA was doing implicitly

The most useful outcome was not the audit number. It was discovering four things the project depended
on that were **never written down anywhere** — each invisible until the tool supplying it was removed.

### 1. Tailwind was compiling only because CRA auto-detected it

CRA auto-detects `tailwind.config.js` and injects the `tailwindcss` PostCSS plugin itself
(`react-scripts/config/webpack.config.js:72`). **No `postcss.config.js` has ever existed in this
repository's history** — confirmed against all branches, and there is no craco or react-app-rewired
either.

Under Vite, Tailwind silently stopped compiling and the site rendered unstyled. This had **no test
coverage** — it was caught only by loading the app in a browser. Fixed by adding an explicit
`postcss.config.js`.

### 2. `uuid` was a phantom dependency

`uuid` is imported directly by `src/features/puzzles/Puzzles.tsx:8` and
`src/features/student/student-page/Student.tsx:7`, but was **absent from `package.json`**. It
resolved only through hoisting:

```
react-scripts → webpack-dev-server → sockjs → uuid@8.3.2
```

Removing CRA would have broken the production build. Note also that the vulnerable `uuid` npm
flagged under the CRA cluster was the copy the application actually ships. It is now an explicit
direct dependency.

### 3. `whatwg-fetch` and `src/setupTests.ts` were wired up by CRA's Jest config

CRA set `setupFiles` to `react-app-polyfill/jsdom` (which is just `whatwg-fetch`) and
`setupFilesAfterEnv` to `src/setupTests.ts`. Standalone Jest has to be told about both explicitly.

### 4. ESLint ran on every build — and now does not

Linting was part of `react-scripts build`, which is why CI carried `CI=false` to stop warnings
failing the build. ESLint is not a direct dependency, so **build-time linting is now gone**. See
[Follow-ups](#follow-ups).

---

## Defects surfaced by the migration

Standing up the standalone Jest config exposed two pre-existing defects. Neither was caused by Vite.

### The automatic JSX runtime was never configured

`babel.config.js` used `@babel/preset-react` without `runtime: 'automatic'`. Because components
render JSX without importing React, `npx jest` failed **14 of 27 suites** with
`ReferenceError: React is not defined`. `react-scripts test` masked this completely by using its own
Babel preset, so CI stayed green and anyone running Jest directly hit a wall.

### Two specs passed only because of a jsdom gap

Two `ParentSignUp` specs clicked submit on a form whose inputs carry the native `required` attribute.
Under jsdom 16 (Jest 27, via react-scripts) this submitted fine, because that version did not
implement interactive constraint validation. Under jsdom 20 — and in **every real browser** —
submission is blocked and the handler never fires.

The specs were asserting behaviour that cannot occur in production. They now dispatch `submit` on the
form directly, which is what they were always trying to test.

> **Worth a separate look:** because those fields are natively `required`, the component's own
> friendlier validation messages (`"Invalid Email"`, `"Please accept the terms and conditions."`) are
> unreachable for empty fields in a real browser. Users see browser-default tooltips instead.

---

## What changed

No application logic was modified. Changes are confined to build configuration, plus the mechanical
SVG import change and the two test fixes above.

### Dependencies

| Action | Package |
|---|---|
| Removed | `react-scripts`, `@svgr/webpack` (dead — webpack-only, carried a HIGH finding) |
| Added (dev) | `vite`, `@vitejs/plugin-react`, `vite-plugin-svgr`, `whatwg-fetch` |
| Added (prod) | `uuid` (promoted from phantom dependency) |

### Configuration

| File | Change |
|---|---|
| `vite.config.mts` | New. React plugin, svgr, `build.outDir: 'build'`, `server.port: 3000`, `define` for `process.env`. `.mts` avoids `"type": "module"`, which would break the CommonJS jest/babel configs. |
| `postcss.config.js` | New. Declares `tailwindcss` + `autoprefixer` explicitly. |
| `index.html` | Moved from `public/`. `%PUBLIC_URL%` → `/`; module script tag added. |
| `package.json` | Scripts → `vite` / `vite build` / `jest`. Removed dead `eslintConfig` block referencing the now-absent `eslint-config-react-app`. |
| `jest.config.js` | Added `setupFiles`, `setupFilesAfterEnv`, `testPathIgnorePatterns` (Playwright specs), `transformIgnorePatterns` (ESM-only `uuid`), and a mapper for `?react` SVG imports. |
| `babel.config.js` | Added `runtime: 'automatic'`; targets Node for Jest. |
| `tsconfig.json` | `target` ES5 → ES2020 (esbuild cannot downlevel to ES5); added `vite/client` types. |
| `Dockerfile` | `node:18.20.8-alpine` → `node:20.19.0-alpine`, both stages. Required by Vite, not optional. |
| `.github/workflows/ci.yml` | Dropped the CRA-specific `CI=false` prefix. |
| `src/index.css` | Moved the Google Fonts `@import` above the `@tailwind` directives — CSS requires `@import` to precede other rules, so the font was being dropped. |

### SVG imports

Both import styles coexisted in the codebase (28 component imports, 34 URL imports). They moved to
Vite's current convention rather than pinning an older plugin major — staying on legacy tooling is
what created this ticket in the first place.

```diff
- import { ReactComponent as RedoIcon } from "./icon_redo.svg";
+ import RedoIcon from "./icon_redo.svg?react";
```

Bare `.svg` imports remain asset URLs and were untouched. Type declarations and the Jest SVG mocks
were updated to match.

---

## Verification

| Check | Result |
|---|---|
| Test parity | **Pass.** Baseline captured on `main` first: 27 suites / 149 tests under `react-scripts test`. Standalone Jest now matches exactly — 27 / 149. |
| Production build | **Pass.** ~6.4s. CJS interop for `chessboardjsx`, `chess.js` and `react-element-to-jsx-string` — the flagged highest risk — cleared with no extra config. CSS grew 130 → 177 kB once Tailwind compiled again. |
| Bundle integrity | **Pass.** Zero server-side modules in output (0 of 469 sources), matching CRA. `process.env` references fully replaced, `localhost:8000` fallback preserved. |
| Browser pass | **Pass.** Dev server ready in ~300 ms. Home, `/lessons`, `/login` checked: `?react` component icons and bare-URL SVG imports both render, chessboard mounts, no module or CSS errors. Only console errors were `Failed to fetch` (no local backend). |
| Node engines | **Pass.** Vite is tightest at `^20.19.0 \|\| >=22.12.0`; all other dependencies looser. The pin is valid — but sits exactly on the floor, with no headroom for a future Vite minor. |
| **Docker build** | **NOT VERIFIED.** Docker unavailable in the working environment. **Must be run before merge** to confirm the `node:20.19.0-alpine` pin. |

---

## What remains open

Five moderate findings, both groups deliberate.

| Findings | Packages | Why left |
|---|---|---|
| 3 × moderate | `express`, `body-parser`, `qs` | Present only for six unreachable server-side files under `src/`. Verified against build sourcemaps that **0 of 469** bundle sources are these. Real fix is Express 5, a semver-major `npm audit fix` will not apply; correct resolution is deleting the dead files. Flagged rather than actioned, per agreed scope. |
| 2 × moderate | `react-router`, `react-router-dom` | Fix requires v7, a semver-major with genuine routing-behaviour risk. Deferred to its own task with a dedicated manual navigation pass (parent plan, Phase 4). Bundling a routing major into a build-tool migration would make any regression untraceable. |

---

## Where it stands

- Branch `chore/frontend-cra-to-vite` (`8c6a523c`) pushed to origin. 22 files, +4,924 / −15,471.
- `main` untouched. **No pull request opened, no merge performed.**
- One file deliberately left uncommitted: `src/core/environments/`, which CI regenerates on every
  run. Committing it would create a tracked file with a credentials shape that competes with CI's own
  generation. It was untracked before this work began.

> **Note on the Dependabot figure.** GitHub reports 210 vulnerabilities on the default branch
> (1 critical, 111 high, 83 moderate, 15 low). That spans all four services *plus* the stale
> directories — `angular-ystemandchess-old`, `chess-client-react-refactor`,
> `suggested-chess-front-end`, and the dead root `package.json`. The 47 → 5 figure here is
> `react-ystemandchess` alone. Worth clearing the abandoned folders (parent plan, Phase 1) before
> enabling Dependabot properly, or it will keep reporting against directories nobody ships.

---

## Follow-ups

Found during this work, deliberately out of scope.

1. **Re-wire linting.** ESLint ran on every CRA build and no longer runs at all. Add `eslint` with
   `eslint-plugin-react-hooks`, a `lint` script, and a CI step. This restores a check that `CI=false`
   was suppressing anyway.

2. **Delete the server-side code under `src/`.** Six unreachable files import `express`,
   `nodemailer`, `config` and `jsonwebtoken`. Removing them closes the last three moderate findings
   and drops four frontend dependencies.
   Prioritise for a second reason: `resetPasswordService.ts:14` reads Gmail credentials from a
   client-side config module. Inert today — nothing reachable imports it — but a live secret leak the
   moment any component does.

3. **CI injects secrets into a file nothing reads.** `ci.yml` generates
   `src/core/environments/environment.ts` with `APP_ID`, `EMAIL_USER`, `EMAIL_PASS` and the service
   URLs. No source file imports `core/environments` — every consumer reads
   `src/environments/environment` instead. The injection is a no-op, and CI has been building against
   committed `localhost` values.

4. **Correction to the Phase 2 write-up.** "All 33 are dev/build-time — none ship in the production
   bundle" holds for the 16 CRA-locked findings (verified: no service worker registered). It does
   **not** hold for `uuid`, which the app imports directly, nor for `axios`, `react-router`, or
   `engine.io-client` / `socket.io-parser` / `ws` via `socket.io-client`. Worth re-checking before
   that sentence enters an audit or compliance record.

5. **Bundle size.** The main chunk is 1.66 MB (581 kB gzipped) in a single file, well over the 150 kB
   landing-page budget. Vite flagged three ineffective dynamic imports where a module is both lazily
   and statically imported. Pre-existing app structure, now simply visible — route-level code
   splitting is straightforward under Vite.

6. **Native validation vs. custom messages.** See the `ParentSignUp` note above; the component's own
   validation messages are unreachable for empty `required` fields in a real browser.

---

## Appendix: running the app

```bash
cd react-ystemandchess
npm install

npm start          # Vite dev server on :3000
npm run build      # production build → build/
npm run preview    # serve the production build locally
npm test           # Jest (27 suites / 149 tests)
npm run test:watch # Jest in watch mode
npm run test:e2e   # Playwright (requires a running backend)
```

`npm run eject` no longer exists — it was a CRA-only escape hatch.
