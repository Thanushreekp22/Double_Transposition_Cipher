/**
 * index.js — server entry point. Starts the Express app on PORT (default 4000).
 */
import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 4000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Double Transposition API listening on http://localhost:${PORT}`);
  console.log('  POST /api/encrypt  { message, key1, key2 }');
  console.log('  POST /api/decrypt  { ciphertext, key1, key2 }');
  console.log('  GET  /api/health');
});
