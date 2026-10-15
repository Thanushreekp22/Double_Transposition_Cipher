/**
 * cipher.test.js — automated unit tests for the Double Transposition Cipher.
 * Run with: npm test   (Node's built-in test runner, no extra dependencies)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encryptDoubleTransposition,
  decryptDoubleTransposition,
  normalizeMessage,
  normalizeKey,
  keyOrder,
  textToGrid,
  MAX_MESSAGE_LENGTH,
} from '../src/cipher.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Encrypts and then decrypts, asserting the round trip, and returns both results. */
function roundTrip(message, key1, key2) {
  const enc = encryptDoubleTransposition({ message, key1, key2 });
  const dec = decryptDoubleTransposition({
    ciphertext: enc.ciphertext,
    key1,
    key2,
  });
  assert.equal(dec.valid, true, `decryption should be valid for keys ${key1}/${key2}`);
  assert.equal(dec.plaintext, normalizeMessage(message));
  return { enc, dec };
}

// ---------------------------------------------------------------------------
// Normalization rules
// ---------------------------------------------------------------------------
test('normalizeMessage uppercases, strips punctuation and collapses spaces', () => {
  assert.equal(normalizeMessage('  meet   me at 5 pm!! '), 'MEET ME AT 5 PM');
  assert.equal(normalizeMessage('Hello,\nWorld!'), 'HELLO WORLD');
  assert.equal(normalizeMessage('???'), '');
  assert.equal(normalizeMessage(''), '');
  assert.equal(normalizeMessage(null), '');
});

test('normalizeKey uppercases and rejects invalid keys', () => {
  assert.equal(normalizeKey(' cipher '), 'CIPHER');
  assert.equal(normalizeKey('network'), 'NETWORK');
  assert.equal(normalizeKey('AB12'), 'AB12');
  assert.equal(normalizeKey('KEY!'), null);
  assert.equal(normalizeKey(''), null);
  assert.equal(normalizeKey('A'.repeat(17)), null);
});

// ---------------------------------------------------------------------------
// Key order (column read order)
// ---------------------------------------------------------------------------
test('keyOrder sorts columns alphabetically by key letter', () => {
  // CIPHER -> sorted letters: C E H I P R -> columns 0,4,3,1,2,5
  assert.deepEqual(keyOrder('CIPHER').order, [0, 4, 3, 1, 2, 5]);
  // NETWORK -> sorted letters: E K N O R T W -> columns 1,6,0,4,5,2,3
  assert.deepEqual(keyOrder('NETWORK').order, [1, 6, 0, 4, 5, 2, 3]);
});

test('keyOrder breaks duplicate letters by column position', () => {
  // Key "AAB" -> columns 0 and 1 both labelled A, read in position order.
  assert.deepEqual(keyOrder('AAB').order, [0, 1, 2]);
  assert.deepEqual(keyOrder('BBA').order, [2, 0, 1]);
});

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------
test('textToGrid pads the final row with X', () => {
  // 8 characters in 3 columns -> 3 rows -> 9 cells -> 1 padding character.
  const { grid, padded, padCount } = textToGrid('ABCDEFHI', 3);
  assert.equal(padded, 'ABCDEFHIX');
  assert.equal(padCount, 1);
  assert.deepEqual(grid[2], ['H', 'I', 'X']);
  // Exact multiple -> no padding.
  const exact = textToGrid('ABCDEF', 3);
  assert.equal(exact.padCount, 0);
});

