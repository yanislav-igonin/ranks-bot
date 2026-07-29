# Ranks Telegram Mini App

React/Vite frontend for assigning unclaimed ranks. The root bot process serves
the built frontend and API through the existing TypeORM database connection.
This directory does not contain or deploy a standalone backend.

## Fixed users

| ID | Username |
| ---: | --- |
| `546166718` | `@Noeter` |
| `142166671` | `@hobo_with_a_hookah` |
| `383288860` | `@ConeConundrum` |

## Local development

From the repository root, start PostgreSQL and the bot/API:

```bash
docker compose up -d postgres
npm run dev
```

In a second terminal, start Vite:

```bash
npm --prefix src/tg-app run dev
```

Vite serves `http://localhost:5173` and proxies `/api` and `/health` to the
root process at `http://localhost:3000`. In development, the API skips Telegram
authentication and uses the first ID from the root `USERS` setting as the
technical changelog actor.

## Verification

```bash
npm run check
npm test
npm run build
```

The only production artifact owned by this package is `dist/web`.

## Production

Install and build from the repository root:

```bash
npm ci
npm --prefix src/tg-app ci
npm run build
npm start
```

`npm start` forces `NODE_ENV=production`. Production validates Telegram
`initData` and allows only IDs listed in the root `USERS` setting.

The root process exposes:

- `GET /health` without authentication;
- `GET /api/state`;
- `POST /api/ranks/:rankId/assign`;
- the built SPA.

Production API calls validate Telegram `initData` with `BOT_TOKEN`, reject
sessions older than one hour, and allow only the three fixed Telegram IDs.
Assignment locks the rank in a TypeORM transaction and records the
authenticated actor in `changelogs`.

Use an HTTPS reverse proxy to route Mini App traffic to `TG_APP_PORT` (default
`3000`). The bot webhook remains on `WEBHOOK_PORT`.

## Telegram setup

In `@BotFather`, configure the ranks bot's Main Mini App URL to the deployed
HTTPS root. A menu button opens from the bot's private chat; the app does not
need group context because authorization uses the fixed Telegram IDs.
