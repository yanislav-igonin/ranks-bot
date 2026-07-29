# ranks-bot

This is a Telegram ranks bot written in TypeScript.

## Motivation :question:

Made this bot for our telegram chat to assign ranks while we're playing in competitive games.

## Installation :inbox_tray:

The project uses Node.js 22 and npm 10. Volta selects the pinned versions from
`package.json` automatically.

```bash
git clone https://github.com/yanislav-igonin/ranks-bot.git
cd ranks-bot
cp .env.example .env
npm ci
docker compose up -d postgres
npm run dev
```

Set `BOT_TOKEN` in `.env` before starting the bot. The local PostgreSQL
connection in `.env.example` matches `docker-compose.yml`; with `DB_SYNC=true`,
TypeORM creates the schema and then runs the initial-data migration.

Polling is used when `IS_WEBHOOK_ENABLED=false`. For local webhook mode, set
`IS_WEBHOOK_ENABLED=true` and provide `NGROK_AUTHTOKEN`.

The Telegram Mini App has its own setup guide in
[`src/tg-app/README.md`](src/tg-app/README.md).

## Bugs :bug:

This project is getting upgrades in my free time.  
If there is a problem please create a bug report in the issues section.

## License :scroll:

Licensed under [MIT License](https://github.com/yanislav-igonin/ranks-bot/blob/master/LICENSE)
