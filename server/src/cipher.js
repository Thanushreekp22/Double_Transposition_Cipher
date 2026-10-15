/**
 * cipher.js — Classical Double Transposition Cipher (educational implementation)
 *
 * The cipher performs TWO successive columnar transpositions:
 *
 *   1. The framed plaintext is written row-by-row into matrix 1 (columns = length of key 1).
 *   2. The columns of matrix 1 are read out in the order given by key 1 (alphabetical order of
 *      its letters; ties broken by column position) -> "intermediate text".
 *   3. The intermediate text is written row-by-row into matrix 2 (columns = length of key 2).
 *   4. The columns of matrix 2 are read out in the order given by key 2 -> ciphertext.
 *
 * Decryption performs the exact inverse operations in reverse order.
 *
 * Framing rules (documented, deterministic):
 *   - The message is normalized (uppercased; only letters, digits and single spaces kept).
 *   - A 3-digit, zero-padded length header is prepended so the receiver can remove the 'X'
 *     padding characters exactly (this removes the classic padding ambiguity).
 *   - Incomplete matrix rows are padded with the filler character 'X'.
 *
 * SECURITY NOTE: This is a classical, educational cipher. It does NOT provide authentication,
 * integrity, or protection against modern cryptanalysis. Real systems must use authenticated
 * modern encryption such as AES-GCM.
 */

export const PAD_CHARACTER = 'X';
export const HEADER_LENGTH = 3;
export const MAX_MESSAGE_LENGTH = 999; // header stores the length in 3 digits
export const MAX_KEY_LENGTH = 16;

const KEY_PATTERN = /^[A-Z0-9]+$/;

/**
 * Normalizes a plaintext message:
 *   - Uppercases everything.
 *   - Converts tabs/newlines to spaces, removes punctuation, collapses repeated spaces, trims.
 *   - Keeps letters A-Z, digits 0-9 and single spaces.
 */
export function normalizeMessage(input) {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[\t\n\r\f\v]/g, ' ')
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/**
 * Normalizes a transposition key: uppercases and removes all whitespace.
 * Returns null when the key contains characters other than letters/digits or is too long.
 */
export function normalizeKey(input) {
  const key = String(input ?? '')
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!KEY_PATTERN.test(key) || key.length > MAX_KEY_LENGTH) return null;
  return key;
}

/**
 * Cleans a ciphertext for decryption: uppercases and removes every character that is not
 * a letter, digit or space. Spaces are PRESERVED exactly (they are meaningful cipher
 * characters — collapsing them would corrupt the ciphertext). Tabs/newlines coming from
 * copy-paste are stripped.
 */
export function normalizeCiphertext(input) {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[\t\n\r\f\v]/g, '')
    .replace(/[^A-Z0-9 ]/g, '');
}

/**
 * Computes the column read-order for a key.
 * Columns are labeled with the key characters; they are read in alphabetical order of those
 * characters. Duplicate characters keep their original column order (stable sort).
 *
 * Returns { labels, order, rank } where:
 *   - labels[i] is the key character of column i,
 *   - order[k] is the column index read at step k,
 *   - rank[col] is the read position of column col (useful for colouring in the visualiser).
 */
export function keyOrder(key) {
  const labels = key.split('');
  const order = labels
    .map((ch, index) => ({ ch, index }))
    .sort((a, b) => (a.ch < b.ch ? -1 : a.ch > b.ch ? 1 : a.index - b.index))
    .map((entry) => entry.index);
  const rank = [];
  order.forEach((col, k) => {
    rank[col] = k;
  });
  return { labels, order, rank };
}

/** Writes `text` row-by-row into a rows x cols matrix (fills the last row with padCharacter). */
export function textToGrid(text, cols, padCharacter = PAD_CHARACTER) {
  const rows = Math.ceil(text.length / cols);
  const padded = text + padCharacter.repeat(rows * cols - text.length);
  const grid = [];
  for (let r = 0; r < rows; r += 1) {
    grid.push(padded.slice(r * cols, (r + 1) * cols).split(''));
  }
  return { grid, padded, rows, padCount: rows * cols - text.length };
}

/** Reads a grid column-by-column following `order`; returns the text and one chunk per column. */
export function readColumns(grid, order) {
  const chunks = order.map((col) => grid.map((row) => row[col]).join(''));
  return { text: chunks.join(''), chunks };
}

/** Rebuilds a grid by placing consecutive chunks of `text` into the columns given by `order`. */
export function rebuildGrid(text, rows, cols, order) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(''));
  let cursor = 0;
  for (const col of order) {
    for (let r = 0; r < rows; r += 1) {
      grid[r][col] = text[cursor];
      cursor += 1;
    }
  }
  return grid;
}

