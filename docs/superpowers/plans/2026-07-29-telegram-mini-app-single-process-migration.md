# Telegram Mini App Single-Process Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Telegram Mini App backend into the existing bot process while preserving the current frontend and API behavior and replacing its standalone Express/`pg` backend with the bot's TypeORM infrastructure.

**Architecture:** The existing process initializes `DbModule`, runs migrations, and launches `BotModule` and `TgAppModule`. `TgAppModule` owns a native Node HTTP server and static-file delivery; `TgAppController` translates HTTP input/output; `TgAppService` owns Telegram authentication, allowlist, state mapping, and Mini App rules; `TgAppDao` performs all database work through the existing TypeORM `DataSource` and entities. Rank assignment locks the rank row in a transaction so concurrent requests cannot assign one rank twice.

**Tech Stack:** Node.js 22 native HTTP, TypeScript 6, TypeORM 1.1, PostgreSQL, Telegraf 4, React 19, Vite 8, Node's built-in test runner, Biome 2.

## Global Constraints

- Keep a single long-running backend process: the existing bot process also owns the Mini App HTTP server.
- Reuse `DbModule`, `RankEntity`, `UserEntity`, `RankToUserEntity`, and `ChangelogEntity`.
- Do not reuse legacy `AssignService`; Mini App assignment is globally unique per rank and never increments an existing assignment counter.
- Preserve the current frontend UI, navigation, API paths, request bodies, response bodies, Telegram bridge behavior, and CSS.
- Preserve `src/tg-app/vite.config.ts` `allowedHosts`, including the user-added ngrok host.
- Keep exactly three allowed Telegram users: `Noeter`, `hobo_with_a_hookah`, and `ConeConundrum`, identified by their existing numeric Telegram IDs.
- Production API requests must validate Telegram `initData`, reject sessions older than one hour, and use the authenticated Telegram user as changelog actor.
- Development may use `DEV_TELEGRAM_USER_ID`; production must never accept that bypass.
- Mini App HTTP listens on `TG_APP_PORT=3000` by default and does not share the bot webhook port.
- `GET /health` remains unauthenticated.
- `GET /api/state` and `POST /api/ranks/:rankId/assign` retain their current contracts.
- Assignment must be atomic: lock rank, reject missing rank with `404`, reject an already assigned rank with `409`, insert assignment and changelog in one transaction, then return refreshed state.
- Unexpected server errors return `500 {"error":"Internal server error"}` and never leak database or credential details.
- Limit JSON request bodies to 8 KiB.
- Do not add Express, another ORM, another DB pool, or a dependency-injection framework.
- Remove the standalone Mini App backend, backend-only dependencies, backend build, and separate Mini App Docker service artifacts.
- Keep user-owned unstaged changes out of unrelated commits; the `dotenv` package/import disappear only in the dedicated standalone-backend removal commit.

---

## Target File Map

### New backend files

- `src/config/tg-app.config.ts` — parse and validate Mini App port, static directory, and development identity.
- `src/modules/tg-app/tg-app.dao.ts` — TypeORM state reads and transactional assignment.
- `src/modules/tg-app/tg-app.service.ts` — Telegram auth, allowlist, response mapping, and assignment rules.
- `src/modules/tg-app/tg-app.controller.ts` — pure HTTP request dispatch and error-to-response mapping.
- `src/modules/tg-app/tg-app.module.ts` — native HTTP lifecycle, body parsing, response writing, SPA/static delivery.

### New tests

- `test/tg-app/auth.test.js` — Telegram signature, expiry, allowlist, and development bypass.
- `test/tg-app/service.test.js` — state mapping and Mini App assignment rules with a fake DAO.
- `test/tg-app/http.test.js` — real ephemeral native HTTP server with a fake service.
- `test/integration/tg-app-dao.test.js` — real PostgreSQL schema, TypeORM transaction, audit row, and two-request conflict.

### Modified integration files

- `src/config/index.ts` — export `TgAppConfig`.
- `src/modules/index.ts` — export the singleton `TgAppModule`.
- `src/modules/bot/bot.module.ts` — retain the Telegraf instance and expose graceful `close()`.
- `src/index.ts` — launch DB, migrations, bot, and HTTP module in one process.
- `package.json` — run root unit and integration test groups and build frontend with bot.
- `.github/workflows/push.yml` — install/test/build both root and nested frontend packages.
- `.env.example` — document `TG_APP_PORT`, `TG_APP_STATIC_DIR`, and `DEV_TELEGRAM_USER_ID`.
- `src/tg-app/package.json` and lockfile — retain only frontend/runtime-test dependencies.
- `src/tg-app/tsconfig.json` — remove standalone server from the compilation set.
- `src/tg-app/vite.config.ts` — keep existing host configuration and proxy API to the bot process.
- `src/tg-app/README.md` and root `README.md` — document single-process production and two-terminal frontend development.

### Removed standalone-backend files

- `src/tg-app/server.ts`
- `src/tg-app/tsconfig.server.json`
- `src/tg-app/test/auth.test.ts`
- `src/tg-app/test/server.test.ts`
- `src/tg-app/Dockerfile`
- `src/tg-app/.dockerignore`

---

### Task 1: Add Mini App configuration and root test harness

