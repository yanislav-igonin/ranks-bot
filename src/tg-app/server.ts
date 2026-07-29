import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  FIXED_USERS,
  type AppState,
  type AssignedUser,
} from './contract.js';

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

export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface SqlResult<Row> {
  rows: Row[];
  rowCount: number | null;
}

export interface SqlClient {
  query<Row>(text: string, values?: unknown[]): Promise<SqlResult<Row>>;
  release(): void;
}

export interface SqlPool {
  query<Row>(text: string, values?: unknown[]): Promise<SqlResult<Row>>;
  connect(): Promise<SqlClient>;
}

export interface RankStore {
  getState(): Promise<AppState>;
  assign(
    rankId: number,
    recipientId: number,
    actorId: number,
  ): Promise<AppState>;
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

interface AvailableRankRow {
  id: number;
  title: string;
}

interface AssignedRankRow extends AvailableRankRow {
  userId: number;
  count: number;
}

const AVAILABLE_RANKS_SQL = `
  SELECT r.id, r.title
  FROM ranks r
  WHERE NOT EXISTS (
    SELECT 1
    FROM ranks_to_users rtu
    WHERE rtu.rank_id = r.id
  )
  ORDER BY r.id
`;

const ASSIGNED_RANKS_SQL = `
  SELECT
    u.id AS "userId",
    r.id,
    r.title,
    rtu.count
  FROM ranks_to_users rtu
  JOIN users u ON u.id = rtu.user_id
  JOIN ranks r ON r.id = rtu.rank_id
  WHERE u.id = ANY($1::int[])
  ORDER BY u.id, r.id
`;

export const createPostgresStore = (pool: SqlPool): RankStore => {
  const getState = async (): Promise<AppState> => {
    const userIds = FIXED_USERS.map(({ id }) => id);
    const [availableResult, assignedResult] = await Promise.all([
      pool.query<AvailableRankRow>(AVAILABLE_RANKS_SQL),
      pool.query<AssignedRankRow>(ASSIGNED_RANKS_SQL, [userIds]),
    ]);
    const assignedByUser: AssignedUser[] = FIXED_USERS.map((user) => ({
      ...user,
      ranks: assignedResult.rows
        .filter(({ userId }) => userId === user.id)
        .map(({ id, title, count }) => ({ id, title, count })),
    }));

    return {
      availableRanks: availableResult.rows.map(({ id, title }) => ({
        id,
        title,
      })),
      users: FIXED_USERS.map((user) => ({ ...user })),
      assignedByUser,
    };
  };

  const assign = async (
    rankId: number,
    recipientId: number,
    actorId: number,
  ): Promise<AppState> => {
    if (!FIXED_USERS.some(({ id }) => id === recipientId)) {
      throw new AppError(400, 'Invalid recipient');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const rankResult = await client.query<AvailableRankRow>(
        'SELECT id, title FROM ranks WHERE id = $1 FOR UPDATE',
        [rankId],
      );
      const rank = rankResult.rows[0];
      if (!rank) {
        throw new AppError(404, 'Rank not found');
      }

      const assignmentResult = await client.query<{ exists: number }>(
        `SELECT 1 AS "exists"
         FROM ranks_to_users
         WHERE rank_id = $1
         LIMIT 1`,
        [rankId],
      );
      if (assignmentResult.rows.length > 0) {
        throw new AppError(409, 'Rank is already assigned');
      }

      const inserted = await client.query<{ id: number }>(
        `INSERT INTO ranks_to_users (rank_id, user_id, comment, count)
         VALUES ($1, $2, '', 1)
         RETURNING id`,
        [rankId, recipientId],
      );
      const assignmentId = inserted.rows[0]?.id;
      if (!assignmentId) {
        throw new Error('Assignment insert returned no id');
      }

      await client.query(
        `INSERT INTO changelogs
          (type, "table", object_id, user_id, current_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'insert',
          'ranks_to_users',
          assignmentId,
          actorId,
          rank.title,
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return getState();
  };

  return { getState, assign };
};
