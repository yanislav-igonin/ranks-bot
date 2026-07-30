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
    ranks: {
      assignmentId: number;
      id: number;
      title: string;
      comment: string;
      count: number;
      assignedAt: string;
    }[];
  })[];
}

interface AssignRankInput {
  rankId: number;
  recipientId: number;
  actorId: number;
  comment: string;
}

interface MutationActor {
  actorId: number;
}

export interface TgAppDaoPort {
  getState(): Promise<{
    availableRanks: { id: number; title: string }[];
    assignments: {
      id: number;
      rank: { id: number; title: string };
      user: { id: number; username: string };
      comment: string;
      count: number;
      createdAt: Date;
    }[];
  }>;
  assignRank(input: AssignRankInput): Promise<{
    rank: { id: number; title: string };
    user: { id: number; username: string };
  }>;
  createRank(input: MutationActor & { title: string }): Promise<{
    id: number;
    title: string;
  }>;
  deleteRank(input: MutationActor & { rankId: number }): Promise<{
    id: number;
    title: string;
  }>;
  unassignRank(input: MutationActor & { assignmentId: number }): Promise<{
    id: number;
    rank: { id: number; title: string };
    user: { id: number; username: string };
  }>;
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
const MAX_RANK_TITLE_LENGTH = 120;
const MAX_COMMENT_LENGTH = 500;

interface TgAppNotifier {
  send(text: string): Promise<void>;
}

export class TgAppService {
  private readonly dao: TgAppDaoPort;
  private readonly botToken?: string;
  private readonly environment: string;
  private readonly allowedTelegramUserIds: number[];
  private readonly notifier?: TgAppNotifier;
  private readonly logError: (error: unknown) => void;

  constructor(options: {
    dao: TgAppDaoPort;
    botToken?: string;
    environment: string;
    allowedTelegramUserIds: number[];
    notifier?: TgAppNotifier;
    logError?: (error: unknown) => void;
  }) {
    this.dao = options.dao;
    this.botToken = options.botToken;
    this.environment = options.environment;
    this.allowedTelegramUserIds = options.allowedTelegramUserIds;
    this.notifier = options.notifier;
    this.logError = options.logError ?? (() => undefined);
  }

  authenticate(
    authorization: string | undefined,
    nowSeconds = Math.floor(Date.now() / 1000),
  ): TelegramUser {
    if (this.environment === 'development') {
      const actorId = this.allowedTelegramUserIds[0];
      if (!Number.isInteger(actorId)) {
        throw new TgAppError(401, 'User is not allowed');
      }
      return {
        id: actorId,
        first_name: 'Development user',
      };
    }

    if (!authorization?.startsWith('tma ')) {
      throw new TgAppError(401, 'Telegram authorization is required');
    }
    if (!this.botToken) {
      throw new TgAppError(401, 'Telegram authorization is unavailable');
    }
    const user = this.validateInitData(
      authorization.slice('tma '.length),
      this.botToken,
      nowSeconds,
    );

    if (!this.allowedTelegramUserIds.includes(user.id)) {
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
    rawComment: unknown = '',
  ): Promise<AppState> {
    this.validatePositiveId(rankId, 'rank');
    if (!FIXED_USERS.some(({ id }) => id === recipientId)) {
      throw new TgAppError(400, 'Invalid recipient');
    }
    if (typeof rawComment !== 'string') {
      throw new TgAppError(400, 'Invalid comment');
    }
    const comment = rawComment.trim();
    if (comment.length > MAX_COMMENT_LENGTH) {
      throw new TgAppError(400, 'Comment is too long');
    }

    const actor = this.authenticate(authorization);
    const assigned = await this.dao.assignRank({
      rankId,
      recipientId,
      actorId: actor.id,
      comment,
    });
    const commentLine = comment ? `\nКомментарий: ${comment}` : '';
    await this.publish(
      `Присвоено звание @${assigned.user.username}: ${assigned.rank.title}, ID - ${assigned.rank.id}${commentLine}`,
    );
    return this.loadState();
  }

  async createRank(
    authorization: string | undefined,
    rawTitle: unknown,
  ): Promise<AppState> {
    if (typeof rawTitle !== 'string') {
      throw new TgAppError(400, 'Invalid rank title');
    }
    const title = rawTitle.trim();
    if (!title) {
      throw new TgAppError(400, 'Rank title is required');
    }
    if (title.length > MAX_RANK_TITLE_LENGTH) {
      throw new TgAppError(400, 'Rank title is too long');
    }

    const actor = this.authenticate(authorization);
    const rank = await this.dao.createRank({ title, actorId: actor.id });
    await this.publish(`Добавлено звание: ${rank.title}, ID - ${rank.id}`);
    return this.loadState();
  }

  async deleteRank(
    authorization: string | undefined,
    rankId: number,
  ): Promise<AppState> {
    this.validatePositiveId(rankId, 'rank');
    const actor = this.authenticate(authorization);
    const rank = await this.dao.deleteRank({ rankId, actorId: actor.id });
    await this.publish(`Удалено звание: ${rank.title}, ID - ${rank.id}`);
    return this.loadState();
  }

  async unassign(
    authorization: string | undefined,
    assignmentId: number,
  ): Promise<AppState> {
    this.validatePositiveId(assignmentId, 'assignment');
    const actor = this.authenticate(authorization);
    const assignment = await this.dao.unassignRank({
      assignmentId,
      actorId: actor.id,
    });
    await this.publish(
      `Аннулировано звание @${assignment.user.username}: ${assignment.rank.title}, ID - ${assignment.rank.id}`,
    );
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
          .sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime() ||
              right.id - left.id,
          )
          .map(({ id, rank, comment, count, createdAt }) => ({
            assignmentId: id,
            id: rank.id,
            title: rank.title,
            comment,
            count,
            assignedAt: createdAt.toISOString(),
          })),
      })),
    };
  }

  private validatePositiveId(value: number, name: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new TgAppError(400, `Invalid ${name}`);
    }
  }

  private async publish(text: string): Promise<void> {
    if (!this.notifier) return;
    try {
      await this.notifier.send(text);
    } catch (error) {
      this.logError(error);
    }
  }
}