**Files:**
- Create: `src/config/tg-app.config.ts`
- Modify: `src/config/index.ts`
- Modify: `package.json`
- Modify: `.env.example`
- Test: `test/tg-app/config.test.js`

**Interfaces:**
- Produces: `TgAppConfig` with `{ port, staticDirectory, devTelegramUserId }`.
- Produces: root scripts `test:unit`, `test:integration`, and `test`.
- Consumes: existing `NODE_ENV`, `BOT_TOKEN`, and bot configuration without changing their behavior.

- [ ] **Step 1: Add a failing configuration test**

Create `test/tg-app/config.test.js` using `node:test` and a cache-clearing import helper:

```js
require('ts-node/register');

const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');

const ENV_KEYS = [
  'TG_APP_PORT',
  'TG_APP_STATIC_DIR',
  'DEV_TELEGRAM_USER_ID',
];
const ORIGINAL_ENV = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  delete require.cache[require.resolve('../../src/config/tg-app.config')];
});

const loadConfig = () => {
  delete require.cache[require.resolve('../../src/config/tg-app.config')];
  return require('../../src/config/tg-app.config').TgAppConfig;
};

test('uses port 3000 by default', () => {
  delete process.env.TG_APP_PORT;
  assert.equal(loadConfig().port, 3000);
});

test('reads explicit Mini App settings', () => {
  process.env.TG_APP_PORT = '4100';
  process.env.TG_APP_STATIC_DIR = '/tmp/ranks-web';
  process.env.DEV_TELEGRAM_USER_ID = '142166671';

  assert.deepEqual(loadConfig(), {
    port: 4100,
    staticDirectory: '/tmp/ranks-web',
    devTelegramUserId: 142166671,
  });
});

test('rejects an invalid port', () => {
  process.env.TG_APP_PORT = 'nope';
  assert.throws(() => loadConfig(), /TG_APP_PORT must be an integer/);
});
```

- [ ] **Step 2: Add root test scripts and verify the test fails**

Update root scripts:

```json
{
  "scripts": {
    "test": "npm run test:unit",
    "test:unit": "node test/reply-in-chunks.test.js && node --test test/tg-app/*.test.js",
    "test:integration": "node --test test/integration/*.test.js"
  }
}
```

Run:

```bash
volta run --node 22.21.1 --npm 10.9.4 npm run test:unit
```

Expected: FAIL because `src/config/tg-app.config.ts` does not exist.

- [ ] **Step 3: Implement strict, local configuration**

Create `src/config/tg-app.config.ts`:

```ts
const parseInteger = (name: string, value: string | undefined, fallback?: number) => {
  if (value === undefined && fallback !== undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer`);
  }
  return parsed;
};

const TgAppConfig = {
  port: parseInteger('TG_APP_PORT', process.env.TG_APP_PORT, 3000),
  staticDirectory: process.env.TG_APP_STATIC_DIR,
  devTelegramUserId: process.env.DEV_TELEGRAM_USER_ID
    ? parseInteger('DEV_TELEGRAM_USER_ID', process.env.DEV_TELEGRAM_USER_ID)
    : undefined,
};

export { TgAppConfig };
```

Export it from `src/config/index.ts` and add these keys to `.env.example`:

```dotenv
TG_APP_PORT=3000
TG_APP_STATIC_DIR=
DEV_TELEGRAM_USER_ID=142166671
```

- [ ] **Step 4: Run configuration tests and static checks**

Run:

```bash
volta run --node 22.21.1 --npm 10.9.4 npm run test:unit
volta run --node 22.21.1 --npm 10.9.4 npm run check
volta run --node 22.21.1 --npm 10.9.4 npm run build
```

Expected: all commands exit `0`.

- [ ] **Step 5: Commit**

```bash
git add .env.example package.json src/config/index.ts src/config/tg-app.config.ts test/tg-app/config.test.js
git commit -m "feat(tg-app): add embedded server config"
```

---

### Task 2: Port Telegram authentication and Mini App service rules

**Files:**
- Create: `src/modules/tg-app/tg-app.service.ts`
- Test: `test/tg-app/auth.test.js`
- Test: `test/tg-app/service.test.js`

**Interfaces:**
- Produces: `TgAppError(status, message)`.
- Produces: `TgAppService.authenticate(authorization, nowSeconds?)`.
- Produces: `TgAppService.getState(authorization)` and `assign(authorization, rankId, recipientId)`.
- Consumes: a narrow DAO interface with `getState()` and `assignRank({ rankId, recipientId, actorId })`.

- [ ] **Step 1: Port authentication tests as failing root tests**

Move the signature helper and cases from `src/tg-app/test/auth.test.ts` into
`test/tg-app/auth.test.js`, using `node:test`:

```js
require('ts-node/register');

const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { test } = require('node:test');
const {
  TgAppError,
  TgAppService,
} = require('../../src/modules/tg-app/tg-app.service');

const TOKEN = '123456:telegram-test-token';
const NOW_SECONDS = 1_900_000_000;

const signedInitData = (user, authDate = NOW_SECONDS) => {
  const values = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
    user: JSON.stringify(user),
  });
  const check = [...values.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  values.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return values.toString();
};

