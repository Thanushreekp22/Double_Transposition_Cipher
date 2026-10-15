import { useState } from 'react';
import { decryptRequest, copyText } from '../api.js';
import { MatrixGrid, ReadOrderStrip } from './MatrixView.jsx';

/**
 * DecryptPanel — Bob's side.
 * Paste the ciphertext, enter both keys in the correct order, and watch the two
 * transpositions being reversed.
 */
export default function DecryptPanel({ defaultEncryption }) {
  const [ciphertext, setCiphertext] = useState('');
  const [key1, setKey1] = useState('CIPHER');
  const [key2, setKey2] = useState('NETWORK');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function loadDemo() {
    if (defaultEncryption) {
      setCiphertext(defaultEncryption.ciphertext);
      setKey1(defaultEncryption.keys.key1);
      setKey2(defaultEncryption.keys.key2);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await decryptRequest({ ciphertext, key1, key2 });
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyPlaintext() {
    if (!result?.plaintext) return;
    const ok = await copyText(result.plaintext);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1800);
  }

  const sRev2 = result?.steps?.secondReverse;
  const sRev1 = result?.steps?.firstReverse;

  return (
    <section className="panel">
      <div className="panel-intro">
        <h2>3 · Message Decryption</h2>
        <p>
          Bob received the ciphertext. He writes it row by row into matrix 2, puts the columns
          back in their original positions using <strong>key 2</strong>, reads the rows to recover
          the intermediate text, then repeats the process with <strong>key 1</strong>. The keys
          must be entered in the same order Alice used.
        </p>
      </div>

      <form className="encrypt-form card" onSubmit={handleSubmit}>
        <label className="field field-message">
          <span className="field-label">Ciphertext</span>
          <textarea
            value={ciphertext}
            onChange={(e) => setCiphertext(e.target.value)}
            rows={3}
            placeholder="Paste the ciphertext here…"
            aria-label="Ciphertext"
            className="mono"
          />
          <span className="field-help">
            Spaces are part of the ciphertext — copy it exactly as it appears.
          </span>
        </label>

        <div className="key-row">
          <label className="field">
            <span className="field-label">Key 1 (first matrix)</span>
            <input
              value={key1}
              onChange={(e) => setKey1(e.target.value)}
              aria-label="Key 1"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span className="field-label">Key 2 (second matrix)</span>
            <input
              value={key2}
              onChange={(e) => setKey2(e.target.value)}
              aria-label="Key 2"
              autoComplete="off"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Decrypting…' : 'Decrypt message'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadDemo}
            disabled={!defaultEncryption}
          >
            Use last ciphertext
          </button>
        </div>
      </form>

      {error && (
        <div className="banner banner-error" role="alert">
          <strong>Decryption failed.</strong> {error}
        </div>
      )}

      {result && (
        <>
          <div className={`banner ${result.valid ? 'banner-success' : 'banner-warn'}`} role="status">
            {result.valid ? (
              <>
                <strong>✓ Keys accepted.</strong> The length header ({result.headerCandidate}) and
                the padding check both passed — this is the original message.
              </>
            ) : (
              <>
                <strong>✗ Wrong keys.</strong> {result.warning}
              </>
            )}
          </div>

          <div className="card result-card">
            <h3>Recovered plaintext</h3>
            <p className={`plaintext-out ${result.valid ? '' : 'plaintext-wrong'}`}>
              {result.valid ? result.plaintext : result.steps.firstReverse.plaintext || '—'}
            </p>
            {result.valid && (
              <div className="btn-row">
                <button type="button" className="btn" onClick={handleCopyPlaintext}>
                  {copied ? 'Copied ✓' : 'Copy plaintext'}
                </button>
              </div>
            )}
            <dl className="facts facts-inline">
              <div>
                <dt>Length header</dt>
                <dd className={`mono ${result.headerValid ? 'flag-ok' : 'flag-bad'}`}>
                  {result.headerCandidate} {result.headerValid ? '✓' : '✗'}
                </dd>
              </div>
              <div>
                <dt>Padding check</dt>
                <dd className={`mono ${result.paddingValid ? 'flag-ok' : 'flag-bad'}`}>
                  {result.paddingValid ? '✓ all X padding in place' : '✗ padding mismatch'}
                </dd>
              </div>
              <div>
                <dt>Recovered length</dt>
                <dd className="mono">{result.recoveredLength ?? '—'}</dd>
              </div>
            </dl>
          </div>

          {/* ---- Reverse of step 3 ---- */}
          <div className="card step-card">
            <div className="step-head">
              <span className="step-badge">Reverse of step 3</span>
              <h3>Rebuild matrix 2 from the ciphertext</h3>
            </div>
            <p>
              The ciphertext is broken into chunks of {sRev2.rows} characters (one per column) and
              each chunk is placed back into its column according to key 2 ({sRev2.key}). Reading
              the rows then recovers the intermediate text.
            </p>
            <MatrixGrid
              grid={sRev2.grid}
              labels={sRev2.columnLabels}
              readOrder={sRev2.readOrder}
              padCount={sRev2.padCount}
              title={`Matrix 2 rebuilt — ${sRev2.rows} × ${sRev2.cols} (key 2: ${sRev2.key})`}
            />
            <ReadOrderStrip readOrder={sRev2.readOrder} labels={sRev2.columnLabels} />
            <div className="text-line">
              <span className="text-line-label">Intermediate (with padding)</span>
              <span className="mono big cipher-run">{sRev2.intermediateFull}</span>
            </div>
          </div>

          {/* ---- Reverse of step 2 ---- */}
          <div className="card step-card">
            <div className="step-head">
              <span className="step-badge">Reverse of step 2</span>
              <h3>Rebuild matrix 1 and read the rows</h3>
            </div>
            <p>
              The intermediate text is split into columns of {sRev1.rows} characters, placed back
              according to key 1 ({sRev1.key}), and the rows are read left to right. The first
              three characters are the length header; everything after it is the plaintext.
            </p>
            {sRev1.grid && (
              <MatrixGrid
                grid={sRev1.grid}
                labels={sRev1.columnLabels}
                readOrder={sRev1.readOrder}
                title={`Matrix 1 rebuilt — ${sRev1.rows} × ${sRev1.cols} (key 1: ${sRev1.key})`}
              />
            )}
            <ReadOrderStrip readOrder={sRev1.readOrder} labels={sRev1.columnLabels} />
            <div className="text-line">
              <span className="text-line-label">Row-wise read</span>
              <span className="mono big">
                <span className="header-chip">{sRev1.header}</span>
                {(sRev1.framed || '')
                  .slice(3)
                  .split('')
                  .map((ch, i) => (
                    <span
                      key={i}
                      className={ch === 'X' ? 'pad-run' : ch === ' ' ? 'char-space' : undefined}
                    >
                      {ch === ' ' ? '·' : ch}
                    </span>
                  ))}
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
