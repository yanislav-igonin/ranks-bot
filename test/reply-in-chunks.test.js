require('ts-node/register');

const assert = require('assert');
const {
  replyInChunks,
} = require('../src/controllers/reply-in-chunks');

const LIMIT = 4096;

const test = async (name, run) => {
  try {
    await run();
    process.stdout.write(`✓ ${name}\n`);
  } catch (error) {
    process.stderr.write(`✗ ${name}\n`);
    throw error;
  }
};

const repliesFor = async (text) => {
  const replies = [];
  await replyInChunks({
    reply: async (chunk) => {
      replies.push(chunk);
    },
  }, text);
  return replies;
};

(async () => {
  await test('sends short text once', async () => {
    assert.deepStrictEqual(await repliesFor('hello'), ['hello']);
  });

  await test('prefers newline within Telegram limit', async () => {
    const firstLine = 'a'.repeat(4000);
    const secondLine = 'b'.repeat(200);

    assert.deepStrictEqual(
      await repliesFor(`${firstLine}\n${secondLine}`),
      [firstLine, secondLine],
    );
  });

  await test('hard-splits a line longer than Telegram limit', async () => {
    const text = 'a'.repeat(LIMIT + 1);

    assert.deepStrictEqual(
      await repliesFor(text),
      ['a'.repeat(LIMIT), 'a'],
    );
  });

  await test('does not send empty chunks at a boundary newline', async () => {
    const text = `${'a'.repeat(LIMIT)}\n`;

    assert.deepStrictEqual(await repliesFor(text), ['a'.repeat(LIMIT)]);
  });

  await test('waits for each reply before sending the next', async () => {
    const calls = [];
    let releaseFirst;
    const firstReply = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    const sending = replyInChunks({
      reply: async (chunk) => {
        calls.push(chunk);
        if (calls.length === 1) {
          await firstReply;
        }
      },
    }, `${'a'.repeat(LIMIT)}b`);

    await Promise.resolve();
    assert.deepStrictEqual(calls, ['a'.repeat(LIMIT)]);

    releaseFirst();
    await sending;
    assert.deepStrictEqual(calls, ['a'.repeat(LIMIT), 'b']);
  });

  await test('stops after first rejected reply', async () => {
    const calls = [];
    const expectedError = new Error('Telegram unavailable');

    await assert.rejects(
      replyInChunks({
        reply: async (chunk) => {
          calls.push(chunk);
          throw expectedError;
        },
      }, `${'a'.repeat(LIMIT)}b`),
      expectedError,
    );
    assert.deepStrictEqual(calls, ['a'.repeat(LIMIT)]);
  });
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