const dao = {
  async getState() {
    return { availableRanks: [], assignments: [] };
  },
  async assignRank() {},
};

test('accepts valid signed initData for an allowed user', () => {
  const service = new TgAppService({
    dao,
    botToken: TOKEN,
    environment: 'production',
  });
  const initData = signedInitData({
    id: 142166671,
    first_name: 'Yanis',
    username: 'hobo_with_a_hookah',
  });

  assert.equal(service.authenticate(`tma ${initData}`, NOW_SECONDS).id, 142166671);
});
```

Add cases for tampering, expiry at 3601 seconds, future dates beyond 60 seconds,
missing/invalid user JSON, outsider ID, missing production header, and
development identity disabled in production.

- [ ] **Step 2: Add failing service behavior tests**

Create `test/tg-app/service.test.js` with a fake DAO:

```js
require('ts-node/register');

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { TgAppService } = require('../../src/modules/tg-app/tg-app.service');

const createDao = () => {
  const calls = [];
  return {
    calls,
    async getState() {
      return {
        availableRanks: [{ id: 65, title: 'Кукурузный макрогол' }],
        assignments: [
          {
            rank: { id: 1, title: 'Стоянов' },
            user: { id: 546166718, username: 'Noeter' },
            count: 1,
          },
        ],
      };
    },
    async assignRank(input) {
      calls.push(input);
    },
  };
};

test('maps DAO state to the existing frontend contract', async () => {
  const service = new TgAppService({
    dao: createDao(),
    environment: 'development',
    devTelegramUserId: 142166671,
  });

  const state = await service.getState(undefined);
  assert.deepEqual(state.availableRanks, [
    { id: 65, title: 'Кукурузный макрогол' },
  ]);
  assert.equal(state.users.length, 3);
  assert.equal(state.assignedByUser[0].ranks[0].title, 'Стоянов');
  assert.deepEqual(state.assignedByUser[1].ranks, []);
});

test('passes authenticated actor to DAO assignment and refreshes state', async () => {
  const dao = createDao();
  const service = new TgAppService({
    dao,
    environment: 'development',
    devTelegramUserId: 142166671,
  });

  await service.assign(undefined, 65, 546166718);
  assert.deepEqual(dao.calls, [
    { rankId: 65, recipientId: 546166718, actorId: 142166671 },
  ]);
});
```

Also test invalid rank IDs and recipients outside the three-user allowlist.

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
volta run --node 22.21.1 --npm 10.9.4 npm run test:unit
```

Expected: FAIL because `TgAppService` does not exist.

- [ ] **Step 4: Implement authentication and service rules**

Create `src/modules/tg-app/tg-app.service.ts` with these public shapes:

```ts
export class TgAppError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface TgAppDaoPort {
  getState(): Promise<{
    availableRanks: { id: number; title: string }[];
    assignments: {
      rank: { id: number; title: string };
      user: { id: number; username: string };
      count: number;
    }[];
  }>;
  assignRank(input: {
    rankId: number;
    recipientId: number;
    actorId: number;
  }): Promise<void>;
}

export class TgAppService {
  constructor(options: {
    dao: TgAppDaoPort;
    botToken?: string;
    environment: string;
    devTelegramUserId?: number;
  });

  authenticate(authorization: string | undefined, nowSeconds?: number): TelegramUser;
  getState(authorization: string | undefined): Promise<AppState>;
  assign(
    authorization: string | undefined,
    rankId: number,
    recipientId: number,
  ): Promise<AppState>;
}
```

Move the existing HMAC algorithm without changing it:

- require a 64-character hexadecimal `hash`;
- remove `hash` before sorting fields;
- derive secret with `HMAC_SHA256("WebAppData", botToken)`;
- calculate the data-check HMAC and compare with `timingSafeEqual`;
- require integer `auth_date`;
- reject age greater than 3600 seconds and dates more than 60 seconds ahead;
- parse and validate the Telegram user;
- allow only IDs `546166718`, `142166671`, and `383288860`.

Keep the three display records in this file so auth and state mapping use one
allowlist. Add a private `loadState()` mapper used by both public methods.
`getState()` authenticates and calls `loadState()`. `assign()` validates
`rankId` and `recipientId`, authenticates the actor, calls `dao.assignRank()`,
and returns `loadState()` without authenticating a second time.

- [ ] **Step 5: Run unit tests and commit**

Run:

```bash
volta run --node 22.21.1 --npm 10.9.4 npm run test:unit
volta run --node 22.21.1 --npm 10.9.4 npm run check
volta run --node 22.21.1 --npm 10.9.4 npm run build
```

Expected: all commands exit `0`.

```bash
git add src/modules/tg-app/tg-app.service.ts test/tg-app/auth.test.js test/tg-app/service.test.js
git commit -m "feat(tg-app): port authentication and rules"
```

---

### Task 3: Implement the TypeORM DAO and prove concurrency behavior

**Files:**
- Create: `src/modules/tg-app/tg-app.dao.ts`
- Test: `test/integration/tg-app-dao.test.js`
- Modify: `package.json`

**Interfaces:**
- Implements: `TgAppDaoPort`.
- Consumes: existing `DbModule` and the four existing entities.
- Produces: `getState()` and `assignRank()` using only repositories from the active `DataSource` or transaction manager.

