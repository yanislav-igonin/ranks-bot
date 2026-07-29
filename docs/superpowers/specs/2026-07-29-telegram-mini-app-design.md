# Telegram Mini App Design

## Goal

Add a standalone Telegram Mini App for assigning the existing ranks to one of
three friends. The legacy bot remains unchanged.

## Scope

The first release has three screens:

1. **Available ranks** — every rank that has no row in `ranks_to_users`.
2. **Assign rank** — the selected rank and the three eligible recipients.
3. **Assigned ranks** — all assignments grouped by recipient.

The app does not add, rename, delete, unassign, or edit ranks. It does not edit
comments or counters. Those legacy bot capabilities stay outside this app.

## Fixed users

Telegram's Bot API does not provide a general method for enumerating every
human member of a group. The app therefore uses the three existing seeded
users:

| Telegram ID | Username |
| ---: | --- |
| `546166718` | `@Noeter` |
| `142166671` | `@hobo_with_a_hookah` |
| `383288860` | `@ConeConundrum` |

The same allowlist controls both who can open the app and who can receive a
rank. This is intentionally local to the private friend group.

## Considered approaches

### 1. Standalone nested application (chosen)

Create an isolated package in `src/tg-app` with a React/Vite client and a small
Node HTTP API. It reads the existing PostgreSQL tables directly through `pg`.

This keeps the old TypeScript 3.9/Telegraf 3 application untouched, allows a
modern frontend toolchain, and makes deployment independent. Direct SQL is
small and explicit for the three required operations.

### 2. Extend the legacy process

Add HTTP routes and static assets to the existing bot process, reusing TypeORM
entities and DAOs. This reduces deployed processes but requires changing the
legacy entry point, old dependencies, and runtime lifecycle. It conflicts with
the requirement to leave current code alone.

### 3. Client-only Mini App using `sendData`

Send a selected rank and user back to the bot from the browser. This avoids an
HTTP API but requires changing bot update handlers, provides an awkward
read/query path, and cannot safely enforce atomic assignment. It is rejected.

## Architecture

`src/tg-app` is a self-contained npm package:

- `server` validates Telegram `initData`, authorizes the current Telegram ID,
  serves the built frontend, queries state, and performs assignments.
- `web` renders the three-screen mobile interface and calls the JSON API.
- `shared` contracts are kept local to the package and imported by both sides.
- Tests run with Vitest and cover authentication, rank state mapping,
  assignment conflicts, API behavior, and user-visible flows.

The API surface is deliberately small:

- `GET /api/state`
  - returns `availableRanks`, fixed `users`, and `assignedByUser`;
- `POST /api/ranks/:rankId/assign`
  - accepts `{ "userId": number }`;
  - returns the refreshed state after a successful assignment;
- `GET /health`
  - returns process health without database or Telegram authentication.

Production API requests send raw `Telegram.WebApp.initData` in the
`Authorization: tma <initData>` header.

## Authentication and authorization

The backend:

1. Parses the raw init-data query string.
2. Removes `hash`, sorts remaining entries, and builds Telegram's newline
   separated data-check string.
3. Derives the secret with HMAC-SHA-256 using `WebAppData` and `BOT_TOKEN`.
4. Compares signatures with a timing-safe comparison.
5. Rejects data older than one hour.
6. Parses `user` and requires its numeric ID to be in the fixed allowlist.

`initDataUnsafe` is never trusted by the server. Development outside Telegram
is allowed only when `NODE_ENV` is not `production`, using
`DEV_TELEGRAM_USER_ID`; it defaults to `142166671`.

## Data rules

- A rank is available only when no assignment row references it.
- A successful selection creates exactly one `ranks_to_users` row with
  `count = 1` and an empty comment.
- The authenticated Telegram user is written as the actor in `changelogs`.
- Assignment runs in a PostgreSQL transaction.
- The rank row is locked with `SELECT ... FOR UPDATE`; after locking, the API
  checks again for any assignment. Concurrent requests therefore cannot assign
  the same rank twice.
- A missing rank returns `404`.
- An already assigned rank returns `409` and the client refreshes its state.
- An invalid recipient returns `400`.
- Database and unexpected failures return a generic `500`; secrets and SQL
  details are not exposed to the browser.

No schema migration is required. Legacy rows with `count > 1` are displayed
with their count. Existing duplicate assignments, if any, are displayed under
each owner, but the app never creates new duplicates.

## Interface

The visual direction is **Telegram-native match room**: fast, compact, and
mobile-first, with a dark scoreboard character rather than a generic admin
dashboard.

- Telegram theme variables control surfaces, text, and the primary accent,
  with polished light and dark fallbacks.
- A bold condensed display face distinguishes rank titles; body text remains
  highly readable.
- Available ranks appear as a single numbered column of large tap targets.
- The assignment screen shows three recipient cards with initials and handles.
- Assigned ranks are grouped into three clear player sections with counts.
- A fixed bottom action switches between available and assigned views.
- Telegram's native Back Button is synchronized with in-app navigation.
- `ready()`, `expand()`, safe-area insets, haptics, reduced motion, loading,
  empty, success, and retry states are supported.
- After assignment, the app gives success haptic feedback, shows a brief
  confirmation, and returns to the refreshed available list.

No destructive confirmation is needed because this release has no delete or
unassign action.

## Deployment contract

Required environment:

- `BOT_TOKEN` — used only by the server to validate Telegram init data;
- `DB_URL` — PostgreSQL connection URL;
- `PORT` — optional, defaults to `3000`;
- `NODE_ENV=production`.

The package builds client and server artifacts and starts as one process. The
server serves the static client with SPA fallback. The public URL must be HTTPS
and must be registered as the bot's Main Mini App or menu button in BotFather.

The legacy bot deployment is not modified in this change. A package-local
README documents local development, production commands, environment, and
BotFather setup.

## Testing and acceptance

Automated acceptance:

- valid signed Telegram data authenticates an allowlisted user;
- invalid, expired, or non-allowlisted data is rejected;
- state includes only globally unassigned ranks in the available list;
- assignments are grouped by the three fixed users;
- assigning creates an assignment and changelog in one transaction;
- missing, invalid, and already-assigned requests return the specified errors;
- all three UI screens render and navigation works;
- successful assignment refreshes state and returns to the list;
- API failure remains recoverable and never leaves an enabled duplicate-submit
  path;
- type checks, tests, lint, client build, and server build pass.

Manual acceptance inside Telegram:

1. Open the app from the configured bot button.
2. See only unassigned ranks.
3. Tap a rank and select one of the three users.
4. Observe confirmation and removal of that rank from the available list.
5. Open assigned ranks and see the new rank grouped under its recipient.
6. Switch Telegram between light and dark themes and verify readable layout.
