require('reflect-metadata');
require('ts-node/register');

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { after, before, beforeEach, test } = require('node:test');
const { Client } = require('pg');
const { DataSource } = require('typeorm');
const { TgAppDao } = require('../../src/modules/tg-app/tg-app.dao');
const {
  ChangelogEntity,
  RankEntity,
  RankToUserEntity,
  UserEntity,
} = require('../../src/modules/db/entities');
const {
  SnakeNamingStrategy,
} = require('../../src/modules/db/snake-naming.strategy');

if (!process.env.TEST_DB_URL) {
  throw new Error('TEST_DB_URL is required for tg-app DAO integration tests');
}

const schema = `tg_app_test_${randomUUID().replaceAll('-', '')}`;
if (!/^tg_app_test_[a-f0-9]+$/.test(schema)) {
  throw new Error('Generated test schema is invalid');
}

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.TEST_DB_URL,
  schema,
  entities: [RankEntity, UserEntity, RankToUserEntity, ChangelogEntity],
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: true,
});

before(async () => {
  const client = new Client({ connectionString: process.env.TEST_DB_URL });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
  } finally {
    await client.end();
  }
  await dataSource.initialize();
});

beforeEach(async () => {
  await dataSource.query(
    `TRUNCATE TABLE
      "${schema}"."changelogs",
      "${schema}"."ranks_to_users",
      "${schema}"."ranks",
      "${schema}"."users"
     RESTART IDENTITY CASCADE`,
  );

  await dataSource.getRepository(UserEntity).save([
    { id: 546166718, username: 'Noeter' },
    { id: 142166671, username: 'hobo_with_a_hookah' },
    { id: 383288860, username: 'ConeConundrum' },
  ]);
  await dataSource.query(
    `INSERT INTO "${schema}"."ranks" (id, title)
     VALUES ($1, $2), ($3, $4)`,
    [65, 'Кукурузный макрогол', 66, 'Стоянов'],
  );
});

after(async () => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  const client = new Client({ connectionString: process.env.TEST_DB_URL });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    await client.end();
  }
});

test('returns unassigned ranks and existing assignments', async () => {
  const rank = await dataSource.getRepository(RankEntity).findOneByOrFail({
    id: 66,
  });
  const user = await dataSource.getRepository(UserEntity).findOneByOrFail({
    id: 546166718,
  });
  await dataSource.getRepository(RankToUserEntity).save({
    rank,
    user,
    comment: '',
    count: 1,
  });

  const state = await new TgAppDao(dataSource).getState();

  assert.deepEqual(
    state.availableRanks.map(({ id, title }) => ({ id, title })),
    [{ id: 65, title: 'Кукурузный макрогол' }],
  );
  assert.equal(state.assignments.length, 1);
  assert.equal(state.assignments[0].rank.id, 66);
  assert.equal(state.assignments[0].user.id, 546166718);
});

test('writes an assignment and authenticated actor changelog', async () => {
  await new TgAppDao(dataSource).assignRank({
    rankId: 65,
    recipientId: 546166718,
    actorId: 142166671,
  });

  const assignments = await dataSource
    .getRepository(RankToUserEntity)
    .find({ relations: { rank: true, user: true } });
  const changelogs = await dataSource
    .getRepository(ChangelogEntity)
    .find({ relations: { user: true } });

  assert.equal(assignments.length, 1);
  assert.equal(assignments[0].rank.id, 65);
  assert.equal(assignments[0].user.id, 546166718);
  assert.equal(changelogs.length, 1);
  assert.equal(changelogs[0].user.id, 142166671);
  assert.equal(changelogs[0].objectId, assignments[0].id);
  assert.equal(changelogs[0].currentValue, 'Кукурузный макрогол');
});

test('rejects a missing rank', async () => {
  await assert.rejects(
    new TgAppDao(dataSource).assignRank({
      rankId: 999,
      recipientId: 546166718,
      actorId: 142166671,
    }),
    (error) => error.status === 404 && error.message === 'Rank not found',
  );
});

test('rejects an already assigned rank', async () => {
  const dao = new TgAppDao(dataSource);
  await dao.assignRank({
    rankId: 65,
    recipientId: 546166718,
    actorId: 142166671,
  });

  await assert.rejects(
    dao.assignRank({
      rankId: 65,
      recipientId: 383288860,
      actorId: 142166671,
    }),
    (error) => error.status === 409 && error.message === 'Rank is already assigned',
  );
});

test('allows exactly one concurrent assignment for a rank', async () => {
  const dao = new TgAppDao(dataSource);
  const results = await Promise.allSettled([
    dao.assignRank({
      rankId: 65,
      recipientId: 546166718,
      actorId: 142166671,
    }),
    dao.assignRank({
      rankId: 65,
      recipientId: 383288860,
      actorId: 142166671,
    }),
  ]);

  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
  const rejection = results.find(({ status }) => status === 'rejected');
  assert.equal(rejection.reason.status, 409);
  assert.equal(await dataSource.getRepository(RankToUserEntity).count(), 1);
});