- [ ] **Step 1: Add a failing PostgreSQL integration test**

Create `test/integration/tg-app-dao.test.js`. Require `TEST_DB_URL`; fail with a
clear message instead of silently skipping:

```js
require('reflect-metadata');
require('ts-node/register');

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { after, before, test } = require('node:test');
const { DataSource } = require('typeorm');
const { TgAppDao } = require('../../src/modules/tg-app/tg-app.dao');
const {
  ChangelogEntity,
  RankEntity,
  RankToUserEntity,
  UserEntity,
} = require('../../src/modules/db/entities');
const {
  SnakeNamingStrategy,
} = require('../../src/modules/db/snake-naming.strategy');

if (!process.env.TEST_DB_URL) {
  throw new Error('TEST_DB_URL is required for tg-app DAO integration tests');
}

const schema = `tg_app_test_${randomUUID().replaceAll('-', '')}`;
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.TEST_DB_URL,
  schema,
  entities: [RankEntity, UserEntity, RankToUserEntity, ChangelogEntity],
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: true,
});
```

In `before`, create the schema with a short-lived raw `pg` client, initialize
the test `DataSource`, and seed three users plus one available rank. In `after`,
destroy the `DataSource` and execute:

```sql
DROP SCHEMA "<generated_schema>" CASCADE
```

The schema name is generated by the test itself and must be validated against
`/^tg_app_test_[a-f0-9]+$/` before interpolation.

Add these assertions:

1. `getState()` returns the unassigned rank and all existing assignments.
2. A successful assignment writes one `RankToUserEntity` and one
   `ChangelogEntity` with the authenticated actor.
3. A missing rank rejects with `TgAppError(404, "Rank not found")`.
4. An already assigned rank rejects with
   `TgAppError(409, "Rank is already assigned")`.
5. Two simultaneous assignments of the same rank produce exactly one fulfilled
   promise, one `409`, and one database row.

- [ ] **Step 2: Verify the integration test fails**

Start local PostgreSQL and run:

```bash
docker compose up -d postgres
TEST_DB_URL=postgresql://ranks-bot:test_password@localhost:5432/ranks_bot \
  volta run --node 22.21.1 --npm 10.9.4 npm run test:integration
```

Expected: FAIL because `TgAppDao` does not exist.

- [ ] **Step 3: Implement TypeORM state reads**

Create `src/modules/tg-app/tg-app.dao.ts`:

```ts
export class TgAppDao implements TgAppDaoPort {
  constructor(private readonly dataSource: DataSource = DbModule) {}

  async getState() {
    const rankRepository = this.dataSource.getRepository(RankEntity);
    const assignmentRepository =
      this.dataSource.getRepository(RankToUserEntity);

    const [availableRanks, assignments] = await Promise.all([
      rankRepository
        .createQueryBuilder('rank')
        .where((query) => {
          const assigned = query
            .subQuery()
            .select('1')
            .from(RankToUserEntity, 'assignment')
            .where('assignment.rank_id = rank.id')
            .getQuery();
          return `NOT EXISTS ${assigned}`;
        })
        .orderBy('rank.id', 'ASC')
        .getMany(),
      assignmentRepository.find({
        relations: { rank: true, user: true },
        order: { user: { id: 'ASC' }, rank: { id: 'ASC' } },
      }),
    ]);

    return { availableRanks, assignments };
  }
}
```

Use entity properties in returned data; do not introduce raw SQL row adapters or
a second `pg.Pool`.

- [ ] **Step 4: Implement locked transactional assignment**

Add:

```ts
async assignRank({ rankId, recipientId, actorId }: AssignRankInput) {
  await this.dataSource.transaction(async (manager) => {
    const rankRepository = manager.getRepository(RankEntity);
    const assignmentRepository = manager.getRepository(RankToUserEntity);
    const userRepository = manager.getRepository(UserEntity);
    const changelogRepository = manager.getRepository(ChangelogEntity);

    const rank = await rankRepository.findOne({
      where: { id: rankId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!rank) throw new TgAppError(404, 'Rank not found');

    const existing = await assignmentRepository.findOne({
      where: { rank: { id: rankId } },
    });
    if (existing) {
      throw new TgAppError(409, 'Rank is already assigned');
    }

    const recipient = await userRepository.findOneBy({ id: recipientId });
    const actor = await userRepository.findOneBy({ id: actorId });
    if (!recipient) throw new TgAppError(400, 'Invalid recipient');
    if (!actor) throw new TgAppError(401, 'User is not allowed');

    const assignment = await assignmentRepository.save({
      rank,
      user: recipient,
      comment: '',
      count: 1,
    });
    await changelogRepository.save({
      type: 'insert',
      table: 'ranks_to_users',
      objectId: assignment.id,
      user: actor,
      currentValue: rank.title,
    });
  });
}
```

The lock must be on `RankEntity`, not only on an assignment lookup: two requests
for a currently unassigned rank must serialize before either checks
`ranks_to_users`.

- [ ] **Step 5: Run integration and regression tests**

Run:

