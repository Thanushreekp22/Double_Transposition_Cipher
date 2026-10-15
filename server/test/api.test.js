/**
 * api.test.js — automated tests for the Express API endpoints.
 * Uses Node's built-in test runner and fetch against an ephemeral server instance.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
});

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

test('GET /api/health returns ok', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
});

test('POST /api/encrypt encrypts the demo message', async () => {
  const { status, data } = await post('/api/encrypt', {
    message: 'MEET ME AT 5 PM',
    key1: 'CIPHER',
    key2: 'NETWORK',
  });
  assert.equal(status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.ciphertext, 'T EMMX0E5  XP5XT1AE M');
  assert.equal(data.plaintext, 'MEET ME AT 5 PM');
  // Step structures needed by the visualiser must be present.
  assert.equal(data.steps.first.grid.length, 3);
  assert.equal(data.steps.second.grid.length, 3);
  assert.deepEqual(data.steps.first.readOrder, [0, 4, 3, 1, 2, 5]);
});

test('POST /api/encrypt + /api/decrypt round trip through the API', async () => {
  const enc = await post('/api/encrypt', { message: 'Attack at dawn!', key1: 'KEY', key2: 'LOCK' });
  assert.equal(enc.status, 200);
  const dec = await post('/api/decrypt', {
    ciphertext: enc.data.ciphertext,
    key1: 'KEY',
    key2: 'LOCK',
  });
  assert.equal(dec.status, 200);
  assert.equal(dec.data.valid, true);
  assert.equal(dec.data.plaintext, 'ATTACK AT DAWN');
});

test('POST /api/decrypt with wrong keys returns valid=false and a warning', async () => {
  const enc = await post('/api/encrypt', { message: 'SECRET MEETING', key1: 'CIPHER', key2: 'NETWORK' });
  // Same-length wrong key: decryption "succeeds" but the framing checks fail.
  const dec = await post('/api/decrypt', {
    ciphertext: enc.data.ciphertext,
    key1: 'CIPHER',
    key2: 'NETWORX',
  });
  assert.equal(dec.status, 200);
  assert.equal(dec.data.valid, false);
  assert.ok(dec.data.warning);
  assert.notEqual(dec.data.plaintext, 'SECRET MEETING');
});

test('POST /api/decrypt with swapped keys is rejected with column guidance', async () => {
  const enc = await post('/api/encrypt', { message: 'SECRET MEETING', key1: 'CIPHER', key2: 'NETWORK' });
  const dec = await post('/api/decrypt', {
    ciphertext: enc.data.ciphertext,
    key1: 'NETWORK',
    key2: 'CIPHER', // 6 columns now, ciphertext length is a multiple of 7, not 6
  });
  assert.equal(dec.status, 400);
  assert.match(dec.data.error, /multiple of key 2 length/);
});

test('POST /api/encrypt rejects an empty message with 400', async () => {
  const { status, data } = await post('/api/encrypt', { message: '   ', key1: 'A', key2: 'B' });
  assert.equal(status, 400);
  assert.equal(data.ok, false);
  assert.match(data.error, /at least one letter or digit/);
});

test('POST /api/encrypt rejects missing keys with 400', async () => {
  const { status, data } = await post('/api/encrypt', { message: 'HELLO' });
  assert.equal(status, 400);
  assert.match(data.error, /Key 1/);
});

test('POST /api/decrypt rejects a malformed ciphertext with 400', async () => {
  const { status, data } = await post('/api/decrypt', {
    ciphertext: 'ABC', // 3 is not a multiple of key 2 length 7
    key1: 'CIPHER',
    key2: 'NETWORK',
  });
  assert.equal(status, 400);
  assert.match(data.error, /multiple of key 2 length/);
});

test('POST /api/encrypt rejects malformed JSON with 400', async () => {
  const res = await fetch(`${baseUrl}/api/encrypt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ not json',
  });
  assert.equal(res.status, 400);
});

test('unknown API routes return 404 JSON', async () => {
  const res = await fetch(`${baseUrl}/api/nope`);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.ok, false);
});

test('GET /api/config returns documented limits', async () => {
  const res = await fetch(`${baseUrl}/api/config`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.padCharacter, 'X');
  assert.equal(data.headerLength, 3);
});