/** Validates raw user inputs. Throws an Error with a user-friendly message when invalid. */
export function validateInput({ message, key1, key2 }) {
  const normalized = normalizeMessage(message);
  if (!normalized) {
    throw new Error('Message must contain at least one letter or digit (after normalization).');
  }
  if (normalized.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message is too long: maximum ${MAX_MESSAGE_LENGTH} characters after normalization.`);
  }
  const k1 = normalizeKey(key1);
  if (!k1) {
    throw new Error(`Key 1 must be 1-${MAX_KEY_LENGTH} characters using only letters or digits.`);
  }
  const k2 = normalizeKey(key2);
  if (!k2) {
    throw new Error(`Key 2 must be 1-${MAX_KEY_LENGTH} characters using only letters or digits.`);
  }
  return { normalized, k1, k2 };
}

/**
 * Encrypts a plaintext message with two transposition keys.
 * Returns the ciphertext together with every intermediate structure so the frontend can
 * visualise the full step-by-step process.
 */
export function encryptDoubleTransposition({ message, key1, key2 }) {
  const { normalized, k1, k2 } = validateInput({ message, key1, key2 });

  // --- Step 1: framing -------------------------------------------------------
  const header = String(normalized.length).padStart(HEADER_LENGTH, '0');
  const framed = header + normalized;

  // --- Step 2: first transposition (matrix 1) --------------------------------
  const cols1 = k1.length;
  const { labels: labels1, order: order1 } = keyOrder(k1);
  const m1 = textToGrid(framed, cols1);
  const first = readColumns(m1.grid, order1);

  // --- Step 3: second transposition (matrix 2) --------------------------------
  const cols2 = k2.length;
  const { labels: labels2, order: order2 } = keyOrder(k2);
  const m2 = textToGrid(first.text, cols2);
  const second = readColumns(m2.grid, order2);

  const ciphertext = second.text;

  return {
    plaintext: normalized,
    framed,
    ciphertext,
    keys: { key1: k1, key2: k2 },
    steps: {
      framing: {
        originalLength: normalized.length,
        header,
        framed,
      },
      first: {
        key: k1,
        columnLabels: labels1,
        readOrder: order1,
        grid: m1.grid,
        rows: m1.rows,
        cols: cols1,
        padCount: m1.padCount,
        readChunks: first.chunks,
        output: first.text,
      },
      second: {
        key: k2,
        columnLabels: labels2,
        readOrder: order2,
        grid: m2.grid,
        paddedText: m2.padded,
        rows: m2.rows,
        cols: cols2,
        padCount: m2.padCount,
        readChunks: second.chunks,
        output: ciphertext,
      },
    },
    meta: {
      normalizedLength: normalized.length,
      framedLength: framed.length,
      cols1,
      rows1: m1.rows,
      pad1: m1.padCount,
      cols2,
      rows2: m2.rows,
      pad2: m2.padCount,
      ciphertextLength: ciphertext.length,
    },
  };
}

/**
 * Decrypts a ciphertext produced by encryptDoubleTransposition using the same two keys.
 *
 * The tricky part of the reverse process: after undoing transposition 2 we hold the
 * INTERMEDIATE text, which still ends with the padding characters of matrix 2. The length
 * header that tells us where the real message ends is only readable AFTER undoing
 * transposition 1. To break this circular dependency we use a property both parties know —
 * the keys: the true intermediate length must be a multiple of cols1. So we try every
 * possible matrix-2 pad count p (0 .. cols2-1), fully reverse the cipher for each
 * candidate, and accept the first one whose recovered length header and trailing 'X'
 * padding are consistent. In practice there is exactly one such candidate.
 *
 * Because a wrong key pair still produces *some* text, the result includes validity signals
 * (`headerValid`, `paddingValid`) that the UI uses to explain why decryption failed.
 */
export function decryptDoubleTransposition({ ciphertext, key1, key2 }) {
  const k1 = normalizeKey(key1);
  if (!k1) {
    throw new Error(`Key 1 must be 1-${MAX_KEY_LENGTH} characters using only letters or digits.`);
  }
  const k2 = normalizeKey(key2);
  if (!k2) {
    throw new Error(`Key 2 must be 1-${MAX_KEY_LENGTH} characters using only letters or digits.`);
  }
  const cleanCipher = normalizeCiphertext(ciphertext);
  if (!cleanCipher) {
    throw new Error('Ciphertext must contain at least one letter, digit or space.');
  }
  const cols1 = k1.length;
  const cols2 = k2.length;
  if (cleanCipher.length % cols2 !== 0) {
    throw new Error(
      `Ciphertext length (${cleanCipher.length}) must be a multiple of key 2 length (${cols2}). ` +
        'Check that both keys match the ones used for encryption.'
    );
  }

  const { labels: labels1, order: order1 } = keyOrder(k1);
  const { labels: labels2, order: order2 } = keyOrder(k2);
  const rows2 = cleanCipher.length / cols2;

  // --- Step 1 of the reversal: put the ciphertext columns back into matrix 2 --
  const grid2 = rebuildGrid(cleanCipher, rows2, cols2, order2);
  const intermediateFull = grid2.map((row) => row.join('')).join('');

  // --- Candidate search for the matrix-2 padding ------------------------------
  // p = assumed pad2 count. The intermediate length (cipherLength - p) must be a
  // multiple of cols1 for matrix 1 to be reconstructable.
  const candidates = [];
  for (let p = 0; p < cols2; p += 1) {
    const intermediateLength = cleanCipher.length - p;
    if (intermediateLength > 0 && intermediateLength % cols1 === 0) {
      candidates.push(p);
    }
  }
  if (candidates.length === 0) {
    throw new Error(
      `Cannot align the ciphertext with key 1 (${cols1} columns) and key 2 (${cols2} columns). ` +
        'Check that both keys match the ones used for encryption.'
    );
  }

  const attempt = (pad2) => {
    const intermediate = intermediateFull.slice(0, intermediateFull.length - pad2);
    const rows1 = intermediate.length / cols1;
    const grid1 = rebuildGrid(intermediate, rows1, cols1, order1);
    const framedFull = grid1.map((row) => row.join('')).join('');
    const headerCandidate = framedFull.slice(0, HEADER_LENGTH);
    const headerValid = /^\d{3}$/.test(headerCandidate);
    if (!headerValid) return { pad2, headerCandidate, headerValid: false, valid: false };

    const recoveredLength = Number(headerCandidate);
    const framedBase = HEADER_LENGTH + recoveredLength;
    const pad1 = (cols1 - (framedBase % cols1)) % cols1;
    const framedLength = framedBase + pad1;
    const lengthConsistent = framedLength === intermediate.length;
    const paddingValid =
      lengthConsistent &&
      framedFull
        .slice(framedBase)
        .split('')
        .every((ch) => ch === PAD_CHARACTER);
    return {
      pad2,
      headerCandidate,
      headerValid,
      recoveredLength,
      framedFull,
      grid1,
      rows1,
      framedBase,
      pad1,
      intermediate,
      lengthConsistent,
      paddingValid,
      valid: lengthConsistent && paddingValid,
    };
  };

  // Prefer a candidate that passes all framing checks; otherwise report the first one.
  let outcome = candidates.map(attempt).find((a) => a.valid) ?? attempt(candidates[0]);

  const {
    pad2,
    headerCandidate,
    headerValid,
    recoveredLength,
    framedFull,
    grid1,
    rows1,
    intermediate,
    paddingValid,
    valid,
  } = outcome;

  const plaintext = framedFull ? framedFull.slice(HEADER_LENGTH, HEADER_LENGTH + (recoveredLength ?? 0)) : '';

  const warning = valid
    ? null
    : 'The keys do not seem to be the ones used for encryption: the length header or the ' +
      'padding check failed. With a transposition cipher a wrong key still produces ' +
      'readable-looking text — it is simply the wrong text.';

  return {
    valid,
    warning,
    headerValid,
    paddingValid: Boolean(paddingValid),
    headerCandidate,
    recoveredLength,
    pad2,
    plaintext,
    keys: { key1: k1, key2: k2 },
    steps: {
      secondReverse: {
        key: k2,
        columnLabels: labels2,
        readOrder: order2,
        grid: grid2,
        rows: rows2,
        cols: cols2,
        intermediateFull,
        padCount: pad2,
        intermediate,
      },
      firstReverse: {
        key: k1,
        columnLabels: labels1,
        readOrder: order1,
        grid: grid1,
        rows: rows1 ?? 0,
        cols: cols1,
        framed: framedFull,
        header: headerCandidate,
        plaintext,
      },
    },
    meta: {
      ciphertextLength: cleanCipher.length,
      cols2,
      rows2,
      cols1,
      rows1: rows1 ?? null,
      candidates: candidates.length,
    },
  };
}