```bash
TEST_DB_URL=postgresql://ranks-bot:test_password@localhost:5432/ranks_bot \
  volta run --node 22.21.1 --npm 10.9.4 npm run test:integration
volta run --node 22.21.1 --npm 10.9.4 npm run test:unit
volta run --node 22.21.1 --npm 10.9.4 npm run check
volta run --node 22.21.1 --npm 10.9.4 npm run build
```

Expected: one winner and one `409` in the concurrency test; all commands exit
`0`; generated test schema is removed.

- [ ] **Step 6: Commit**

```bash
git add package.json src/modules/tg-app/tg-app.dao.ts test/integration/tg-app-dao.test.js
git commit -m "feat(tg-app): use TypeORM rank store"
```

---

### Task 4: Add native HTTP controller and module

**Files:**
- Create: `src/modules/tg-app/tg-app.controller.ts`
- Create: `src/modules/tg-app/tg-app.module.ts`
- Test: `test/tg-app/http.test.js`

**Interfaces:**
- `TgAppController.dispatch(request)` returns `{ status, body } | null`.
- `createTgAppModule(options)` returns only `{ launch(): Promise<void>, close(): Promise<void> }`.
- `TgAppModule` is the production singleton created with `TgAppService` and `TgAppDao`.

- [ ] **Step 1: Write failing HTTP contract tests**

Create `test/tg-app/http.test.js` with `node:test`. Start the module on port `0`,
retrieve its bound address through a test-only `onListening` callback, and use
Node 22 global `fetch`.

Cover:

```js
test('health is public', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test('state preserves the API response', async () => {
  const response = await fetch(`${baseUrl}/api/state`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), apiState);
});

test('assignment passes route id, body user id, and auth header', async () => {
  const response = await fetch(`${baseUrl}/api/ranks/65/assign`, {
    method: 'POST',
    headers: {
      authorization: 'tma signed-data',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ userId: 546166718 }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(service.assignCalls, [
    ['tma signed-data', 65, 546166718],
  ]);
});
```

Also cover malformed JSON, body over 8 KiB (`413`), invalid rank/user (`400`),
known service errors (`401`, `404`, `409`), hidden unexpected errors (`500`),
unknown API path (`404`), static asset MIME type, SPA fallback, and path traversal
rejection.

- [ ] **Step 2: Run HTTP tests to verify they fail**

Run:

```bash
volta run --node 22.21.1 --npm 10.9.4 npm run test:unit
```

Expected: FAIL because controller/module files do not exist.

- [ ] **Step 3: Implement the transport-neutral controller**

Create `src/modules/tg-app/tg-app.controller.ts`:

```ts
export interface TgAppHttpRequest {
  method: string;
  pathname: string;
  authorization?: string;
  body?: unknown;
}

export interface TgAppHttpResponse {
  status: number;
  body: unknown;
}

export class TgAppController {
  constructor(private readonly service: TgAppService) {}

  async dispatch(
    request: TgAppHttpRequest,
  ): Promise<TgAppHttpResponse | null> {
    if (request.method === 'GET' && request.pathname === '/api/state') {
      return {
        status: 200,
        body: await this.service.getState(request.authorization),
      };
    }

    const match = request.pathname.match(/^\/api\/ranks\/([^/]+)\/assign$/);
    if (request.method === 'POST' && match) {
      const rankId = Number(match[1]);
      const recipientId = (request.body as { userId?: unknown } | undefined)?.userId;
      return {
        status: 200,
        body: await this.service.assign(
          request.authorization,
          rankId,
          Number(recipientId),
        ),
      };
    }

    return null;
  }
}
```

`TgAppService`, not the controller, remains the source of validation and auth
rules.

- [ ] **Step 4: Implement native HTTP lifecycle and JSON handling**

Create `src/modules/tg-app/tg-app.module.ts` using only `node:http`,
`node:fs/promises`, `node:path`, and `node:url`.

Required public interface:

```ts
export interface TgAppServer {
  launch(): Promise<void>;
  close(): Promise<void>;
}

interface TgAppModuleOptions {
  controller: TgAppController;
  port: number;
  staticDirectory?: string;
  logError(error: unknown): void;
  onListening?(port: number): void;
}

export declare const createTgAppModule: (
  options: TgAppModuleOptions,
) => TgAppServer;
```

Implementation requirements:

- `launch()` is idempotent and resolves after the socket is listening.
- `close()` is idempotent and resolves after active listening stops.
- `GET /health` returns JSON without authentication.
- API requests read at most 8192 bytes; abort and return `413` when exceeded.
- JSON parse failures return `400 {"error":"Invalid JSON body"}`.
- `authorization` accepts only the first string header value.
- `TgAppError` preserves its status/message.
- unexpected errors are logged and converted to the generic `500` response.
- every JSON response sets `content-type: application/json; charset=utf-8`.
- static paths are decoded, normalized, resolved under `staticDirectory`, and
  rejected if the resolved path escapes that directory.
- existing files use explicit MIME types for `.html`, `.js`, `.css`, `.svg`,
  `.png`, `.jpg`, `.webp`, `.ico`, and `.json`.
- non-API `GET` misses return `index.html` for SPA navigation.
- `/api/*` misses return JSON `404`, never the SPA.

Create the production singleton at the bottom:

