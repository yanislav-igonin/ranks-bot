# ranks-bot

Telegram ranks bot and Mini App written in TypeScript. One backend process owns
the bot, the Mini App HTTP/API server, and one TypeORM connection pool.

## Requirements

- Node.js 22 and npm 10
- PostgreSQL
- Telegram `BOT_TOKEN`

Volta selects the pinned Node.js and npm versions from `package.json`.

## Installation

```bash
git clone https://github.com/yanislav-igonin/ranks-bot.git
cd ranks-bot
cp .env.example .env
npm ci
npm --prefix src/tg-app ci
```

Set `BOT_TOKEN` in `.env`. The token handles bot traffic and validates Telegram
Mini App `initData`. The local PostgreSQL settings in `.env.example` match
`docker-compose.yml`.

## Development

Terminal 1 starts PostgreSQL, the bot, and the Mini App API:

```bash
docker compose up -d postgres
npm run dev
```

Terminal 2 starts the Vite frontend with HMR:

```bash
npm --prefix src/tg-app run dev
```

Vite proxies `/api` and `/health` to `http://localhost:3000`.
`DEV_TELEGRAM_USER_ID` enables an allowlisted identity only outside production.

## Production

```bash
npm ci
npm --prefix src/tg-app ci
npm run build
npm start
```

`npm start` forces `NODE_ENV=production`; do not set
`DEV_TELEGRAM_USER_ID` in the production environment.

`npm run build` creates `build/index.js` and `src/tg-app/dist/web`.

Environment:

- `BOT_TOKEN` — bot token and Mini App signature secret;
- `TG_APP_PORT` — Mini App HTTP port, default `3000`;
- `TG_APP_STATIC_DIR` — optional built frontend directory override;
- `DEV_TELEGRAM_USER_ID` — development-only allowlisted identity;
- `WEBHOOK_PORT` — bot webhook port, separate from `TG_APP_PORT`;
- `DB_URL` — shared PostgreSQL database used by the root `DbModule`.

Route Mini App HTTPS traffic from the reverse proxy to `TG_APP_PORT`. Bot
webhooks continue using `WEBHOOK_PORT`.

## Verification

```bash
npm run check
npm test
TEST_DB_URL=postgresql://ranks-bot:test_password@localhost:5432/ranks_bot \
  npm run test:integration
npm run build
```

## License

Licensed under the [MIT License](LICENSE).
