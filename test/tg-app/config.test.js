require('ts-node/register');

const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');

const ENV_KEYS = ['TG_APP_PORT', 'TG_APP_STATIC_DIR', 'DEV_TELEGRAM_USER_ID'];
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

test('production start forces the production environment', () => {
  const { start } = require('../../package.json').scripts;

  assert.match(start, /NODE_ENV=production/);
});
