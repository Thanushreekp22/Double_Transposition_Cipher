import { useState } from 'react';
import { encryptRequest, copyText } from '../api.js';

/**
 * EncryptPanel — Alice's side.
 * Enter a message and two keys, generate the ciphertext, copy it.
 * The result is owned by the App so the Simulator tab can reuse it.
 */
export default function EncryptPanel({ result, onEncrypted, onGoToSimulator }) {
  const [message, setMessage] = useState('MEET ME AT 5 PM');
  const [key1, setKey1] = useState('CIPHER');
  const [key2, setKey2] = useState('NETWORK');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await encryptRequest({ message, key1, key2 });
      onEncrypted?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    const ok = await copyText(result.ciphertext);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="panel">
      <div className="panel-intro">
        <h2>1 · Message Encryption</h2>
        <p>
          Alice writes her plaintext and agrees on two secret keys with Bob. The first key orders
          the columns of the first matrix; the second key re-orders the columns of the second
          matrix. Only someone who knows <em>both keys, in the correct order</em> can reverse the
          process.
        </p>
      </div>

      <form className="encrypt-form card" onSubmit={handleSubmit}>
        <label className="field field-message">
          <span className="field-label">Plaintext message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="e.g. MEET ME AT 5 PM"
            aria-label="Plaintext message"
          />
          <span className="field-help">
            Letters, digits and spaces are kept; punctuation is removed and everything is
            uppercased.
          </span>
        </label>

        <div className="key-row">
          <label className="field">
            <span className="field-label">Key 1 (first matrix)</span>
            <input
              value={key1}
              onChange={(e) => setKey1(e.target.value)}
              placeholder="CIPHER"
              aria-label="Key 1"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span className="field-label">Key 2 (second matrix)</span>
            <input
              value={key2}
              onChange={(e) => setKey2(e.target.value)}
              placeholder="NETWORK"
              aria-label="Key 2"
              autoComplete="off"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Encrypting…' : 'Encrypt message'}
          </button>
        </div>
      </form>

      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}

      {result && (
        <div className="result-grid">
          <div className="card result-card">
            <h3>Ciphertext</h3>
            <p className="ciphertext" data-testid="ciphertext">
              {result.ciphertext}
            </p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={handleCopy}>
                {copied ? 'Copied ✓' : 'Copy ciphertext'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onGoToSimulator}>
                Open in visual simulator →
              </button>
            </div>
          </div>

          <div className="card result-card">
            <h3>What just happened</h3>
            <dl className="facts">
              <div>
                <dt>Plaintext (normalized)</dt>
                <dd className="mono">{result.plaintext}</dd>
              </div>
              <div>
                <dt>Framed (header + message)</dt>
                <dd className="mono">
                  <span className="header-chip">{result.steps.framing.header}</span>
                  {result.plaintext}
                </dd>
              </div>
              <div>
                <dt>Matrix sizes</dt>
                <dd className="mono">
                  {result.meta.rows1}×{result.meta.cols1} → {result.meta.rows2}×{result.meta.cols2}
                </dd>
              </div>
              <div>
                <dt>Padding added</dt>
                <dd className="mono">
                  {result.meta.pad1 + result.meta.pad2} × &apos;X&apos; ({result.meta.pad1} after
                  matrix 1, {result.meta.pad2} after matrix 2)
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}
