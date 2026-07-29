# Telegram Mini App Development Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `DEV_TELEGRAM_USER_ID` with the existing `USERS` allowlist and skip Telegram authentication entirely in development.

**Architecture:** `AuthConfig.users` becomes the single access allowlist passed into `TgAppService`. Production still validates signed Telegram `initData` and then checks the authenticated ID against that list. Development returns the first configured user as the technical changelog actor without reading or validating the authorization header.

**Tech Stack:** TypeScript 6, Node.js 22 test runner, Telegram Web App HMAC authentication.

## Global Constraints

- Keep the three fixed Mini App recipients and frontend state contract unchanged.
- Keep production Telegram signature and one-hour expiry validation unchanged.
- Use the first `USERS` ID only as the development changelog actor.
- Do not add dependencies or configuration variables.

---

### Task 1: Unify Mini App access configuration

**Files:**
- Modify: `test/tg-app/config.test.js`
- Modify: `test/tg-app/auth.test.js`
- Modify: `test/tg-app/service.test.js`
- Modify: `src/config/tg-app.config.ts`
- Modify: `src/modules/tg-app/tg-app.service.ts`
- Modify: `src/modules/tg-app/tg-app.module.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `src/tg-app/README.md`

**Interfaces:**
- Consumes: `AuthConfig.users: number[]`.
- Produces: `new TgAppService({ dao, botToken, environment, allowedTelegramUserIds })`.
- Preserves: `authenticate(authorization, nowSeconds?)`, `getState()`, and `assign()`.

- [ ] **Step 1: Write failing configuration and authentication tests**

Update the configuration expectation to:

```js
assert.deepEqual(loadConfig(), {
  port: 4100,
  staticDirectory: '/tmp/ranks-web',
});
```

Construct production services with:

```js
new TgAppService({
  dao,
  botToken: TOKEN,
  environment: 'production',
  allowedTelegramUserIds: [546166718, 142166671, 383288860],
});
```

Add development coverage:

```js
const service = new TgAppService({
  dao,
  environment: 'development',
  allowedTelegramUserIds: [383288860, 142166671],
});
assert.equal(service.authenticate('invalid Telegram data').id, 383288860);
```

Add production coverage proving a signed ID must be present in
`allowedTelegramUserIds`, and service coverage proving assignment passes the
first configured development ID as `actorId`.

- [ ] **Step 2: Run tests and verify the old interface fails**

Run:

```bash
volta run --node 22.21.1 --npm 10.9.4 \
  node --test test/tg-app/config.test.js test/tg-app/auth.test.js test/tg-app/service.test.js
```

Expected: FAIL because the service still consumes `devTelegramUserId` and the
Mini App config still exposes it.

- [ ] **Step 3: Implement the unified allowlist**

Remove `devTelegramUserId` from `TgAppConfig`.

Change the service constructor to:

```ts
constructor(options: {
  dao: TgAppDaoPort;
  botToken?: string;
  environment: string;
  allowedTelegramUserIds: number[];
})
```

At the start of `authenticate`, return this development actor without parsing
the authorization header:

```ts
if (this.environment === 'development') {
  const actorId = this.allowedTelegramUserIds[0];
  if (!Number.isInteger(actorId)) {
    throw new TgAppError(401, 'User is not allowed');
  }
  return { id: actorId, first_name: 'Development user' };
}
```

After production signature validation, enforce:

```ts
if (!this.allowedTelegramUserIds.includes(user.id)) {
  throw new TgAppError(401, 'User is not allowed');
}
```

Pass `AuthConfig.users` from the production module and update every test
constructor.

- [ ] **Step 4: Remove the obsolete environment variable and update docs**

Delete `DEV_TELEGRAM_USER_ID` from `.env.example`, `README.md`,
`src/tg-app/README.md`, config tests, and source. Document that `USERS` controls
production access and its first entry is the local development actor.

- [ ] **Step 5: Run complete verification**

Run:

```bash
volta run --node 22.21.1 --npm 10.9.4 npm run check
volta run --node 22.21.1 --npm 10.9.4 npm test
TEST_DB_URL=postgresql://ranks-bot:test_password@localhost:5432/ranks_bot \
  volta run --node 22.21.1 --npm 10.9.4 npm run test:integration
volta run --node 22.21.1 --npm 10.9.4 npm run build
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit and publish**

```bash
git add .env.example README.md src test docs/superpowers/plans/2026-07-29-tg-app-development-auth.md
git commit -m "fix(tg-app): use shared user allowlist"
git push
```

Fast-forward the user's `feature/tg-app` checkout to the published commit
without touching its ignored `.env`.
