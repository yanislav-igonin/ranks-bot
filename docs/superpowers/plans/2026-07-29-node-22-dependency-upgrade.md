# Node 22 Dependency Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the bot and Mini App toolchains on Node.js 22, replace ESLint with Biome, and move every maintained package to its newest stable compatible version through independently verified commits.

**Architecture:** Preserve the existing CommonJS bot and nested Mini App package boundaries. Upgrade independent packages one at a time; group only migrations whose peer dependencies or public APIs cannot form a green intermediate commit. Keep database and bot framework migrations local to their existing modules.

**Tech Stack:** Node.js 22.21.1, npm 10.9.4, TypeScript 6.0.3, Biome 2.5.6, TypeORM 1.1.0, Telegraf 4.16.3, PostgreSQL.

## Global Constraints

- Target Node.js `22.21.1` and npm `10.9.4`.
- Declare Node.js in both `engines` and `volta`.
- Use latest stable compatible package versions; do not select prereleases.
- Keep every committed state testable and buildable.
- Preserve `docker-compose.yml`; remove production Docker and Swarm files.
- Preserve all existing user-owned uncommitted changes under `src/tg-app`.
- Never stage user-owned `dotenv`, server, or Vite host changes in migration commits.
- Replace all maintained ESLint and Prettier tooling with Biome.
- Run focused checks, root tests, root build, and applicable Mini App checks before each commit.

## File Map

- `package.json`, `package-lock.json`: root runtime, scripts, and dependency versions.
- `src/tg-app/package.json`, `src/tg-app/package-lock.json`: Mini App toolchain.
- `biome.json`, `src/tg-app/biome.json`: bot and Mini App lint/format policies.
- `.github/workflows/push.yml`, `.github/workflows/release.yml`: Node 22 and Biome CI checks.
- `src/modules/db/db.module.ts`: TypeORM `DataSource`.
- `src/modules/db/snake-naming.strategy.ts`: local stable snake_case naming policy.
- `src/modules/db/dao/*.ts`: repositories obtained from the initialized `DataSource`.
- `src/modules/db/seeds/0-initial-seeds.migration.ts`: migration-scoped repositories.
- `src/modules/bot/bot.module.ts`, `src/modules/bot/interfaces/*.ts`,
  `src/middlewares/auth.middleware.ts`: Telegraf 4 APIs and built-in types.
- `src/modules/logger.module.ts`: Pino 10 logger construction.
- `.husky/pre-push`: modern Husky hook.

---

### Task 1: Remove unused production deployment files

**Files:**
- Delete: `production.Dockerfile`
- Delete: `production.docker-swarm.yml`
- Preserve: `docker-compose.yml`

**Interfaces:**
- Consumes: current local Compose workflow.
- Produces: repository without unused Swarm deployment artifacts.

- [ ] **Step 1: Verify exact deletion targets**

Run: `git status --short production.Dockerfile production.docker-swarm.yml docker-compose.yml`

Expected: no existing changes to the three files.

- [ ] **Step 2: Delete only production deployment files**

Use `apply_patch` to delete `production.Dockerfile` and
`production.docker-swarm.yml`. Do not modify `docker-compose.yml`.

- [ ] **Step 3: Verify local Compose remains valid**

Run: `docker compose config --quiet`

Expected: exit `0`, or report Docker CLI unavailability without changing files.

- [ ] **Step 4: Commit**

```bash
git add production.Dockerfile production.docker-swarm.yml
git commit -m "chore: remove unused production Docker config"
```

