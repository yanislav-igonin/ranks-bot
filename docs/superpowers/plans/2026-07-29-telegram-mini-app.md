# Telegram Mini App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Telegram Mini App that lists unassigned ranks, assigns one atomically to one of three fixed friends, and groups all assigned ranks by friend.

**Architecture:** A nested Node 22 package in `src/tg-app` contains an Express API and a React/Vite client. The API validates Telegram init data and talks directly to the existing PostgreSQL schema through `pg`; the client is a three-view state machine using Telegram theme and navigation APIs.

**Tech Stack:** Node.js 22, TypeScript 5, Express 5, PostgreSQL/`pg`, React 19, Vite, Vitest, Testing Library.

## Global Constraints

- Leave all existing bot source, package, configuration, and deployment files unchanged.
- Keep all application implementation and package configuration in `src/tg-app`.
- Eligible users are exactly Telegram IDs `546166718`, `142166671`, and `383288860`.
- Validate production requests with Telegram `initData`, a one-hour maximum age, and `BOT_TOKEN`.
- Treat a rank as available only when it has no row in `ranks_to_users`.
- Serialize assignment with a PostgreSQL transaction and `SELECT ... FOR UPDATE`.
- Write the authenticated Telegram user as the assignment actor in `changelogs`.
- Do not add rank editing, deletion, unassignment, comments, or counter editing.
- Support Telegram light/dark themes, safe areas, native Back Button, haptics, loading, empty, error, and reduced-motion states.
- Require Node.js `>=22`.

## File Map

- `src/tg-app/package.json` — isolated commands and dependencies.
- `src/tg-app/tsconfig.json` — strict shared type-check configuration.
- `src/tg-app/tsconfig.server.json` — server emission to `dist/server`.
- `src/tg-app/vite.config.ts` — web build, test environment, and dev proxy.
- `src/tg-app/index.html` — Telegram bridge and web entry.
- `src/tg-app/contract.ts` — JSON contracts and fixed user metadata.
- `src/tg-app/server.ts` — init-data auth, PostgreSQL store, API, and static hosting.
- `src/tg-app/web/App.tsx` — three-screen UI and application state.
- `src/tg-app/web/main.tsx` — browser/Telegram adapter and mount.
- `src/tg-app/web/styles.css` — complete responsive visual system.
- `src/tg-app/test/auth.test.ts` — signed init-data behavior.
- `src/tg-app/test/server.test.ts` — store and HTTP API behavior.
- `src/tg-app/test/App.test.tsx` — user-visible navigation and assignment.
- `src/tg-app/README.md` — local, production, and BotFather setup.

---

### Task 1: Isolated package and Telegram authentication

**Files:**
- Create: `src/tg-app/package.json`
- Create: `src/tg-app/tsconfig.json`
- Create: `src/tg-app/tsconfig.server.json`
- Create: `src/tg-app/vite.config.ts`
- Create: `src/tg-app/contract.ts`
- Create: `src/tg-app/server.ts`
- Test: `src/tg-app/test/auth.test.ts`

**Interfaces:**
- Produces: `FIXED_USERS`, `AppState`, `validateInitData(raw, token, now?)`, and `authenticateRequest(req, env)`.
- `validateInitData` returns the authenticated Telegram user payload or throws an `AuthError`.

- [ ] **Step 1: Create package/tooling configuration**

Add scripts for `dev`, `test`, `typecheck`, `lint`, `build`, and `start`.
Configure strict TypeScript, React JSX, Node/DOM libraries, Vite's `/api`
proxy to port `3000`, and Vitest with `jsdom`.

- [ ] **Step 2: Install package dependencies**

Run: `npm install`

Expected: nested `package-lock.json` is created with Node 22-compatible
versions of Express, React, Vite, Vitest, `pg`, and test tooling.

- [ ] **Step 3: Write failing authentication tests**

Cover hand-built signed fixtures for:

```ts
expect(validateInitData(validRaw, token, now).id).toBe(142166671);
expect(() => validateInitData(tamperedRaw, token, now)).toThrow('Invalid Telegram signature');
expect(() => validateInitData(expiredRaw, token, now)).toThrow('Telegram session expired');
expect(() => authenticateRequest(nonAllowlistedRequest, env)).toThrow('User is not allowed');
```

- [ ] **Step 4: Run the auth test and verify RED**

Run: `npm test -- test/auth.test.ts`

Expected: FAIL because `validateInitData` and `authenticateRequest` do not exist.

- [ ] **Step 5: Implement minimal authentication and contracts**

