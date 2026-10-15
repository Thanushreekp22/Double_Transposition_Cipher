# Double Transposition Cipher — INS Project

An interactive, full-stack demonstration of the **classical double transposition cipher**: how it
encrypts, how it decrypts, and — honestly — how it can be broken. Built with **React (Vite)** on
the frontend and **Node.js + Express** on the backend, with the cipher implemented in plain
JavaScript and covered by automated tests.

> **Educational use only.** Double transposition is a historical, pen-and-paper cipher. It is
> excellent for learning about confidentiality, permutations and classical cryptanalysis, but it
> must never be used to protect real data. Modern applications should use authenticated
> encryption such as **AES-256-GCM**.

---

## 1. What the project demonstrates

Alice wants to send a confidential message to Bob:

```
Alice — Sender
  Plaintext:  MEET ME AT 5 PM
      │
      ▼  Double Transposition Encryption (two secret keys, two matrix permutations)
  Ciphertext: T EMMX0E5  XP5XT1AE M        ← what an interceptor captures
      │
      ▼  Decryption with the same two keys (in reverse order)
Bob — Receiver
  Recovered:  MEET ME AT 5 PM
```

The key idea: the cipher **rearranges the positions of characters twice** (two columnar
transpositions) instead of replacing each character with another one.

## 2. How the cipher works

Both parties agree on two keywords, e.g. `CIPHER` and `NETWORK`. Each keyword's letters label the
columns of a matrix; the columns are read out in **alphabetical order of those letters** (ties are
broken left-to-right).

**Step 1 — Prepare the plaintext (framing).** The message is normalized (uppercased; punctuation
removed; whitespace collapsed; letters, digits and single spaces kept). A **3-digit length
header** is prepended so the receiver knows exactly how long the original message is (this
removes the classic padding ambiguity), and the text is written row-by-row into **matrix 1**,
which has one column per character of key 1. Incomplete rows are padded with `X`.

**Step 2 — First transposition.** The columns of matrix 1 are read out in key 1's alphabetical
order and concatenated into the *intermediate text*.

**Step 3 — Second transposition.** The intermediate text is written row-by-row into **matrix 2**
(one column per character of key 2, `X` padding again if needed). Its columns are read out in
key 2's order — this produces the **ciphertext**.

**Step 4 — Decryption.** Bob reverses everything: he rebuilds matrix 2 from the ciphertext,
restores the intermediate text, rebuilds matrix 1, reads the rows, strips the 3-digit header and
returns the original message. (The decryptor uses a small candidate search over the possible
padding counts — see `server/src/cipher.js` — because the header is only readable *after* the
first matrix is rebuilt.)

### Worked example (the demo in the app)

```
Plaintext : MEET ME AT 5 PM         (15 chars)
Framed    : 015MEET ME AT 5 PM      (header "015" + message, 18 chars)
Key 1     : CIPHER  -> read columns 1,5,4,2,3,6
Matrix 1  : 3 x 6, no padding
Intermediate : 0TTE PME 1  5M5EAM
Key 2     : NETWORK -> read columns 2,7,1,5,6,3,4
Matrix 2  : 3 x 7, padded with XXX
Ciphertext: T EMMX0E5  XP5XT1AE M   (21 chars)
```

This exact vector is asserted in the automated tests (`server/test/cipher.test.js`).

## 3. Features

1. **Message encryption** — enter a message + two keys, generate the ciphertext, copy it.
2. **Visual encryption simulator** — the full plaintext matrix, the first column rearrangement,
   the second rearrangement and the final ciphertext, with colour-coded columns showing exactly
   where each column jumps.
3. **Message decryption** — paste the ciphertext, enter both keys in the correct order, watch the
   reverse transformations rebuild the matrices and recover the plaintext. Validity indicators
   (length header ✓/✗, padding ✓/✗) show *why* wrong keys fail.


## 4. Technology stack

| Layer              | Technology                                          |
| ------------------ | --------------------------------------------------- |
| Frontend           | React 19 + Vite 8 (plain CSS, no UI framework)      |
| Backend            | Node.js 22 + Express 5                              |
| Cipher algorithm   | Plain JavaScript (`server/src/cipher.js`)           |
| Testing            | Node's built-in test runner (`node --test`) + Postman collection |
| Database           | Not used (optional in a later phase)                |

## 5. Project structure

```
INS/
├── server/                        Express backend
│   ├── src/
│   │   ├── cipher.js              ← the double transposition cipher (encrypt/decrypt + steps)
│   │   ├── app.js                 ← Express app & API routes (importable by tests)
│   │   └── index.js               ← starts the server on port 4000
│   └── test/
│       ├── cipher.test.js         ← 17 unit tests (known-answer, round-trips, edge cases)
│       └── api.test.js            ← 11 endpoint tests
├── client/                        React frontend
│   └── src/
│       ├── App.jsx                ← tab layout & shared state
│       ├── api.js                 ← API client + clipboard helper
│       └── components/
│           ├── EncryptPanel.jsx       feature 1: encrypt + copy
│           ├── SimulatorPanel.jsx     feature 2: step-by-step matrices
│           ├── DecryptPanel.jsx       feature 3: decrypt + reverse steps
│           └── MatrixView.jsx         shared matrix / read-order / chunk visualisations
├── docs/
│   └── InsDoubleTransposition.postman_collection.json
└── package.json                   convenience scripts for the whole project
```