### Task 2: Pin Node.js 22 and npm

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/tg-app/package.json`
- Modify: `src/tg-app/package-lock.json`

**Interfaces:**
- Consumes: Volta and npm package metadata.
- Produces: `engines.node = "22.x"` and exact Volta Node/npm pins.

- [ ] **Step 1: Add runtime metadata to the root package**

Add:

```json
"engines": {
  "node": "22.x",
  "npm": "10.x"
},
"volta": {
  "node": "22.21.1",
  "npm": "10.9.4"
}
```

- [ ] **Step 2: Add matching runtime metadata to the Mini App**

Apply the same `engines` and `volta` values to `src/tg-app/package.json` while
preserving its uncommitted `dotenv` entry.

- [ ] **Step 3: Refresh lockfile metadata**

Run `npm install --package-lock-only` in the root and `src/tg-app`.

For Mini App staging, construct an index-only patch from the `HEAD` package
files containing only `engines` and `volta`. Keep the user's `dotenv` lockfile
delta unstaged.

- [ ] **Step 4: Verify Volta and clean installs**

Run:

```bash
node --version
npm --version
npm ci
npm test
npm run build
```

Expected: Node `v22.21.1`, npm `10.9.4`, tests and build pass.

- [ ] **Step 5: Commit only runtime metadata**

```bash
git diff --cached --check
git commit -m "chore: pin Node.js 22 with Volta"
```

### Task 3: Replace ESLint with Biome

**Files:**
- Create: `biome.json`
- Create: `src/tg-app/biome.json`
- Delete: `.eslintrc.yml`
- Delete: `src/tg-app/eslint.config.js`
- Modify: `package.json`, `package-lock.json`
- Modify: `src/tg-app/package.json`, `src/tg-app/package-lock.json`
- Modify: `.github/workflows/push.yml`
- Modify: `.github/workflows/release.yml`
- Modify: TypeScript files containing `eslint-disable` comments

**Interfaces:**
- Consumes: root `src`/`test` and Mini App source/config files.
- Produces: `lint`, `format`, `format:check`, and `check` scripts backed solely
  by `@biomejs/biome@2.5.6`.

- [ ] **Step 1: Replace root lint dependencies**

Remove:

```text
eslint
eslint-config-airbnb-typescript
eslint-plugin-import
@typescript-eslint/eslint-plugin
@typescript-eslint/parser
```

Install `@biomejs/biome@2.5.6` as a dev dependency.

- [ ] **Step 2: Add root Biome scripts**

Set:

```json
"lint": "biome lint src test",
"format": "biome format --write src test",
"format:check": "biome format src test",
"check": "biome check src test"
```

- [ ] **Step 3: Add root Biome configuration**

Create `biome.json` with schema `2.5.6`, two-space indentation, single quotes
for JavaScript, trailing commas, recommended linter rules, and no unsafe fixes.

- [ ] **Step 4: Replace Mini App ESLint tooling**

Remove its ESLint packages and config, add `@biomejs/biome@2.5.6`, matching
scripts, and `src/tg-app/biome.json`. Preserve the user's existing Mini App
package changes through index-only staging.

- [ ] **Step 5: Remove obsolete inline directives**

Delete `eslint-disable-next-line` comments. Keep the underlying control flow and
imports unchanged; configure only necessary Biome exceptions at the narrowest
file or rule scope.

- [ ] **Step 6: Format and verify both packages**

Run:

```bash
npm run format
npm run check
npm test
npm run build
cd src/tg-app
npm run format
npm run check
npm test
npm run build
```

Expected: all commands pass.

- [ ] **Step 7: Commit the atomic toolchain replacement**

Stage only Biome/toolchain changes and commit:

```bash
git commit -m "chore: replace ESLint with Biome"
```

### Task 4: Upgrade TypeScript and Node typings

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: CommonJS TypeScript sources using legacy decorators.
- Produces: TypeScript `6.0.3` build with Node 22 typings `22.20.1`.

- [ ] **Step 1: Upgrade TypeScript**

Run: `npm install --save-dev typescript@6.0.3`

- [ ] **Step 2: Resolve TypeScript 6 configuration diagnostics**

Keep CommonJS output and legacy decorators. Update deprecated compiler options
only when `npm run build` reports them; do not convert the project to ESM.

- [ ] **Step 3: Verify and commit TypeScript**

Run `npm test && npm run build && npm run check`.

Commit: `build: upgrade TypeScript to 6.0`

- [ ] **Step 4: Upgrade Node 22 typings**

Run: `npm install --save-dev @types/node@22.20.1`

- [ ] **Step 5: Verify and commit Node typings**

Run `npm test && npm run build && npm run check`.

Commit: `build: align Node typings with Node 22`

### Task 5: Upgrade TypeScript execution and development packages

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: `ts-node@10.9.2`, `dotenv@17.4.2`, and `nodemon@3.1.14`.

- [ ] **Step 1: Upgrade and verify ts-node**

Run:

```bash
npm install --save-dev ts-node@10.9.2
npm test && npm run build && npm run check
```

Commit: `build: upgrade ts-node`

- [ ] **Step 2: Upgrade and verify dotenv**

Run:

```bash
npm install --save-dev dotenv@17.4.2
npm test && npm run build && npm run check
```

Commit: `build: upgrade dotenv`

- [ ] **Step 3: Upgrade and verify nodemon**

Run:

```bash
npm install --save-dev nodemon@3.1.14
npm test && npm run build && npm run check
```

Commit: `build: upgrade nodemon`

### Task 6: Upgrade PostgreSQL and reflection packages

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: `pg@8.22.0` and `reflect-metadata@0.2.2`.

- [ ] **Step 1: Upgrade and verify pg**

Run:

```bash
npm install pg@8.22.0
npm test && npm run build && npm run check
```

Commit: `build: upgrade pg`

- [ ] **Step 2: Upgrade and verify reflect-metadata**

Run:

```bash
npm install reflect-metadata@0.2.2
npm test && npm run build && npm run check
```

Commit: `build: upgrade reflect-metadata`

### Task 7: Migrate TypeORM

**Files:**
- Create: `src/modules/db/snake-naming.strategy.ts`
- Modify: `src/modules/db/db.module.ts`
- Modify: `src/modules/db/dao/*.ts`
- Modify: `src/modules/db/seeds/0-initial-seeds.migration.ts`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: exported initialized `DataSource` named `DbModule`.
- Preserves: existing entity table/column names and migration behavior.

- [ ] **Step 1: Install TypeORM 1.1 and remove external naming strategy**

Run:

```bash
npm uninstall typeorm-naming-strategies
npm install typeorm@1.1.0
```

- [ ] **Step 2: Replace ConnectionManager with DataSource**

Construct `DbModule` directly with `new DataSource({...})`. Replace
`DbModule.connect()` with `DbModule.initialize()` in `src/index.ts`.

- [ ] **Step 3: Preserve snake_case naming**

Extend TypeORM's `DefaultNamingStrategy`, overriding table, column, relation,
join-column, join-table, and join-table-column names with TypeORM's `snakeCase`
utility. Match the installed `NamingStrategyInterface` signatures exactly.

- [ ] **Step 4: Migrate repositories**

Keep each DAO local. Continue obtaining repositories through
`DbModule.getRepository(Entity)`. Replace removed repository helpers such as
`findByIds` with `findBy({ id: In(ids) })`.

- [ ] **Step 5: Scope seed repositories to the migration transaction**

Use the `QueryRunner` passed to `up` and `down`:

```ts
const repository = queryRunner.manager.getRepository(Entity);
```

This prevents seed work from escaping the migration transaction.

- [ ] **Step 6: Verify TypeORM migration**

Run:

```bash
npm test
npm run build
npm run check
npm ls typeorm typeorm-naming-strategies
```

Expected: one TypeORM `1.1.0`, no naming-strategies package, all checks pass.

- [ ] **Step 7: Commit**

Commit: `refactor: migrate database layer to TypeORM 1.1`

### Task 8: Migrate Telegraf

**Files:**
- Modify: `src/modules/bot/bot.module.ts`
- Modify: `src/modules/bot/interfaces/TextContext.ts`
- Modify: `src/modules/bot/interfaces/UserContext.ts`
- Modify: `src/middlewares/auth.middleware.ts`
- Modify: controllers that access text messages
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: Telegraf `4.16.3` bot using built-in `typegram` types.
- Preserves: commands, authorization, webhook/polling selection, and replies.

- [ ] **Step 1: Upgrade Telegraf and remove telegram-typings**

Run:

```bash
npm uninstall telegram-typings
npm install telegraf@4.16.3
```

- [ ] **Step 2: Update imports and context narrowing**

Use named `Telegraf`, `Context`, and `MiddlewareFn` exports. Build text context
from Telegraf's narrowed message update types instead of `telegram-typings`.

- [ ] **Step 3: Update lifecycle calls**

Use `await bot.launch()` for polling. Keep the existing webhook launch options
with `domain`, `hookPath`, and `port`. Remove the private v3 `startPolling()`
call.

- [ ] **Step 4: Verify behavior**

Run:

```bash
npm test
npm run build
npm run check
npm ls telegraf telegram-typings
```

Expected: Telegraf `4.16.3`, no telegram-typings, all checks pass.

- [ ] **Step 5: Commit**

Commit: `refactor: migrate bot to Telegraf 4`

### Task 9: Upgrade logging

**Files:**
- Modify: `src/modules/logger.module.ts`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: Pino `10.3.1`, pino-pretty `13.1.3`, no external Pino typings.

- [ ] **Step 1: Upgrade Pino and remove obsolete typings**

Run:

```bash
npm uninstall @types/pino
npm install pino@10.3.1
```

Adapt logger construction only if TypeScript reports a changed call signature.

- [ ] **Step 2: Verify and commit Pino**

Run `npm test && npm run build && npm run check`.

Commit: `build: upgrade Pino`

- [ ] **Step 3: Upgrade pino-pretty**

Run: `npm install pino-pretty@13.1.3`

- [ ] **Step 4: Verify and commit formatter**

Run `npm test && npm run build && npm run check`.

Commit: `build: upgrade pino-pretty`

### Task 10: Upgrade stable ngrok

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: stable `ngrok@3.4.1`; explicitly excludes beta `5.0.0-beta.2`.

- [ ] **Step 1: Upgrade**

Run: `npm install ngrok@3.4.1`

- [ ] **Step 2: Verify**

Run `npm test && npm run build && npm run check`.

- [ ] **Step 3: Commit**

Commit: `build: upgrade ngrok`

### Task 11: Upgrade Husky

**Files:**
- Create: `.husky/pre-push`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: Husky `9.1.7` pre-push hook running static checks, tests, and build.

- [ ] **Step 1: Replace package-level Husky configuration**

Remove the legacy top-level `husky` object and install:

```bash
npm install --save-dev husky@9.1.7
```

Add `"prepare": "husky"` to scripts.

- [ ] **Step 2: Create hook**

Create executable `.husky/pre-push` containing:

```sh
npm run check
npm test
npm run build
```

- [ ] **Step 3: Verify**

Run:

```bash
npm run prepare
.husky/pre-push
```

Expected: hook exits `0`.

- [ ] **Step 4: Commit**

Commit: `build: upgrade Husky hooks`

### Task 12: Final dependency and repository verification

**Files:**
- Modify only when a verification failure proves a required compatibility fix.
- Document retained versions in final handoff.

**Interfaces:**
- Produces: reproducible Node 22 builds with no unintended outdated package.

- [ ] **Step 1: Clean-install root and Mini App**

Run:

```bash
npm ci
cd src/tg-app && npm ci
```

- [ ] **Step 2: Run complete checks**

Run:

```bash
npm run check
npm test
npm run build
cd src/tg-app
npm run check
npm test
npm run build
```

- [ ] **Step 3: Audit dependency state**

Run:

```bash
npm ls --depth=0
npm outdated --json
cd src/tg-app
npm ls --depth=0
npm outdated --json
```

Expected retained exceptions:

- TypeScript remains on `6.0.3` if TypeScript 7 cannot run with the selected
  execution toolchain.
- `@types/node` remains on the latest Node 22 line rather than Node 26.
- ngrok remains on stable `3.4.1` rather than beta `5.0.0-beta.2`.

- [ ] **Step 4: Run startup smoke check**

Launch the compiled application with test-safe environment values long enough
to prove module loading and configuration parsing. Stop before it performs
external Telegram or PostgreSQL mutations. Report unavailable credentials as an
environment limitation, not a passing integration test.

- [ ] **Step 5: Review final diff and history**

Run:

```bash
git diff --check
git status --short
git log --oneline --decorate -20
```

Confirm only the user's original Mini App changes remain unstaged.

- [ ] **Step 6: Perform code review**

Use the repository code-review skill after all local verification. Fix any
correctness findings and rerun the complete check set before reporting success.
