// @vitest-environment node

import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AuthError,
  authenticateRequest,
  validateInitData,
} from '../server.js';

const TOKEN = '123456:telegram-test-token';
const NOW_SECONDS = 1_900_000_000;

const signedInitData = (
  user: { id: number; first_name: string; username: string },
  authDate = NOW_SECONDS,
) => {
  const values = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
    user: JSON.stringify(user),
  });
  const dataCheckString = [...values.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  values.set('hash', hash);
  return values.toString();
};

const allowedUser = {
  id: 142166671,
  first_name: 'Yanis',
  username: 'hobo_with_a_hookah',
};

describe('validateInitData', () => {
  it('returns the Telegram user from a valid signed session', () => {
    expect(validateInitData(signedInitData(allowedUser), TOKEN, NOW_SECONDS))
      .toEqual(allowedUser);
  });

  it('rejects data changed after Telegram signed it', () => {
    const tampered = signedInitData(allowedUser).replace(
      'hobo_with_a_hookah',
      'attacker',
    );

    expect(() => validateInitData(tampered, TOKEN, NOW_SECONDS))
      .toThrow('Invalid Telegram signature');
  });

  it('rejects sessions older than one hour', () => {
    const expired = signedInitData(allowedUser, NOW_SECONDS - 3601);

    expect(() => validateInitData(expired, TOKEN, NOW_SECONDS))
      .toThrow('Telegram session expired');
  });
});

describe('authenticateRequest', () => {
  it('rejects a valid Telegram user outside the friend allowlist', () => {
    const outsider = signedInitData({
      id: 999,
      first_name: 'Mallory',
      username: 'mallory',
    });

    expect(() => authenticateRequest(
      `tma ${outsider}`,
      { NODE_ENV: 'production', BOT_TOKEN: TOKEN },
      NOW_SECONDS,
    )).toThrow(new AuthError('User is not allowed'));
  });

  it('uses an allowlisted development identity outside production', () => {
    expect(authenticateRequest(undefined, {
      NODE_ENV: 'development',
      DEV_TELEGRAM_USER_ID: '546166718',
    }, NOW_SECONDS).id).toBe(546166718);
  });

  it('never accepts the development identity in production', () => {
    expect(() => authenticateRequest(undefined, {
      NODE_ENV: 'production',
      BOT_TOKEN: TOKEN,
      DEV_TELEGRAM_USER_ID: '546166718',
    }, NOW_SECONDS)).toThrow('Telegram authorization is required');
  });
});
