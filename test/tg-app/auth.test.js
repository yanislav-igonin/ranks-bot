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
const ALLOWED_USER = {
  id: 142166671,
  first_name: 'Yanis',
  username: 'hobo_with_a_hookah',
};

const signValues = (values) => {
  const check = [...values.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  values.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return values.toString();
};

const signedInitData = (user, authDate = NOW_SECONDS) =>
  signValues(
    new URLSearchParams({
      auth_date: String(authDate),
      query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
      user: JSON.stringify(user),
    }),
  );

const dao = {
  async getState() {
    return { availableRanks: [], assignments: [] };
  },
  async assignRank() {},
};

const productionService = () =>
  new TgAppService({
    dao,
    botToken: TOKEN,
    environment: 'production',
  });

test('accepts valid signed initData for an allowed user', () => {
  const initData = signedInitData(ALLOWED_USER);

  assert.equal(
    productionService().authenticate(`tma ${initData}`, NOW_SECONDS).id,
    142166671,
  );
});

test('rejects data changed after Telegram signed it', () => {
  const tampered = signedInitData(ALLOWED_USER).replace(
    'hobo_with_a_hookah',
    'attacker',
  );

  assert.throws(
    () => productionService().authenticate(`tma ${tampered}`, NOW_SECONDS),
    new TgAppError(401, 'Invalid Telegram signature'),
  );
});

test('rejects sessions older than one hour', () => {
  const expired = signedInitData(ALLOWED_USER, NOW_SECONDS - 3601);

  assert.throws(
    () => productionService().authenticate(`tma ${expired}`, NOW_SECONDS),
    new TgAppError(401, 'Telegram session expired'),
  );
});

test('rejects sessions more than one minute in the future', () => {
  const future = signedInitData(ALLOWED_USER, NOW_SECONDS + 61);

  assert.throws(
    () => productionService().authenticate(`tma ${future}`, NOW_SECONDS),
    new TgAppError(401, 'Telegram session expired'),
  );
});

test('rejects a missing or invalid Telegram user', () => {
  const missing = signValues(
    new URLSearchParams({
      auth_date: String(NOW_SECONDS),
      query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
    }),
  );
  const invalid = signedInitData({ id: 'nope', first_name: '' });

  assert.throws(
    () => productionService().authenticate(`tma ${missing}`, NOW_SECONDS),
    /Telegram user is missing/,
  );
  assert.throws(
    () => productionService().authenticate(`tma ${invalid}`, NOW_SECONDS),
    /Telegram user is invalid/,
  );
});

test('rejects a valid Telegram user outside the allowlist', () => {
  const outsider = signedInitData({
    id: 999,
    first_name: 'Mallory',
    username: 'mallory',
  });

  assert.throws(
    () => productionService().authenticate(`tma ${outsider}`, NOW_SECONDS),
    new TgAppError(401, 'User is not allowed'),
  );
});

test('requires Telegram authorization in production', () => {
  assert.throws(
    () => productionService().authenticate(undefined, NOW_SECONDS),
    new TgAppError(401, 'Telegram authorization is required'),
  );
});

test('uses an allowlisted development identity in development', () => {
  const service = new TgAppService({
    dao,
    environment: 'development',
    devTelegramUserId: 546166718,
  });

  assert.equal(service.authenticate(undefined, NOW_SECONDS).id, 546166718);
});

test('never accepts the development identity in production', () => {
  const service = new TgAppService({
    dao,
    botToken: TOKEN,
    environment: 'production',
    devTelegramUserId: 546166718,
  });

  assert.throws(
    () => service.authenticate(undefined, NOW_SECONDS),
    new TgAppError(401, 'Telegram authorization is required'),
  );
});

test('accepts the development identity only in development', () => {
  const service = new TgAppService({
    dao,
    environment: 'test',
    devTelegramUserId: 546166718,
  });

  assert.throws(
    () => service.authenticate(undefined, NOW_SECONDS),
    new TgAppError(401, 'Telegram authorization is required'),
  );
});
