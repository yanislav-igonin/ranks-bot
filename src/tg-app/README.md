# Ranks Telegram Mini App

Standalone Telegram Mini App for assigning unclaimed ranks to the three seeded
players. It uses the existing PostgreSQL tables but does not import, start, or
modify the legacy bot.

## Requirements

- Node.js 22 or newer
- PostgreSQL database used by the existing ranks bot
- HTTPS URL for Telegram
- Existing `BOT_TOKEN`

The eligible Telegram accounts are fixed in `contract.ts`:

| ID | Username |
| ---: | --- |
| `546166718` | `@Noeter` |
| `142166671` | `@hobo_with_a_hookah` |
| `383288860` | `@ConeConundrum` |

## Local development

Install the isolated package:

```bash
cd src/tg-app
npm install
```

Start client and API together:

```bash
DB_URL=postgres://user:password@localhost:5432/ranks_bot npm run dev
```

Vite opens the client at `http://localhost:5173` and proxies `/api` to the API
at `http://localhost:3000`.

Outside Telegram, development requests use Telegram ID `142166671`. Override
it with another allowlisted ID:

```bash
DEV_TELEGRAM_USER_ID=546166718 \
DB_URL=postgres://user:password@localhost:5432/ranks_bot \
npm run dev
```

`DEV_TELEGRAM_USER_ID` is ignored when `NODE_ENV=production`.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The production artifacts are:

- `dist/server/server.js`
- `dist/server/contract.js`
- `dist/web/index.html`
- `dist/web/assets/*`

## Production

Required environment:

```bash
NODE_ENV=production
BOT_TOKEN=123456:telegram-bot-token
DB_URL=postgres://user:password@postgres:5432/ranks_bot
PORT=3000
```

Build and start:

```bash
npm ci
npm run build
npm start
```

Or build the package-local container:

```bash
docker build -t ranks-tg-app .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e BOT_TOKEN \
  -e DB_URL \
  ranks-tg-app
```

The service exposes:

- `GET /health` — unauthenticated process health;
- `GET /api/state` — available and assigned ranks;
- `POST /api/ranks/:rankId/assign` — atomic assignment;
- `/` — built Mini App.

Use a reverse proxy with a valid HTTPS certificate. Do not expose the API on a
different origin from the web client unless CORS is deliberately configured.

## Telegram setup

The deployed public URL must use HTTPS.

Recommended setup:

1. Open `@BotFather`.
2. Choose the ranks bot.
3. Open **Bot Settings → Configure Mini App**.
4. Enable the Main Mini App and set its URL to the deployed root URL.
5. Optionally use `/setmenubutton` to expose the same URL from the bot's private
   chat menu.

The app can also be opened with a Telegram Mini App direct link after BotFather
assigns its short name.

Opening a menu button happens in the private bot chat, not in the friends'
group. This app does not need group context: the player list and authorization
are the three fixed Telegram IDs.

## Security and data behavior

- Production requests must include Telegram `initData`.
- The server validates the HMAC signature and rejects sessions older than one
  hour.
- `initDataUnsafe` is never used for server authorization.
- Only the three fixed Telegram IDs can read or change rank data.
- Assignment locks the selected rank in a transaction and rejects a second
  assignment with HTTP `409`.
- The authenticated Telegram ID is recorded in `changelogs`.

This package intentionally has no editing, deletion, or unassignment UI.

## Deployment boundary

The repository's existing root package, Dockerfile, Swarm configuration, and
bot process are unchanged. Deploy this directory as a second service pointing
at the same `DB_URL`. Its reverse-proxy route should use a separate host or a
non-overlapping path from the legacy bot webhook.