Use Node `crypto.createHmac`, alphabetical query-field sorting,
`timingSafeEqual`, JSON parsing, a one-hour age limit, and the fixed allowlist.
Permit `DEV_TELEGRAM_USER_ID` only outside production.

- [ ] **Step 6: Run auth tests and verify GREEN**

Run: `npm test -- test/auth.test.ts`

Expected: all authentication cases pass.

- [ ] **Step 7: Commit**

```bash
git add src/tg-app/package.json src/tg-app/package-lock.json \
  src/tg-app/tsconfig*.json src/tg-app/vite.config.ts \
  src/tg-app/contract.ts src/tg-app/server.ts src/tg-app/test/auth.test.ts
git commit -m "feat(tg-app): validate Telegram sessions"
```

### Task 2: PostgreSQL state and atomic assignment

**Files:**
- Modify: `src/tg-app/server.ts`
- Test: `src/tg-app/test/server.test.ts`

**Interfaces:**
- Consumes: `FIXED_USERS`, `AppState`.
- Produces: `RankStore` with `getState(): Promise<AppState>` and
  `assign(rankId: number, recipientId: number, actorId: number): Promise<AppState>`.
- Produces: `createPostgresStore(pool)` and typed `AppError`.

- [ ] **Step 1: Write failing state-mapping tests**

Use a recording fake SQL client with literal result rows. Verify:

```ts
expect(state.availableRanks).toEqual([{ id: 65, title: 'Кукурузный макрогол' }]);
expect(state.assignedByUser[0].ranks[0]).toEqual({
  id: 1, title: 'Стоянов', count: 1,
});
```

Also verify all three fixed users are present even when one has no ranks.

- [ ] **Step 2: Run state tests and verify RED**

Run: `npm test -- test/server.test.ts -t state`

Expected: FAIL because the PostgreSQL store is missing.

- [ ] **Step 3: Implement state queries**

Query available ranks with `NOT EXISTS`, query assignments joined to users and
ranks, order deterministically, and map only fixed users into the contract.

- [ ] **Step 4: Run state tests and verify GREEN**

Run: `npm test -- test/server.test.ts -t state`

Expected: state mapping tests pass.

- [ ] **Step 5: Write failing transaction tests**

Verify exact observable transaction behavior:

- `BEGIN` precedes rank lock;
- an unknown rank rolls back and throws `404`;
- an existing assignment rolls back and throws `409`;
- a valid assignment inserts `ranks_to_users`, inserts a changelog with the
  actor ID, commits, and returns refreshed state;
- a SQL failure rolls back.

- [ ] **Step 6: Run assignment tests and verify RED**

Run: `npm test -- test/server.test.ts -t assign`

Expected: FAIL because assignment is missing.

- [ ] **Step 7: Implement minimal atomic assignment**

Validate the recipient against `FIXED_USERS`, lock the rank row, recheck global
assignment, insert assignment and changelog, commit, then call `getState`.
Always release the pooled client in `finally`.

- [ ] **Step 8: Run server tests and verify GREEN**

Run: `npm test -- test/server.test.ts`

Expected: all store tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/tg-app/server.ts src/tg-app/test/server.test.ts
git commit -m "feat(tg-app): add atomic rank store"
```

### Task 3: Authenticated JSON API and static server

**Files:**
- Modify: `src/tg-app/server.ts`
- Modify: `src/tg-app/test/server.test.ts`

**Interfaces:**
- Consumes: `RankStore`, `authenticateRequest`.
- Produces: `createApp({ store, env })` and executable server startup.
- Routes: `GET /health`, `GET /api/state`,
  `POST /api/ranks/:rankId/assign`.

- [ ] **Step 1: Write failing HTTP behavior tests**

Using Supertest and an in-memory `RankStore`, verify:

```ts
expect((await request(app).get('/health')).body).toEqual({ ok: true });
expect((await authorized(request(app).get('/api/state'))).status).toBe(200);
expect((await unauthorized(request(app).get('/api/state'))).status).toBe(401);
expect((await authorized(request(app).post('/api/ranks/65/assign')
  .send({ userId: 546166718 }))).status).toBe(200);
