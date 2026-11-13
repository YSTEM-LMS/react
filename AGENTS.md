# Repository Guidance

## Scope and architecture

- This is a multi-package React/Node.js repository, not a single npm workspace. Each service has its own manifest and lockfile; install and test in the affected package.
- `react-ystemandchess/` is the main React 18 frontend (Create React App), normally on port 3000. Do not confuse it with the separate `chessclient/` application.
- `middlewareNode/` is the Express/Mongoose API on port 8000; regression tests live in `tests/`. There is no controllers layer: routes handle HTTP, while reusable or complex logic belongs in `src/utils/` or domain services such as `src/badges/service.js`. See [middleware code placement](middlewareNode/README.md).
- `chessServer/` handles real-time chess games and move validation on port 3001; `stockfishServer/` handles engine opponents and analysis on port 8080. Both use Socket.IO.
- Follow the neighboring code's module system, formatting, and component patterns. Avoid repository-wide cleanup or dependency upgrades unrelated to the requested change.

## Setup and commands

- Use Node.js **24.21.0**, pinned by Volta in the package manifests. Use `npm ci` with committed lockfiles; do not hand-edit dependency lockfiles.
- From the repository root, install an affected package with `npm ci --prefix <directory>`. Root `npm ci` does not install all services' dependencies.
- Root `npm start` and `npm run dev` start only the main frontend. Inspect [package.json](package.json) for available commands; do not assume an all-services launcher exists.

| Component | Start from repository root | Test from repository root |
| --- | --- | --- |
| Main frontend | `npm run start:client` | `npm run test:client -- --watchAll=false` |
| Middleware API | `npm run start:middleware` | `npm run test:middleware` |
| Chess game server | `npm run start:chess` | `npm run test:chess` |
| Stockfish server | `npm run start:stockfish` | `npm run test:stockfish` |

- Build the main frontend with `npm run build`. Backend manifests currently have no build script: CI's `build --if-present` steps do not demonstrate backend compilation.
- Frontend `npm test` uses `react-scripts test`; backend tests use Jest. Inspect the package's runner/configuration before passing test flags.
- Frontend E2E tests are separate: run `npx playwright test` from `react-ystemandchess/`. [The Playwright configuration](react-ystemandchess/playwright.config.ts) expects running services, defaults to frontend port 3000, and uses one worker because specs share seeded database state. Do not run these against production data.
- See [setup and service instructions](README.md) and [the CI workflow](.github/workflows/ci.yml). Verify referenced commands against tracked files; the README currently references an absent `create_dev_envs.sh`.

## Environment and safety

- Use each backend's committed environment example for local configuration. Preserve existing local values; never overwrite a local environment file without explicit approval.
- Follow [SECURITY.md](SECURITY.md): never commit credentials, local environment files, or secret configuration. Keep real credentials in environment variables; preserve the middleware's [environment-variable mappings](middlewareNode/config/custom-environment-variables.json).
- Frontend environment selection is in [src/environments/index.js](react-ystemandchess/src/environments/index.js). Check its development/production modules before changing API URLs; production builds require the configured `REACT_APP_*` service URLs.
- Middleware's in-memory MongoDB fallback is local-only, temporary, and platform-dependent. A listening API port does not prove database readiness; verify a successful MongoDB connection. Do not weaken deployed-environment validation or enable fallback/seeding in deployed environments.
- Backend startup uses Nodemon. A crashed application can leave the watcher alive, so process survival alone is not a successful startup check.
- Root and deployment Compose configurations differ. Inspect the intended configuration rather than assuming ports and environment settings are interchangeable.

## Verification and PR scope

- Add or update tests near the affected feature and run the relevant package tests. For cross-service changes, check both sides of the HTTP/Socket.IO contract.
- Distinguish installation, build, unit/integration tests, browser checks, and startup/shutdown checks. Report exact commands and observed results, including warnings or blockers; never claim unrun tests passed.
- Keep unrelated changes and personal notes out of commits. Review the staged diff for secrets and follow the commit-message policy in [SECURITY.md](SECURITY.md), including its prohibition on assistant attribution.
- Use [the pull-request template](.github/pull_request_template.md); check only testing items actually completed. Do not commit, push, or merge without the user's request.

## Feature maintenance

- Prefer the shared `StatCard`, `BadgeCard`, `MentorCard`, and `ProgressBar` components under `react-ystemandchess/src/components/` for compatible dashboard/profile UI rather than duplicating them. Check existing props and variants; update their colocated component tests when changing their contracts. Do not migrate unrelated page-local UI as part of a feature fix.
- Streak calculations and UTC-day bucketing belong in [pure streak helpers](middlewareNode/src/utils/streak.js); HTTP authorization and request handling stay in [the streak route](middlewareNode/src/routes/streak.js). For streak changes, check [helper tests](middlewareNode/tests/utils.streak.test.js), [route tests](middlewareNode/tests/streak.test.js), and [route security tests](middlewareNode/tests/routeSecurity.test.js).
- Preserve the authenticated `POST /puzzles/solved` contract: `puzzleId` alone must not earn currency; validate the submitted `moves` sequence against the stored solution before emitting rewards. Keep promotion-shorthand handling aligned with the client and preserve invalid-solution/repeat-reward regression coverage in [puzzle currency tests](middlewareNode/tests/puzzles.currencyEmit.test.js). Matching the answer key is not proof that a client actually played the puzzle.

## Feature documentation

- Analytics API contracts and examples: [Analytics development guide](documentation/AnalyticsDevGuide.md).
- Student-vs-student work: [design](documentation/student-vs-student-design.md) and [feature guide](documentation/student-vs-student-feature-guide.md).
- Consult these documents for feature-specific details rather than duplicating them here; verify documentation against current implementation when they disagree.
- Keep this file current when changes affect architecture, commands, environment requirements, shared component contracts, or testing workflows. Verify guidance against current code and replace stale rules; keep implementation details in feature documentation rather than adding a running changelog here.