## 6. Getting started

**Requirements:** Node.js ≥ 20.19 (developed on Node 22).

```bash
# 1. Install dependencies for backend and frontend
npm run install:all

# 2a. Development — run API and UI in two terminals
npm run dev:server          # http://localhost:4000
npm run dev:client          # http://localhost:5173  (proxies /api to :4000)

# 2b. Production-style single process — build UI then serve it from Express
npm run build               # builds client/dist
npm start                   # http://localhost:4000 serves API + UI
```

### Automated tests

```bash
npm test                    # runs all backend unit + API tests
```

### Postman

Import `docs/InsDoubleTransposition.postman_collection.json` and run the requests against
`http://localhost:4000` (health, encrypt, decrypt with correct keys, decrypt with wrong keys,
validation error, config).

## 7. Deployment

This project can be deployed as two services: the Express API on Render and the React/Vite
frontend on Vercel.

### Deploy the API to Render

1. Push the project to a GitHub repository.
2. In Render, choose **New + → Blueprint** and select the repository.
3. Render detects [`render.yaml`](./render.yaml), creates the `ins-double-transposition-api`
   web service, installs dependencies from `server/package.json`, and starts it with `npm start`.
4. After the first deploy, copy the service URL, for example:
   `https://ins-double-transposition-api.onrender.com`.
5. Verify the API at `/api/health`. It should return:
   `{ "ok": true, "service": "double-transposition-api" }`.

### Deploy the frontend to Vercel

1. In Vercel, import the same GitHub repository.
2. Set the Vercel **Root Directory** to `client`.
3. Vercel detects Vite and uses [`client/vercel.json`](./client/vercel.json) to build the app.
4. Add this Vercel environment variable for **Production**:

   ```text
   VITE_API_BASE_URL=https://ins-double-transposition-api.onrender.com
   ```

   Replace the value with the actual Render service URL and do not add a trailing slash.
5. Deploy or redeploy the Vercel project.
6. Open the Vercel URL and test encryption, the Visual Simulator, and decryption.

For local development, `VITE_API_BASE_URL` can remain unset: Vite's existing proxy sends
`/api` requests to `http://localhost:4000`.

## 8. API reference

All endpoints return JSON. Errors return `{ "ok": false, "error": "human readable message" }`
with HTTP 400.

### `POST /api/encrypt`

Request: `{ "message": "MEET ME AT 5 PM", "key1": "CIPHER", "key2": "NETWORK" }`

Response (abridged):

```json
{
  "ok": true,
  "plaintext": "MEET ME AT 5 PM",
  "framed": "015MEET ME AT 5 PM",
  "ciphertext": "T EMMX0E5  XP5XT1AE M",
  "keys": { "key1": "CIPHER", "key2": "NETWORK" },
  "steps": {
    "framing": { "originalLength": 15, "header": "015", "framed": "015MEET ME AT 5 PM" },
    "first":  { "columnLabels": ["C","I","P","H","E","R"], "readOrder": [0,4,3,1,2,5],
                "grid": [["0","1","5","M","E","E"]], "readChunks": ["0TT","E P"],
                "output": "0TTE PME 1  5M5EAM", "rows": 3, "cols": 6, "padCount": 0 },
    "second": { "columnLabels": ["N","E","T","W","O","R","K"], "readOrder": [1,6,0,4,5,2,3],
                "grid": [["0","T","T","E"," ","P","M"]], "padCount": 3,
                "output": "T EMMX0E5  XP5XT1AE M" }
  },
  "meta": { "cols1": 6, "rows1": 3, "pad1": 0, "cols2": 7, "rows2": 3, "pad2": 3,
            "ciphertextLength": 21 }
}
```

### `POST /api/decrypt`

Request: `{ "ciphertext": "T EMMX0E5  XP5XT1AE M", "key1": "CIPHER", "key2": "NETWORK" }`

Response (abridged): `{ "ok": true, "valid": true, "plaintext": "MEET ME AT 5 PM",
"headerValid": true, "paddingValid": true, "steps": { "secondReverse": {}, "firstReverse": {} } }`

- `valid: false` + `warning` means the framing checks failed (almost certainly wrong keys) — the
  UI highlights this and shows the garbage plaintext with a strike-through.
- A ciphertext whose length is not a multiple of key 2's length returns HTTP 400 with guidance.

### `GET /api/health`, `GET /api/config`

