import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface FixedUser {
  id: number;
  username: string;
  displayName: string;
  initials: string;
}

interface AppState {
  availableRanks: { id: number; title: string }[];
  users: FixedUser[];
  assignedByUser: (FixedUser & {
    ranks: { id: number; title: string; count: number }[];
  })[];
}

interface AssignRankInput {
  rankId: number;
  recipientId: number;
  actorId: number;
}

export interface TgAppDaoPort {
  getState(): Promise<{
    availableRanks: { id: number; title: string }[];
    assignments: {
      rank: { id: number; title: string };
      user: { id: number; username: string };
      count: number;
    }[];
  }>;
  assignRank(input: AssignRankInput): Promise<void>;
}

export class TgAppError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const FIXED_USERS: FixedUser[] = [
  {
    id: 546166718,
    username: 'Noeter',
    displayName: 'Noeter',
    initials: 'NO',
  },
  {
    id: 142166671,
    username: 'hobo_with_a_hookah',
    displayName: 'Hobo',
    initials: 'HB',
  },
  {
    id: 383288860,
    username: 'ConeConundrum',
    displayName: 'Cone',
    initials: 'CC',
  },
];

const SESSION_MAX_AGE_SECONDS = 60 * 60;

export class TgAppService {
  private readonly dao: TgAppDaoPort;
  private readonly botToken?: string;
  private readonly environment: string;
  private readonly devTelegramUserId?: number;

  constructor(options: {
    dao: TgAppDaoPort;
    botToken?: string;
    environment: string;
    devTelegramUserId?: number;
  }) {
    this.dao = options.dao;
    this.botToken = options.botToken;
    this.environment = options.environment;
    this.devTelegramUserId = options.devTelegramUserId;
  }

  authenticate(
    authorization: string | undefined,
    nowSeconds = Math.floor(Date.now() / 1000),
  ): TelegramUser {
    let user: TelegramUser;

    if (this.environment !== 'production' && !authorization) {
      const fixedUser = FIXED_USERS.find(({ id }) => id === this.devTelegramUserId);
      if (!fixedUser) {
        throw new TgAppError(401, 'User is not allowed');
      }
      user = {
        id: fixedUser.id,
        first_name: fixedUser.displayName,
        username: fixedUser.username,
      };
    } else {
      if (!authorization?.startsWith('tma ')) {
        throw new TgAppError(401, 'Telegram authorization is required');
      }
      if (!this.botToken) {
        throw new TgAppError(401, 'Telegram authorization is unavailable');
      }
      user = this.validateInitData(
        authorization.slice('tma '.length),
        this.botToken,
        nowSeconds,
      );
    }

    if (!FIXED_USERS.some(({ id }) => id === user.id)) {
      throw new TgAppError(401, 'User is not allowed');
    }

    return user;
  }

  async getState(authorization: string | undefined): Promise<AppState> {
    this.authenticate(authorization);
    return this.loadState();
  }

  async assign(
    authorization: string | undefined,
    rankId: number,
    recipientId: number,
  ): Promise<AppState> {
    if (!Number.isInteger(rankId) || rankId <= 0) {
      throw new TgAppError(400, 'Invalid rank');
    }
    if (!FIXED_USERS.some(({ id }) => id === recipientId)) {
      throw new TgAppError(400, 'Invalid recipient');
    }

    const actor = this.authenticate(authorization);
    await this.dao.assignRank({ rankId, recipientId, actorId: actor.id });
    return this.loadState();
  }

  private validateInitData(
    rawInitData: string,
    botToken: string,
    nowSeconds: number,
  ): TelegramUser {
    const params = new URLSearchParams(rawInitData);
    const receivedHash = params.get('hash');

    if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
      throw new TgAppError(401, 'Invalid Telegram signature');
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
      actualHash.length !== expectedHash.length ||
      !timingSafeEqual(actualHash, expectedHash)
    ) {
      throw new TgAppError(401, 'Invalid Telegram signature');
    }

    const authDate = Number(params.get('auth_date'));
    if (
      !Number.isInteger(authDate) ||
      nowSeconds - authDate > SESSION_MAX_AGE_SECONDS ||
      authDate > nowSeconds + 60
    ) {
      throw new TgAppError(401, 'Telegram session expired');
    }

    const rawUser = params.get('user');
    if (!rawUser) {
      throw new TgAppError(401, 'Telegram user is missing');
    }

    try {
      const user = JSON.parse(rawUser) as TelegramUser;
      if (
        !Number.isInteger(user.id) ||
        typeof user.first_name !== 'string' ||
        !user.first_name
      ) {
        throw new Error('invalid user');
      }
      return user;
    } catch {
      throw new TgAppError(401, 'Telegram user is invalid');
    }
  }

  private async loadState(): Promise<AppState> {
    const state = await this.dao.getState();
    return {
      availableRanks: state.availableRanks.map(({ id, title }) => ({
        id,
        title,
      })),
      users: FIXED_USERS.map((user) => ({ ...user })),
      assignedByUser: FIXED_USERS.map((user) => ({
        ...user,
        ranks: state.assignments
          .filter(({ user: assignedUser }) => assignedUser.id === user.id)
          .map(({ rank, count }) => ({
            id: rank.id,
            title: rank.title,
            count,
          })),
      })),
    };
  }
}