```

Also cover malformed rank IDs, invalid recipients, `404`, `409`, and generic
`500` bodies.

- [ ] **Step 2: Run API tests and verify RED**

Run: `npm test -- test/server.test.ts -t API`

Expected: FAIL because `createApp` and routes are missing.

- [ ] **Step 3: Implement minimal API and startup**

Add JSON limits, auth middleware only under `/api`, route validation, stable
error bodies, static `dist/web` hosting in production, SPA fallback, pool
creation from `DB_URL`, signal shutdown, and port `3000` default.

- [ ] **Step 4: Run server tests and verify GREEN**

Run: `npm test -- test/server.test.ts`

Expected: store and HTTP tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/tg-app/server.ts src/tg-app/test/server.test.ts
git commit -m "feat(tg-app): expose rank API"
```

### Task 4: Three-screen Telegram interface

**Files:**
- Create: `src/tg-app/index.html`
- Create: `src/tg-app/web/App.tsx`
- Create: `src/tg-app/web/main.tsx`
- Create: `src/tg-app/web/styles.css`
- Test: `src/tg-app/test/App.test.tsx`

**Interfaces:**
- Consumes: `AppState`, `FIXED_USERS`, `GET /api/state`,
  `POST /api/ranks/:rankId/assign`.
- Produces: `App({ api, telegram })`, `ApiClient`, and the browser mount.

- [ ] **Step 1: Write failing initial-screen tests**

Render with a real React component and a small in-memory API. Verify loading,
available rank rows, empty state, API retry, and the assigned-ranks action.

- [ ] **Step 2: Run UI tests and verify RED**

Run: `npm test -- test/App.test.tsx`

Expected: FAIL because `App` does not exist.

- [ ] **Step 3: Implement available and assigned screens**

Add explicit `loading | ready | error` request state, a `list | assigned`
view, rank counts, grouped sections for all users, retry, and accessible
buttons/headings.

- [ ] **Step 4: Run screen tests and verify GREEN**

Run: `npm test -- test/App.test.tsx`

Expected: available/assigned screen tests pass.

- [ ] **Step 5: Write failing assignment-flow tests**

Verify selecting a rank opens the recipient view, Telegram Back Button returns
to the list, one recipient click disables duplicate submission, successful
assignment triggers success haptic and returns to refreshed list, and a `409`
refreshes into a recoverable error.

- [ ] **Step 6: Run assignment-flow tests and verify RED**

Run: `npm test -- test/App.test.tsx -t assign`

Expected: FAIL because recipient selection is missing.

- [ ] **Step 7: Implement assignment and Telegram bridge**

Implement the selected-rank view, API call, toast, Back Button subscription,
`ready()`, `expand()`, haptics, `Authorization` header, and cleanup of Telegram
event handlers.

- [ ] **Step 8: Build the visual system**

Implement the Telegram-native match-room direction with theme CSS variables,
condensed display typography, numbered rank rows, player monograms, fixed
bottom navigation, safe-area padding, 44px minimum targets, staggered entry,
light/dark fallbacks, focus visibility, and `prefers-reduced-motion`.

- [ ] **Step 9: Run UI tests and verify GREEN**

Run: `npm test -- test/App.test.tsx`

Expected: all UI behavior tests pass without warnings.

- [ ] **Step 10: Commit**

```bash
git add src/tg-app/index.html src/tg-app/web src/tg-app/test/App.test.tsx
git commit -m "feat(tg-app): add rank assignment UI"
```

### Task 5: Documentation and full verification

**Files:**
- Create: `src/tg-app/README.md`
- Modify only if verification finds a defect:
  `src/tg-app/server.ts`, `src/tg-app/web/*`, `src/tg-app/test/*`

**Interfaces:**
- Documents: environment, local commands, HTTPS/BotFather setup, production
  build/start, and the legacy deployment boundary.

- [ ] **Step 1: Write package documentation**

Document exact commands, variables, development fallback identity, the need for
HTTPS, and BotFather's Main Mini App/menu-button configuration. State that this
package does not automatically alter the legacy bot deployment.

- [ ] **Step 2: Run package verification**

Run:

```bash
cd src/tg-app
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: every command exits `0`, tests report zero failures, and
`dist/server/server.js` plus `dist/web/index.html` exist.

- [ ] **Step 3: Run legacy regression verification**

Run from repository root:

```bash
npm test
npm run build
```

Expected: both existing commands exit `0`, proving the isolated package did not
break the legacy bot.

- [ ] **Step 4: Inspect final scope**

Run:

```bash
git status --short
git diff --check master...HEAD
git diff --stat master...HEAD
git diff --name-only master...HEAD
```

Expected: implementation changes are confined to `src/tg-app` and the two
design/plan documents.

- [ ] **Step 5: Commit**

```bash
git add src/tg-app/README.md
git commit -m "docs(tg-app): add setup guide"
```