Liveness check and documented limits (max message 999 chars, max key length 16, pad char `X`,
3-digit header).

## 9. Evaluation demo script (8 steps)

Use this exact sequence when demonstrating to an evaluator (the app auto-loads this example on
start-up):

1. **Alice enters** `MEET ME AT 5 PM` on the **Encrypt** tab with keys `CIPHER` and `NETWORK`,
   then clicks *Encrypt message*.
2. The system shows the **plaintext matrix** (3 × 6) — open the **Visual Simulator** tab. Step 1
   shows the framing (`015` header) and the matrix written row by row.
3. **Key 1 rearranges the columns** — Step 2 shows the colour-coded read order
   1 → 5 → 4 → 2 → 3 → 6 and the intermediate text `0TTE PME 1  5M5EAM`.
4. **Key 2 rearranges them again** — Step 3 shows matrix 2 (3 × 7, `XXX` padding in red) and the
   column order 2 → 7 → 1 → 5 → 6 → 3 → 4.
5. **The ciphertext is generated** — Step 4 displays `T EMMX0E5  XP5XT1AE M`; copy it with the
   button (back on the Encrypt tab).
6. **Bob pastes the ciphertext** on the **Decrypt** tab and enters both keys in the same order.
7. The system **restores the original message** `MEET ME AT 5 PM` and shows the two matrix
   rebuilds. The green banner confirms the length header (`015`) and padding checks passed.
8. **Change a key** and decrypt again: either the framing checks fail (`valid: false`, garbage
   shown struck-through) or — when the wrong key has a different length — the request is rejected
   with an explanation that the ciphertext length no longer matches. Explain: *the cipher still
   produces output for wrong keys; only our educational framing checks reveal the mistake. Real
   classical users had no such signal.*

## 10. Testing

`npm test` runs **28 automated tests** (Node's built-in runner, zero extra dependencies):

- **Known-answer test** — the worked example above is asserted character by character.
- **Round-trip property tests** — many message/key combinations, keys of very different lengths
  (1 vs 10, 10 vs 1, 2 vs 8), duplicate letters in keys, single-character messages.
- **Edge cases** — messages that do not fill the matrix (extra `X` padding), messages that fill
  it exactly, case-insensitive keys, whitespace/punctuation tolerance.
- **Failure modes** — wrong key (`valid: false` + warning), swapped keys (column-count
  mismatch rejected with guidance), malformed ciphertext, empty message, over-long message,
  invalid keys.
- **Structural properties** — determinism, and the security-relevant fact that transposition
  preserves the character multiset (only padding characters are added).
- **API tests** — happy paths, validation errors (HTTP 400), malformed JSON, unknown routes.

Manual test matrix performed during development (all via the UI and Postman):

| Case                        | Result                                        |
| --------------------------- | --------------------------------------------- |
| Correct keys                | Plaintext recovered, banner green             |
| One letter changed in key 2 | `valid: false`, header check fails            |
| Keys swapped                | HTTP 400: length not a multiple of key 2      |
| Empty / punctuation message | HTTP 400 with clear message                   |
| Message with spaces & digits| Spaces preserved; round trip exact            |
| Length not multiple of rows | Padding added and stripped correctly          |

## 11. Security analysis (summary for the report)

- **What the cipher provides:** *confidentiality by obscurity of a permutation* — an interceptor
  who lacks the keys sees only a scrambled character sequence. Historically used (in various
  forms) for military traffic, most famously the German double transposition in WWII.
- **What it does NOT provide:** authentication, integrity, or protection against modern
  cryptanalysis. Anyone can alter the ciphertext and Bob has no way to detect tampering.
- **Attack 1 — frequency analysis:** because characters are only *moved*, never replaced, the
  ciphertext has the same character frequencies as the plaintext (the app's chart shows this
  live). Digram/trigram statistics of the underlying language make recovery feasible.
- **Attack 2 — small key space:** for key lengths *a* and *b* only *a! · b!* distinct column
  orders exist (6! · 7! ≈ 3.6 million for the demo keys) — trivial to enumerate; hill-climbing
  attacks break longer keys with a few hundred characters of known or guessed plaintext.
- **Attack 3 — known-plaintext:** a guessed word (e.g. "COMMAND") directly reveals the column
  correspondence.
- **Conclusion:** excellent for teaching, useless for real security. Real systems must use
  **authenticated modern encryption (AES-256-GCM, or RSA/ECDH + AES hybrid schemes)** and
  established libraries — never home-grown crypto.

## 12. Possible extensions (not required for v1)

- MongoDB-backed history of encryptions/decryptions, or user accounts (Phase 5 of the plan —
  intentionally left out of v1 per the project brief).
- A "known-plaintext attack" simulator that solves the key from a guessed crib — great for
  showing why classical ciphers fail.
- WebWorker-based brute-force visualiser for small keys.
- Export/import of step visualisations as PNG for reports.
