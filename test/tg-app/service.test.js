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
            rank: { id: 1, title: 'Стоянов' },
            user: { id: 546166718, username: 'Noeter' },
            count: 1,
          },
        ],
      };
    },
    async assignRank(input) {
      calls.push(input);
    },
  };
};

const createService = (dao = createDao()) =>
  new TgAppService({
    dao,
    environment: 'development',
    allowedTelegramUserIds: [383288860, 142166671],
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
    { id: 1, title: 'Стоянов', count: 1 },
  ]);
  assert.deepEqual(state.assignedByUser[1].ranks, []);
});

test('passes authenticated actor to DAO assignment and refreshes state', async () => {
  const dao = createDao();
  const state = await createService(dao).assign(undefined, 65, 546166718);

  assert.deepEqual(dao.calls, [
    { rankId: 65, recipientId: 546166718, actorId: 383288860 },
  ]);
  assert.equal(state.availableRanks[0].id, 65);
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
