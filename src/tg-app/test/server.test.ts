// @vitest-environment node

import { describe, expect, it } from 'vitest';
import request from 'supertest';

import {
  AppError,
  createApp,
  createPostgresStore,
  type RankStore,
  type SqlClient,
  type SqlPool,
} from '../server.js';
import type { AppState } from '../contract.js';

interface RecordedQuery {
  text: string;
  values?: unknown[];
}

const stateRows = {
  available: [
    { id: 65, title: 'Кукурузный макрогол' },
  ],
  assigned: [
    { userId: 546166718, id: 1, title: 'Стоянов', count: 1 },
    { userId: 383288860, id: 26, title: 'Куколд', count: 2 },
  ],
};

const createStatePool = (): SqlPool & { queries: RecordedQuery[] } => {
  const queries: RecordedQuery[] = [];
  return {
    queries,
    async query<Row>(text: string, values?: unknown[]) {
      queries.push({ text, values });
      const rows = text.includes('NOT EXISTS')
        ? stateRows.available
        : stateRows.assigned;
      return { rows: rows as Row[], rowCount: rows.length };
    },
    async connect() {
      throw new Error('connect should not be used by getState');
    },
  };
};

describe('PostgreSQL rank state', () => {
  it('lists only globally unassigned ranks and groups assignments', async () => {
    const pool = createStatePool();

    const state = await createPostgresStore(pool).getState();

    expect(state.availableRanks).toEqual([
      { id: 65, title: 'Кукурузный макрогол' },
    ]);
    expect(state.assignedByUser).toEqual([
      {
        id: 546166718,
        username: 'Noeter',
        displayName: 'Noeter',
        initials: 'NO',
        ranks: [{ id: 1, title: 'Стоянов', count: 1 }],
      },
      {
        id: 142166671,
        username: 'hobo_with_a_hookah',
        displayName: 'Hobo',
        initials: 'HB',
        ranks: [],
      },
      {
        id: 383288860,
        username: 'ConeConundrum',
        displayName: 'Cone',
        initials: 'CC',
        ranks: [{ id: 26, title: 'Куколд', count: 2 }],
      },
    ]);
    expect(pool.queries[0]?.text).toContain('NOT EXISTS');
    expect(pool.queries[1]?.values).toEqual([
      [546166718, 142166671, 383288860],
    ]);
  });
});

interface TransactionOptions {
  rankRows?: { id: number; title: string }[];
  assignedRows?: { exists: number }[];
  failInsert?: boolean;
}