```ts
const service = new TgAppService({
  dao: new TgAppDao(DbModule),
  botToken: TelegramConfig.token,
  environment: AppConfig.env,
  devTelegramUserId: TgAppConfig.devTelegramUserId,
});

export const TgAppModule = createTgAppModule({
  controller: new TgAppController(service),
  port: TgAppConfig.port,
  staticDirectory:
    TgAppConfig.staticDirectory ??
    path.resolve(process.cwd(), 'src/tg-app/dist/web'),
  logError: (error) => LoggerModule.error(error),
});
```

- [ ] **Step 5: Run HTTP, unit, and build checks**

Run:

```bash
volta run --node 22.21.1 --npm 10.9.4 npm run test:unit
volta run --node 22.21.1 --npm 10.9.4 npm run check
volta run --node 22.21.1 --npm 10.9.4 npm run build
```

Expected: all HTTP cases and legacy tests pass; no Biome diagnostics.

- [ ] **Step 6: Commit**

```bash
git add src/modules/tg-app/tg-app.controller.ts src/modules/tg-app/tg-app.module.ts test/tg-app/http.test.js
git commit -m "feat(tg-app): embed native HTTP server"
```

---

### Task 5: Wire the module into the bot lifecycle

**Files:**
- Modify: `src/modules/index.ts`
- Modify: `src/modules/bot/bot.module.ts`
- Modify: `src/index.ts`
- Test: `test/tg-app/lifecycle.test.js`

**Interfaces:**
- Consumes: `TgAppModule.launch()` and `TgAppModule.close()`.
- Preserves: database initialization and seed ordering before either consumer starts.
- Produces: one process owning bot, database connection, and Mini App HTTP server.

- [ ] **Step 1: Extract and test launch ordering**

Export a small `launchApplication` function from `src/index.ts` that accepts
ordinary arguments for testability:

```ts
interface ApplicationModules {
  db: {
    initialize(): Promise<unknown>;
    runMigrations(): Promise<unknown>;
    destroy(): Promise<unknown>;
  };
  bot: {
    launch(): Promise<void>;
    close(reason?: string): Promise<void>;
  };
  tgApp: {
    launch(): Promise<void>;
    close(): Promise<void>;
  };
}

export const launchApplication = async ({
  db,
  bot,
  tgApp,
}: ApplicationModules) => {
  await db.initialize();
  await db.runMigrations();
  try {
    await Promise.all([bot.launch(), tgApp.launch()]);
  } catch (error) {
    await Promise.allSettled([
      bot.close('startup failure'),
      tgApp.close(),
      db.destroy(),
    ]);
    throw error;
  }
};
```

Create `test/tg-app/lifecycle.test.js` and assert:

```js
test('database is ready before bot and Mini App launch', async () => {
  const events = [];
  await launchApplication({
    db: {
      async initialize() { events.push('db:init'); },
      async runMigrations() { events.push('db:migrate'); },
      async destroy() { events.push('db:close'); },
    },
    bot: {
      async launch() { events.push('bot'); },
      async close() { events.push('bot:close'); },
    },
    tgApp: {
      async launch() { events.push('tg-app'); },
      async close() { events.push('tg-app:close'); },
    },
  });

  assert.deepEqual(events.slice(0, 2), ['db:init', 'db:migrate']);
  assert.deepEqual(new Set(events.slice(2)), new Set(['bot', 'tg-app']));
});
```

Guard the real entry point so importing `src/index.ts` in the test does not
launch Telegram or open sockets. Call `main()` only inside:

```ts
if (require.main === module) {
  void main();
}
```

Add a second test where `bot.launch()` rejects after `tgApp.launch()` resolves;
assert `bot.close()`, `tgApp.close()`, and `db.destroy()` are all attempted.

- [ ] **Step 2: Verify the lifecycle test fails**

Run:

```bash
volta run --node 22.21.1 --npm 10.9.4 npm run test:unit
```

Expected: FAIL because `launchApplication` is not exported.

- [ ] **Step 3: Export and launch `TgAppModule`**

Update `src/modules/index.ts`:

```ts
import { TgAppModule } from './tg-app/tg-app.module';

export { BotModule, DbModule, LoggerModule, TgAppModule };
```

Update `src/modules/bot/bot.module.ts` to keep the created `Telegraf` instance
on the module and add:

```ts
async close(reason = 'application shutdown'): Promise<void> {
  this.bot?.stop(reason);
}
```

`close()` must be safe before launch and after a previous close.

Update the production call in `src/index.ts`:

```ts
void launchApplication({
  db: DbModule,
  bot: BotModule,
  tgApp: TgAppModule,
}).then(() => {
  LoggerModule.info('bot and Telegram Mini App online');
}).catch((error: Error) => {
  LoggerModule.error(error);
  process.exitCode = 1;
});
```

Register one shutdown function that calls `TgAppModule.close()` and
`BotModule.close()`, then destroys `DbModule` when initialized. Make the handler
idempotent so `SIGINT` and `SIGTERM` cannot run cleanup twice. Do not call
`process.exit()` inside a module; let Node exit after open handles close.

- [ ] **Step 4: Run lifecycle and legacy regression tests**

Run:

