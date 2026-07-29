require('ts-node/register');

const assert = require('node:assert/strict');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { TgAppController } = require('../../src/modules/tg-app/tg-app.controller');
const { createTgAppModule } = require('../../src/modules/tg-app/tg-app.module');
const { TgAppError } = require('../../src/modules/tg-app/tg-app.service');

const apiState = {
  availableRanks: [{ id: 65, title: 'Кукурузный макрогол' }],
  users: [],
  assignedByUser: [],
};

const service = {
  assignCalls: [],
  async getState(authorization) {
    if (authorization === 'tma rejected') {
      throw new TgAppError(401, 'User is not allowed');
    }
    if (authorization === 'tma explode') {
      throw new Error('database password leaked');
    }
    return apiState;
  },
  async assign(authorization, rankId, recipientId) {
    if (!Number.isInteger(rankId) || !Number.isInteger(recipientId)) {
      throw new TgAppError(400, 'Invalid assignment');
    }
    if (rankId === 404) throw new TgAppError(404, 'Rank not found');
    if (rankId === 409) {
      throw new TgAppError(409, 'Rank is already assigned');
    }
    this.assignCalls.push([authorization, rankId, recipientId]);
    return apiState;
  },
};

let tgAppModule;
let baseUrl;
let staticDirectory;
const loggedErrors = [];

before(async () => {
  staticDirectory = await mkdtemp(path.join(os.tmpdir(), 'ranks-tg-app-'));
  await writeFile(
    path.join(staticDirectory, 'index.html'),
    '<!doctype html><main>Mini App</main>',
  );
  await writeFile(path.join(staticDirectory, 'app.css'), 'body { color: red; }');

  let listeningPort;
  tgAppModule = createTgAppModule({
    controller: new TgAppController(service),
    port: 0,
    staticDirectory,
    logError: (error) => loggedErrors.push(error),
    onListening: (port) => {
      listeningPort = port;
    },
  });
  await tgAppModule.launch();
  baseUrl = `http://127.0.0.1:${listeningPort}`;
});

after(async () => {
  await tgAppModule.close();
  await rm(staticDirectory, { recursive: true, force: true });
});

test('health is public', async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test('state preserves the API response', async () => {
  const response = await fetch(`${baseUrl}/api/state`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), apiState);
});

test('assignment passes route id, body user id, and auth header', async () => {
  const response = await fetch(`${baseUrl}/api/ranks/65/assign`, {
    method: 'POST',
    headers: {
      authorization: 'tma signed-data',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ userId: 546166718 }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(service.assignCalls, [['tma signed-data', 65, 546166718]]);
});

test('rejects malformed JSON and bodies over 8 KiB', async () => {
  const malformed = await fetch(`${baseUrl}/api/ranks/65/assign`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  const oversized = await fetch(`${baseUrl}/api/ranks/65/assign`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: 546166718, padding: 'x'.repeat(8192) }),
  });

  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: 'Invalid JSON body' });
  assert.equal(oversized.status, 413);
  assert.deepEqual(await oversized.json(), { error: 'Request body too large' });
});

test('rejects invalid rank and user values', async () => {
  const invalidRank = await fetch(`${baseUrl}/api/ranks/nope/assign`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: 546166718 }),
  });
  const invalidUser = await fetch(`${baseUrl}/api/ranks/65/assign`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: 'nope' }),
  });

  assert.equal(invalidRank.status, 400);
  assert.equal(invalidUser.status, 400);
});

test('preserves known service errors', async () => {
  const unauthorized = await fetch(`${baseUrl}/api/state`, {
    headers: { authorization: 'tma rejected' },
  });
  const missing = await fetch(`${baseUrl}/api/ranks/404/assign`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: 546166718 }),
  });
  const conflict = await fetch(`${baseUrl}/api/ranks/409/assign`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: 546166718 }),
  });

  assert.deepEqual(
    [unauthorized.status, missing.status, conflict.status],
    [401, 404, 409],
  );
});

test('hides unexpected server errors', async () => {
  const response = await fetch(`${baseUrl}/api/state`, {
    headers: { authorization: 'tma explode' },
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Internal server error' });
  assert.equal(loggedErrors.length, 1);
});

test('unknown API paths return JSON 404', async () => {
  const response = await fetch(`${baseUrl}/api/nope`);

  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.deepEqual(await response.json(), { error: 'Not found' });
});

test('exact API root returns JSON 404 instead of the SPA', async () => {
  const response = await fetch(`${baseUrl}/api`);

  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.deepEqual(await response.json(), { error: 'Not found' });
});

test('serves static assets with MIME types and falls back to the SPA', async () => {
  const asset = await fetch(`${baseUrl}/app.css`);
  const navigation = await fetch(`${baseUrl}/friends/546166718`);

  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type'), /^text\/css/);
  assert.equal(await asset.text(), 'body { color: red; }');
  assert.equal(navigation.status, 200);
  assert.match(await navigation.text(), /Mini App/);
});

test('rejects path traversal', async () => {
  const status = await new Promise((resolve, reject) => {
    const request = http.get(
      {
        host: '127.0.0.1',
        port: Number(new URL(baseUrl).port),
        path: '/%2e%2e%2fsecret.txt',
      },
      (response) => {
        response.resume();
        response.on('end', () => resolve(response.statusCode));
      },
    );
    request.on('error', reject);
  });

  assert.equal(status, 400);
});

test('launch and close are idempotent', async () => {
  await tgAppModule.launch();
});
