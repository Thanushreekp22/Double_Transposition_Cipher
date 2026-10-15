/**
 * app.js — Express application for the Double Transposition Cipher demo API.
 * The app is exported separately from index.js so automated tests can import it
 * without starting a listener.
 */
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  encryptDoubleTransposition,
  decryptDoubleTransposition,
  MAX_MESSAGE_LENGTH,
  MAX_KEY_LENGTH,
} from './cipher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  // Reject non-object JSON bodies early with a friendly message.
  app.use((req, res, next) => {
    if (req.method === 'POST' && req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      return next();
    }
    if (req.method === 'POST') {
      return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }
    return next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'double-transposition-api' });
  });

  // Encrypt: { message, key1, key2 } -> ciphertext + step-by-step structures
  app.post('/api/encrypt', (req, res) => {
    try {
      const { message, key1, key2 } = req.body ?? {};
      const result = encryptDoubleTransposition({ message, key1, key2 });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // Decrypt: { ciphertext, key1, key2 } -> plaintext + validity signals + reverse steps
  app.post('/api/decrypt', (req, res) => {
    try {
      const { ciphertext, key1, key2 } = req.body ?? {};
      const result = decryptDoubleTransposition({ ciphertext, key1, key2 });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // Describe the cipher so the frontend can render docs without hard-coding limits.
  app.get('/api/config', (_req, res) => {
    res.json({
      ok: true,
      maxMessageLength: MAX_MESSAGE_LENGTH,
      maxKeyLength: MAX_KEY_LENGTH,
      padCharacter: 'X',
      headerLength: 3,
    });
  });

  // Serve the built frontend (client/dist) when it exists, so `npm run build && npm start`
  // gives a single-process demo.
  const distDir = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    // SPA fallback (registered as middleware so it works with Express 5's path syntax).
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distDir, 'index.html'));
      }
      return next();
    });
  }

  // JSON 404 for unknown API routes (must be registered after the routes).
  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'Unknown API route.' });
  });

  // Central error handler (e.g. malformed JSON).
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ ok: false, error: 'Invalid JSON body.' });
    }
    res.status(500).json({ ok: false, error: 'Internal server error.' });
  });

  return app;
}