```bash
volta run --node 22.21.1 --npm 10.9.4 npm run test:unit
volta run --node 22.21.1 --npm 10.9.4 npm run check
volta run --node 22.21.1 --npm 10.9.4 npm run build
```

Expected: DB ordering test, HTTP tests, auth tests, service tests, and legacy
reply chunk tests all pass.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts src/modules/index.ts src/modules/bot/bot.module.ts test/tg-app/lifecycle.test.js
git commit -m "feat(tg-app): launch HTTP with bot process"
```

---

### Task 6: Convert `src/tg-app` into a frontend-only package

**Files:**
- Delete: `src/tg-app/server.ts`
- Delete: `src/tg-app/tsconfig.server.json`
- Delete: `src/tg-app/test/auth.test.ts`
- Delete: `src/tg-app/test/server.test.ts`
- Delete: `src/tg-app/Dockerfile`
- Delete: `src/tg-app/.dockerignore`
- Modify: `src/tg-app/package.json`
- Modify: `src/tg-app/package-lock.json`
- Modify: `src/tg-app/tsconfig.json`
- Verify unchanged: `src/tg-app/web/App.tsx`
- Verify unchanged: `src/tg-app/web/main.tsx`
- Verify unchanged: `src/tg-app/web/styles.css`
- Preserve: `src/tg-app/vite.config.ts`

**Interfaces:**
- Keeps: frontend `GET /api/state` and `POST /api/ranks/:rankId/assign` calls.
- Removes: standalone Express app, standalone `pg.Pool`, standalone backend entry point, and separate backend image.
- Keeps: Vite proxy to `http://localhost:3000`.

- [ ] **Step 1: Capture the frontend regression baseline**

Run before deletion:

```bash
cd src/tg-app
volta run --node 22.21.1 --npm 10.9.4 npm test
volta run --node 22.21.1 --npm 10.9.4 npm run build
```

Expected: 31 tests pass and Vite emits `dist/web`.

- [ ] **Step 2: Remove backend-only files**

Delete exactly:

```text
src/tg-app/server.ts
src/tg-app/tsconfig.server.json
src/tg-app/test/auth.test.ts
src/tg-app/test/server.test.ts
src/tg-app/Dockerfile
src/tg-app/.dockerignore
```

This deliberately removes the user's local `import 'dotenv/config'` from
`server.ts`; the root bot already loads dotenv in development and no standalone
server remains.

- [ ] **Step 3: Remove backend-only packages and scripts**

In `src/tg-app/package.json`:

- remove dependencies `dotenv`, `express`, and `pg`;
- remove dev dependencies `@types/express`, `@types/pg`,
  `@types/supertest`, `concurrently`, `supertest`, and `tsx`;
- change `dev` to `vite`;
- remove `dev:server` and `start`;
- change `build` to `npm run typecheck && vite build`;
- keep React, React DOM, Vite, Vitest, Testing Library, TypeScript, Node types,
  and Biome.

Run:

```bash
cd src/tg-app
npm_config_registry=https://registry.npmjs.org/ \
  volta run --node 22.21.1 --npm 10.9.4 npm install
```

Expected: lockfile no longer contains direct Express, `pg`, Supertest, or
dotenv packages.

- [ ] **Step 4: Restrict frontend TypeScript inputs**

Change `src/tg-app/tsconfig.json`:

```json
{
  "include": ["contract.ts", "vite.config.ts", "web", "test"]
}
```

Do not touch `web/App.tsx`, `web/main.tsx`, or `web/styles.css`. Keep the full
existing `server.proxy` and `allowedHosts` object in `vite.config.ts`.

- [ ] **Step 5: Run frontend and root regressions**

Run:

```bash
cd src/tg-app
volta run --node 22.21.1 --npm 10.9.4 npm run check
volta run --node 22.21.1 --npm 10.9.4 npm test
volta run --node 22.21.1 --npm 10.9.4 npm run build
cd ../..
volta run --node 22.21.1 --npm 10.9.4 npm run test:unit
volta run --node 22.21.1 --npm 10.9.4 npm run build
```

Expected: only the two removed backend Vitest files reduce the Mini App test
count; all remaining frontend tests pass and frontend output is unchanged in
shape.

- [ ] **Step 6: Commit only the frontend-package conversion**

```bash
git add src/tg-app
git commit -m "refactor(tg-app): remove standalone backend"
```

Before committing, inspect `git diff --cached -- src/tg-app/vite.config.ts` and
verify the user-added ngrok `allowedHosts` entry remains.

---

### Task 7: Build, CI, documentation, and end-to-end verification

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/push.yml`
- Modify: `README.md`
- Modify: `src/tg-app/README.md`

**Interfaces:**
- `npm run build` produces both `build/index.js` and `src/tg-app/dist/web`.
- `npm start` launches one process serving bot, API, and built frontend.
- Local development uses root bot/API plus nested Vite HMR server.

- [ ] **Step 1: Make the root build own both artifacts**

Change root scripts:

```json
{
  "scripts": {
    "build": "npm run build:bot && npm run build:tg-app",
    "build:bot": "tsc -p .",
    "build:tg-app": "npm --prefix src/tg-app run build",
    "check": "biome check src test && npm --prefix src/tg-app run check",
    "test": "npm run test:unit && npm --prefix src/tg-app test"
  }
}
```

Keep `test:integration` separate because it requires PostgreSQL.

- [ ] **Step 2: Update CI for the nested frontend package**

In every workflow job that checks or builds:

```yaml
- name: Install root dependencies
  run: npm ci
