require('ts-node/register');

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { launchApplication } = require('../../src/index');

test('database is ready before bot and Mini App launch', async () => {
  const events = [];
  await launchApplication({
    db: {
      async initialize() {
        events.push('db:init');
      },
      async runMigrations() {
        events.push('db:migrate');
      },
      async destroy() {
        events.push('db:close');
      },
    },
    bot: {
      async launch() {
        events.push('bot');
      },
      async close() {
        events.push('bot:close');
      },
    },
    tgApp: {
      async launch() {
        events.push('tg-app');
      },
      async close() {
        events.push('tg-app:close');
      },
    },
  });

  assert.deepEqual(events.slice(0, 2), ['db:init', 'db:migrate']);
  assert.deepEqual(new Set(events.slice(2)), new Set(['bot', 'tg-app']));
});

test('startup failure attempts to close every initialized module', async () => {
  const events = [];

  await assert.rejects(
    launchApplication({
      db: {
        async initialize() {
          events.push('db:init');
        },
        async runMigrations() {
          events.push('db:migrate');
        },
        async destroy() {
          events.push('db:close');
        },
      },
      bot: {
        async launch() {
          events.push('bot');
          throw new Error('Telegram unavailable');
        },
        async close() {
          events.push('bot:close');
        },
      },
      tgApp: {
        async launch() {
          events.push('tg-app');
        },
        async close() {
          events.push('tg-app:close');
        },
      },
    }),
    /Telegram unavailable/,
  );

  assert.ok(events.includes('bot:close'));
  assert.ok(events.includes('tg-app:close'));
  assert.ok(events.includes('db:close'));
});
