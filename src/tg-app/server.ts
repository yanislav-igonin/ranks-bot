import { createHmac, timingSafeEqual } from 'node:crypto';

import { FIXED_USERS } from './contract.js';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface AppEnvironment {
  NODE_ENV?: string;
  BOT_TOKEN?: string;
  DEV_TELEGRAM_USER_ID?: string;
  DB_URL?: string;
  PORT?: string;
}

export class AuthError extends Error {
  readonly status = 401;
}

const SESSION_MAX_AGE_SECONDS = 60 * 60;

export const validateInitData = (
  rawInitData: string,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): TelegramUser => {
  const params = new URLSearchParams(rawInitData);
  const receivedHash = params.get('hash');

  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
    throw new AuthError('Invalid Telegram signature');
  }

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = createHmac('sha256', secret)
    .update(dataCheckString)
    .digest();
  const actualHash = Buffer.from(receivedHash, 'hex');

  if (
    actualHash.length !== expectedHash.length
    || !timingSafeEqual(actualHash, expectedHash)
  ) {
    throw new AuthError('Invalid Telegram signature');
  }

  const authDate = Number(params.get('auth_date'));
  if (
    !Number.isInteger(authDate)
    || nowSeconds - authDate > SESSION_MAX_AGE_SECONDS
    || authDate > nowSeconds + 60
  ) {
    throw new AuthError('Telegram session expired');
  }

  const rawUser = params.get('user');
  if (!rawUser) {
    throw new AuthError('Telegram user is missing');
  }

  try {
    const user = JSON.parse(rawUser) as TelegramUser;
    if (!Number.isInteger(user.id) || !user.first_name) {
      throw new Error('invalid user');
    }
    return user;
  } catch {
    throw new AuthError('Telegram user is invalid');
  }
};

export const authenticateRequest = (
  authorization: string | undefined,
  env: AppEnvironment,
  nowSeconds = Math.floor(Date.now() / 1000),
): TelegramUser => {
  let user: TelegramUser;

  if (env.NODE_ENV !== 'production' && !authorization) {
    const developmentId = Number(
      env.DEV_TELEGRAM_USER_ID ?? FIXED_USERS[1]?.id,
    );
    const fixedUser = FIXED_USERS.find(({ id }) => id === developmentId);
    if (!fixedUser) {
      throw new AuthError('User is not allowed');
    }
    user = {
      id: fixedUser.id,
      first_name: fixedUser.displayName,
      username: fixedUser.username,
    };
  } else {
    if (!authorization?.startsWith('tma ')) {
      throw new AuthError('Telegram authorization is required');
    }
    if (!env.BOT_TOKEN) {
      throw new AuthError('Telegram authorization is unavailable');
    }
    user = validateInitData(
      authorization.slice('tma '.length),
      env.BOT_TOKEN,
      nowSeconds,
    );
  }

  if (!FIXED_USERS.some(({ id }) => id === user.id)) {
    throw new AuthError('User is not allowed');
  }

  return user;
};