// ---------------------------------------------------------------------------
// Known-answer test (worked by hand during the design of the project)
// ---------------------------------------------------------------------------
test('known answer: MEET ME AT 5 PM with CIPHER / NETWORK', () => {
  const enc = encryptDoubleTransposition({
    message: 'MEET ME AT 5 PM',
    key1: 'CIPHER',
    key2: 'NETWORK',
  });

  // Framing: header "015" + normalized message.
  assert.equal(enc.framed, '015MEET ME AT 5 PM');

  // Matrix 1 (3 rows x 6 cols, no padding needed: 18 chars).
  assert.deepEqual(enc.steps.first.grid, [
    ['0', '1', '5', 'M', 'E', 'E'],
    ['T', ' ', 'M', 'E', ' ', 'A'],
    ['T', ' ', '5', ' ', 'P', 'M'],
  ]);
  assert.equal(enc.steps.first.padCount, 0);
  assert.equal(enc.steps.first.output, '0TTE PME 1  5M5EAM');

  // Matrix 2 (3 rows x 7 cols, 3 X's of padding: 21 chars).
  assert.equal(enc.steps.second.padCount, 3);
  assert.equal(enc.ciphertext, 'T EMMX0E5  XP5XT1AE M');
  assert.equal(enc.meta.ciphertextLength, 21);

  // And it round-trips back to the original message.
  const dec = decryptDoubleTransposition({
    ciphertext: enc.ciphertext,
    key1: 'CIPHER',
    key2: 'NETWORK',
  });
  assert.equal(dec.valid, true);
  assert.equal(dec.plaintext, 'MEET ME AT 5 PM');
});

// ---------------------------------------------------------------------------
// Round trips across many messages and key shapes
// ---------------------------------------------------------------------------
test('round trip works for a variety of messages and keys', () => {
  const cases = [
    ['HELLO WORLD', 'ABC', 'XYZ'],
    ['ATTACK AT DAWN', 'KEY', 'LOCK'],
    ['MEET ME AT 5 PM', 'CIPHER', 'NETWORK'],
    ['S', 'A', 'B'], // single character message
    ['AB', 'LONGERKEY', 'SHORT'], // message shorter than the first matrix row
    ['THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 42', 'ZEBRA', 'PYTHON'],
    ['MISSION COMPLETE', 'A1B2', 'C3D4'],
    ['A B C D', 'AB', 'BA'], // tiny keys with duplicate letters
  ];
  for (const [message, key1, key2] of cases) {
    roundTrip(message, key1, key2);
  }
});

test('round trip works when the two keys have very different lengths', () => {
  roundTrip('SEND HELP IMMEDIATELY', 'K', 'COLUMNSKEY'); // 1 vs 10
  roundTrip('SEND HELP IMMEDIATELY', 'COLUMNSKEY', 'K'); // 10 vs 1
  roundTrip('SEND HELP IMMEDIATELY', 'AB', 'CDEFGHIJ'); // 2 vs 8
});


// ---------------------------------------------------------------------------
// Wrong keys and failure modes (used by the "Security Analysis" demo)
// ---------------------------------------------------------------------------
test('a wrong key produces different text and fails the validity checks', () => {
  const enc = encryptDoubleTransposition({
    message: 'MEET ME AT 5 PM',
    key1: 'CIPHER',
    key2: 'NETWORK',
  });

  // Changing one letter of key 2 (same length) still produces *a* text, but it is wrong:
  // the length header / padding checks fail, so the UI can warn the user.
  const wrongKey = decryptDoubleTransposition({
    ciphertext: enc.ciphertext,
    key1: 'CIPHER',
    key2: 'NETWORX',
  });
  assert.notEqual(wrongKey.plaintext, 'MEET ME AT 5 PM');
  assert.equal(wrongKey.valid, false);
  assert.ok(wrongKey.warning);

  // Swapping the two keys changes the number of columns; the ciphertext length is no
  // longer a multiple of key 2, so decryption is rejected with guidance.
  assert.throws(
    () =>
      decryptDoubleTransposition({
        ciphertext: enc.ciphertext,
        key1: 'NETWORK',
        key2: 'CIPHER',
      }),
    /multiple of key 2 length/
  );
});