- name: Install Mini App dependencies
  run: npm --prefix src/tg-app ci
```

Add a PostgreSQL service and integration step:

```yaml
services:
  postgres:
    image: postgres:17
    env:
      POSTGRES_USER: ranks-bot
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: ranks_bot
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U ranks-bot -d ranks_bot"
      --health-interval 5s
      --health-timeout 5s
      --health-retries 10

- name: Test TypeORM integration
  env:
    TEST_DB_URL: postgresql://ranks-bot:test_password@localhost:5432/ranks_bot
  run: npm run test:integration
```

Pin PostgreSQL to `17` instead of `latest` in CI so lock behavior is
reproducible. Do not change the local Compose image in this task.

- [ ] **Step 3: Rewrite deployment documentation**

Root README must state:

```text
Development terminal 1:
  docker compose up -d postgres
  npm run dev

Development terminal 2:
  npm --prefix src/tg-app run dev

Production:
  npm ci
  npm --prefix src/tg-app ci
  npm run build
  npm start
```

Document:

- `TG_APP_PORT=3000`;
- optional `TG_APP_STATIC_DIR`;
- `DEV_TELEGRAM_USER_ID` only outside production;
- `BOT_TOKEN` signs both bot traffic and Mini App `initData`;
- reverse proxy sends Mini App HTTPS traffic to `TG_APP_PORT`;
- bot webhook continues using `WEBHOOK_PORT`;
- there is one backend process and one TypeORM connection pool.

Remove every claim in `src/tg-app/README.md` that the directory is deployed as a
second service or owns its own `DB_URL`.

- [ ] **Step 4: Run clean-install verification**

Run:

```bash
npm_config_registry=https://registry.npmjs.org/ \
  volta run --node 22.21.1 --npm 10.9.4 npm ci
npm_config_registry=https://registry.npmjs.org/ \
  volta run --node 22.21.1 --npm 10.9.4 npm --prefix src/tg-app ci

volta run --node 22.21.1 --npm 10.9.4 npm run check
volta run --node 22.21.1 --npm 10.9.4 npm test
TEST_DB_URL=postgresql://ranks-bot:test_password@localhost:5432/ranks_bot \
  volta run --node 22.21.1 --npm 10.9.4 npm run test:integration
volta run --node 22.21.1 --npm 10.9.4 npm run build
npm_config_registry=https://registry.npmjs.org/ \
  volta run --node 22.21.1 --npm 10.9.4 npm audit
npm_config_registry=https://registry.npmjs.org/ \
  volta run --node 22.21.1 --npm 10.9.4 npm --prefix src/tg-app audit
docker compose config --quiet
git diff --check
```

Expected:

- root and frontend checks have zero diagnostics;
- legacy, auth, service, HTTP, lifecycle, frontend, and integration tests pass;
- conflict test has one success and one `409`;
- both builds exist;
- both audits report zero vulnerabilities;
- Compose config is valid;
- integration schema is removed.

- [ ] **Step 5: Perform one-process smoke test**

Use a test bot token or disable external bot launch through the existing
testable `launchApplication` boundary. Against local PostgreSQL:

1. Start the built root process with `TG_APP_PORT=3000`.
2. Request `GET http://localhost:3000/health` and expect `{"ok":true}`.
3. Request `/` and verify built `index.html` is returned.
4. In development mode, request `/api/state` and verify three users plus
   available/assigned ranks.
5. Assign one disposable unassigned rank in a temporary integration schema.
6. Verify it disappears from `availableRanks`, appears once under the selected
   user, and creates one changelog row.
7. Stop the process and verify port `3000` and DB connections close.

Do not run this smoke against the friends' real database.

- [ ] **Step 6: Commit the integration boundary**

```bash
git add .github/workflows/push.yml README.md package.json src/tg-app/README.md
git commit -m "build(tg-app): integrate bot and frontend lifecycle"
```

---

## Acceptance Checklist

- [ ] Only one backend process runs.
- [ ] Only existing root `DbModule` owns PostgreSQL connections.
- [ ] No `express`, standalone Mini App `pg`, or second ORM remains.
- [ ] Frontend source and visual behavior are unchanged.
- [ ] Existing `allowedHosts` customization remains.
- [ ] Telegram signature, expiry, production bypass rejection, and three-user allowlist are covered.
- [ ] State endpoint returns globally unassigned ranks and assignments grouped by all three users.
- [ ] Assignment transaction locks the rank and records authenticated actor.
- [ ] Concurrent assignment test proves exactly one winner.
- [ ] Native server handles health, JSON limit, errors, static assets, SPA fallback, and traversal defense.
- [ ] DB initialization and migrations finish before bot/API launch.
- [ ] Root build includes frontend artifact.
- [ ] CI installs both lockfiles and runs PostgreSQL integration coverage.
- [ ] Standalone backend, Dockerfile, backend tests, scripts, and dependencies are removed.
- [ ] Root and Mini App audits report zero vulnerabilities.
