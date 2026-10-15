/**
 * api.js — tiny client for the Double Transposition API + small clipboard helper.
 */

async function post(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'Cannot reach the API server. Start the backend with "npm run dev:server" in the project root.'
    );
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Unexpected response from the server (HTTP ${response.status}).`);
  }
  if (!response.ok || data.ok === false) {
    throw new Error(data?.error || `Request failed with HTTP ${response.status}.`);
  }
  return data;
}

/** Encrypts a message: payload { message, key1, key2 }. */
export function encryptRequest(payload) {
  return post('/api/encrypt', payload);
}

/** Decrypts a ciphertext: payload { ciphertext, key1, key2 }. */
export function decryptRequest(payload) {
  return post('/api/decrypt', payload);
}

/** Copies text to the clipboard, with a fallback for older browsers. Returns true on success. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}