test('ciphertext that is not a multiple of key 2 length is rejected with guidance', () => {
  assert.throws(
    () =>
      decryptDoubleTransposition({
        ciphertext: 'ABCDEF G', // 8 chars
        key1: 'CIPHER',
        key2: 'NETWORK', // 7 columns -> 8 is not a multiple of 7
      }),
    /multiple of key 2 length/
  );
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
test('empty or punctuation-only messages are rejected', () => {
  assert.throws(
    () => encryptDoubleTransposition({ message: '   ', key1: 'A', key2: 'B' }),
    /at least one letter or digit/
  );
  assert.throws(
    () => encryptDoubleTransposition({ message: '!!! ???', key1: 'A', key2: 'B' }),
    /at least one letter or digit/
  );
  assert.throws(
    () => encryptDoubleTransposition({ message: '', key1: 'A', key2: 'B' }),
    /at least one letter or digit/
  );
});

test('invalid keys are rejected with clear messages', () => {
  assert.throws(
    () => encryptDoubleTransposition({ message: 'HI', key1: '', key2: 'B' }),
    /Key 1 must be/
  );
  assert.throws(
    () => encryptDoubleTransposition({ message: 'HI', key1: 'A', key2: 'BAD KEY!' }),
    /Key 2 must be/
  );
  assert.throws(
    () => encryptDoubleTransposition({ message: 'HI', key1: 'A'.repeat(17), key2: 'B' }),
    /Key 1 must be/
  );
});

test('messages longer than the 3-digit header limit are rejected', () => {
  const longMessage = 'A'.repeat(MAX_MESSAGE_LENGTH + 1);
  assert.throws(
    () => encryptDoubleTransposition({ message: longMessage, key1: 'KEY', key2: 'LOCK' }),
    /too long/
  );
  // Exactly at the limit is fine.
  const enc = encryptDoubleTransposition({
    message: 'A'.repeat(MAX_MESSAGE_LENGTH),
    key1: 'KEY',
    key2: 'LOCK',
  });
  assert.ok(enc.ciphertext.length > 0);
});

// ---------------------------------------------------------------------------
// Structural properties worth demonstrating in the report
// ---------------------------------------------------------------------------
test('transposition preserves the character multiset (plus padding only)', () => {
  const message = 'ATTACK AT DAWN';
  const enc = encryptDoubleTransposition({ message, key1: 'KEY', key2: 'LOCK' });
  const counts = (text) => {
    const map = new Map();
    for (const ch of text) map.set(ch, (map.get(ch) ?? 0) + 1);
    return map;
  };
  const plainCounts = counts(enc.framed);
  const cipherCounts = counts(enc.ciphertext);
  // Every character in the framed plaintext appears the same number of times in the
  // ciphertext; the only difference is the padding characters added by matrix 2.
  for (const [ch, n] of plainCounts) {
    assert.ok((cipherCounts.get(ch) ?? 0) >= n, `character ${ch} should not lose occurrences`);
  }
  const extra = [...cipherCounts.entries()].reduce(
    (sum, [ch, n]) => sum + (n - (plainCounts.get(ch) ?? 0)),
    0
  );
  // The ciphertext contains the framed plaintext plus the padding of BOTH matrices.
  assert.equal(extra, enc.meta.pad1 + enc.meta.pad2);
});

test('the same keys always produce the same ciphertext (deterministic)', () => {
  const args = { message: 'MEET ME AT 5 PM', key1: 'CIPHER', key2: 'NETWORK' };
  const a = encryptDoubleTransposition(args);
  const b = encryptDoubleTransposition(args);
  assert.equal(a.ciphertext, b.ciphertext);
});

test('keys are case-insensitive and whitespace-tolerant', () => {
  const a = encryptDoubleTransposition({ message: 'HELLO', key1: 'CIPHER', key2: 'NETWORK' });
  const b = encryptDoubleTransposition({ message: 'HELLO', key1: ' cipher ', key2: 'network' });
  assert.equal(a.ciphertext, b.ciphertext);
});

test('message lengths that do not fill the matrix still round trip exactly', () => {
  // 7-char message with a 6-column first matrix -> 5 padding characters.
  roundTrip('ABCDEF G', 'CIPHER', 'NETWORK');
  // Exactly filling the first matrix -> no first padding.
  roundTrip('ABCDEFGHIJKL', 'ABCD', 'EFGH');
});
