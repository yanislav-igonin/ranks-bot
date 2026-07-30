require('ts-node/register');

const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  TgAppError,
  TgAppService,
} = require('../../src/modules/tg-app/tg-app.service');

const createDao = () => {
  const calls = [];
  return {
    calls,
    async getState() {
      return {
        availableRanks: [{ id: 65, title: 'Кукурузный макрогол' }],
        assignments: [
          {
            id: 91,
            rank: { id: 1, title: 'Стоянов' },
            user: { id: 546166718, username: 'Noeter' },
            comment: 'Сломал диван',
            count: 1,
            createdAt: new Date('2026-07-29T11:00:00.000Z'),
          },
        ],
      };
    },
    async assignRank(input) {
      calls.push(input);
      return {
        rank: { id: input.rankId, title: 'Кукурузный макрогол' },
        user: { id: input.recipientId, username: 'Noeter' },
      };
    },
    async createRank(input) {
      calls.push(input);
      return { id: 67, title: input.title };
    },
    async deleteRank(input) {
      calls.push(input);
      return { id: input.rankId, title: 'Кукурузный макрогол' };
    },
    async unassignRank(input) {
      calls.push(input);
      return {
        id: input.assignmentId,
        rank: { id: 1, title: 'Стоянов' },
        user: { id: 546166718, username: 'Noeter' },
      };
    },
  };
};

const createService = (dao = createDao(), messages = [], errors = []) =>
  new TgAppService({
    dao,
    environment: 'development',
    allowedTelegramUserIds: [383288860, 142166671],
    notifier: {
      async send(text) {
        messages.push(text);
      },
    },
    logError(error) {
      errors.push(error);
    },
  });

test('maps DAO state to the existing frontend contract', async () => {
  const state = await createService().getState(undefined);

  assert.deepEqual(state.availableRanks, [{ id: 65, title: 'Кукурузный макрогол' }]);
  assert.deepEqual(state.users, [
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
  ]);
  assert.deepEqual(state.assignedByUser[0].ranks, [
    {
      assignmentId: 91,
      id: 1,
      title: 'Стоянов',
      comment: 'Сломал диван',
      count: 1,
      assignedAt: '2026-07-29T11:00:00.000Z',
    },
  ]);
  assert.deepEqual(state.assignedByUser[1].ranks, []);
});

test('passes authenticated actor to DAO assignment and refreshes state', async () => {
  const dao = createDao();
  const messages = [];
  const state = await createService(dao, messages).assign(
    undefined,
    65,
    546166718,
    '  За лучший подгон  ',
  );

  assert.deepEqual(dao.calls, [
    {
      rankId: 65,
      recipientId: 546166718,
      actorId: 383288860,
      comment: 'За лучший подгон',
    },
  ]);
  assert.deepEqual(messages, [
    'Присвоено звание @Noeter: Кукурузный макрогол, ID - 65\nКомментарий: За лучший подгон',
  ]);
  assert.equal(state.availableRanks[0].id, 65);
});

test('creates and deletes ranks with authenticated changelog actor', async () => {
  const dao = createDao();
  const messages = [];
  const service = createService(dao, messages);

  await service.createRank(undefined, '  Повелитель тапок  ');
  await service.deleteRank(undefined, 67);

  assert.deepEqual(dao.calls, [
    { title: 'Повелитель тапок', actorId: 383288860 },
    { rankId: 67, actorId: 383288860 },
  ]);
  assert.deepEqual(messages, [
    'Добавлено звание: Повелитель тапок, ID - 67',
    'Удалено звание: Кукурузный макрогол, ID - 67',
  ]);
});

test('removes an assignment and publishes the bot-compatible message', async () => {
  const dao = createDao();
  const messages = [];

  await createService(dao, messages).unassign(undefined, 91);

  assert.deepEqual(dao.calls, [{ assignmentId: 91, actorId: 383288860 }]);
  assert.deepEqual(messages, ['Аннулировано звание @Noeter: Стоянов, ID - 1']);
});

test('does not roll back successful mutations when Telegram publication fails', async () => {
  const dao = createDao();
  const errors = [];
  const service = new TgAppService({
    dao,
    environment: 'development',
    allowedTelegramUserIds: [383288860],
    notifier: {
      async send() {
        throw new Error('Telegram unavailable');
      },
    },
    logError(error) {
      errors.push(error);
    },
  });

  const state = await service.createRank(undefined, 'Новое звание');

  assert.equal(state.availableRanks[0].id, 65);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /Telegram unavailable/);
});

test('rejects invalid rank ids', async () => {
  await assert.rejects(
    createService().assign(undefined, Number.NaN, 546166718),
    new TgAppError(400, 'Invalid rank'),
  );
  await assert.rejects(
    createService().assign(undefined, 1.5, 546166718),
    new TgAppError(400, 'Invalid rank'),
  );
});

test('rejects recipients outside the allowlist', async () => {
  await assert.rejects(
    createService().assign(undefined, 65, 999),
    new TgAppError(400, 'Invalid recipient'),
  );
});

test('rejects blank or oversized text fields', async () => {
  const service = createService();

  await assert.rejects(
    service.createRank(undefined, '   '),
    new TgAppError(400, 'Rank title is required'),
  );
  await assert.rejects(
    service.createRank(undefined, 'x'.repeat(121)),
    new TgAppError(400, 'Rank title is too long'),
  );
  await assert.rejects(
    service.assign(undefined, 65, 546166718, 'x'.repeat(501)),
    new TgAppError(400, 'Comment is too long'),
  );
});