const createTransactionPool = ({
  rankRows = [{ id: 65, title: 'Кукурузный макрогол' }],
  assignedRows = [],
  failInsert = false,
}: TransactionOptions = {}) => {
  const queries: RecordedQuery[] = [];
  let released = false;

  const client: SqlClient = {
    async query<Row>(text: string, values?: unknown[]) {
      queries.push({ text, values });
      if (text.includes('FROM ranks') && text.includes('FOR UPDATE')) {
        return { rows: rankRows as Row[], rowCount: rankRows.length };
      }
      if (text.includes('FROM ranks_to_users') && text.includes('LIMIT 1')) {
        return { rows: assignedRows as Row[], rowCount: assignedRows.length };
      }
      if (text.includes('INSERT INTO ranks_to_users')) {
        if (failInsert) throw new Error('database unavailable');
        return { rows: [{ id: 777 }] as Row[], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      released = true;
    },
  };

  const pool: SqlPool = {
    async query<Row>(text: string, values?: unknown[]) {
      queries.push({ text, values });
      const rows = text.includes('NOT EXISTS')
        ? stateRows.available
        : stateRows.assigned;
      return { rows: rows as Row[], rowCount: rows.length };
    },
    async connect() {
      return client;
    },
  };

  return {
    pool,
    queries,
    wasReleased: () => released,
  };
};

describe('PostgreSQL rank assignment', () => {
  it('locks, assigns, audits, commits, and refreshes state', async () => {
    const fake = createTransactionPool();

    const state = await createPostgresStore(fake.pool)
      .assign(65, 546166718, 142166671);

    const statements = fake.queries.map(({ text }) => text.replace(/\s+/g, ' ').trim());
    expect(statements[0]).toBe('BEGIN');
    expect(statements[1]).toContain('FOR UPDATE');
    expect(statements[2]).toContain('FROM ranks_to_users');
    expect(statements[3]).toContain('INSERT INTO ranks_to_users');
    expect(fake.queries[3]?.values).toEqual([65, 546166718]);
    expect(statements[4]).toContain('INSERT INTO changelogs');
    expect(fake.queries[4]?.values).toEqual([
      'insert',
      'ranks_to_users',
      777,
      142166671,
      'Кукурузный макрогол',
    ]);
    expect(statements[5]).toBe('COMMIT');
    expect(state.availableRanks[0]?.id).toBe(65);
    expect(fake.wasReleased()).toBe(true);
  });

  it('rolls back when the rank does not exist', async () => {
    const fake = createTransactionPool({ rankRows: [] });

    await expect(createPostgresStore(fake.pool)
      .assign(999, 546166718, 142166671))
      .rejects.toEqual(new AppError(404, 'Rank not found'));

    expect(fake.queries.at(-1)?.text).toBe('ROLLBACK');
    expect(fake.wasReleased()).toBe(true);
  });

  it('rolls back when another request already assigned the rank', async () => {
    const fake = createTransactionPool({ assignedRows: [{ exists: 1 }] });

    await expect(createPostgresStore(fake.pool)
      .assign(65, 546166718, 142166671))
      .rejects.toEqual(new AppError(409, 'Rank is already assigned'));

    expect(fake.queries.at(-1)?.text).toBe('ROLLBACK');
  });

  it('rejects recipients outside the fixed friend list before SQL', async () => {
    const fake = createTransactionPool();

    await expect(createPostgresStore(fake.pool)
      .assign(65, 999, 142166671))
      .rejects.toEqual(new AppError(400, 'Invalid recipient'));

    expect(fake.queries).toEqual([]);
  });

  it('rolls back SQL errors and releases the client', async () => {
    const fake = createTransactionPool({ failInsert: true });

    await expect(createPostgresStore(fake.pool)
      .assign(65, 546166718, 142166671))
      .rejects.toThrow('database unavailable');

    expect(fake.queries.at(-1)?.text).toBe('ROLLBACK');
    expect(fake.wasReleased()).toBe(true);
  });
});

const apiState: AppState = {
  availableRanks: [{ id: 65, title: 'Кукурузный макрогол' }],
  users: [
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
  ],
  assignedByUser: [],
};

const createApiStore = (
  assignError?: Error,
): RankStore & { assignments: number[][] } => {
  const assignments: number[][] = [];
  return {
    assignments,
    async getState() {
      return apiState;
    },
    async assign(rankId, recipientId, actorId) {
      assignments.push([rankId, recipientId, actorId]);
      if (assignError) throw assignError;
      return apiState;
    },
  };
};

describe('rank API', () => {
  it('reports process health without Telegram authorization', async () => {
    const response = await request(createApp({
      store: createApiStore(),
      env: { NODE_ENV: 'production' },
    })).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('returns state using the development identity', async () => {
    const response = await request(createApp({
      store: createApiStore(),
      env: {
        NODE_ENV: 'development',
        DEV_TELEGRAM_USER_ID: '142166671',
      },
    })).get('/api/state');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(apiState);
  });

  it('rejects unauthenticated production requests', async () => {
    const response = await request(createApp({
      store: createApiStore(),
      env: { NODE_ENV: 'production', BOT_TOKEN: 'secret' },
    })).get('/api/state');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Telegram authorization is required',
    });
  });

  it('assigns a rank as the authenticated Telegram actor', async () => {
    const store = createApiStore();
    const response = await request(createApp({
      store,
      env: {
        NODE_ENV: 'development',
        DEV_TELEGRAM_USER_ID: '142166671',
      },
    }))
      .post('/api/ranks/65/assign')
      .send({ userId: 546166718 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(apiState);
    expect(store.assignments).toEqual([[65, 546166718, 142166671]]);
  });

  it.each([
    ['/api/ranks/nope/assign', { userId: 546166718 }, 'Invalid rank id'],
    ['/api/ranks/0/assign', { userId: 546166718 }, 'Invalid rank id'],
    ['/api/ranks/65/assign', { userId: 'Noeter' }, 'Invalid recipient'],
    ['/api/ranks/65/assign', {}, 'Invalid recipient'],
  ])('rejects malformed assignment input at %s', async (url, body, error) => {
    const response = await request(createApp({
      store: createApiStore(),
      env: { NODE_ENV: 'development' },
    })).post(url).send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error });
  });

  it.each([
    [new AppError(404, 'Rank not found'), 404, 'Rank not found'],
    [new AppError(409, 'Rank is already assigned'), 409, 'Rank is already assigned'],
  ])('preserves expected assignment errors', async (failure, status, error) => {
    const response = await request(createApp({
      store: createApiStore(failure),
      env: { NODE_ENV: 'development' },
    }))
      .post('/api/ranks/65/assign')
      .send({ userId: 546166718 });

    expect(response.status).toBe(status);
    expect(response.body).toEqual({ error });
  });

  it('hides unexpected server error details', async () => {
    const response = await request(createApp({
      store: createApiStore(new Error('postgres password leaked')),
      env: { NODE_ENV: 'development' },
      logError: () => undefined,
    }))
      .post('/api/ranks/65/assign')
      .send({ userId: 546166718 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
  });
});
