import { useCallback, useEffect, useRef, useState } from 'react';
import { encryptRequest } from './api.js';
import EncryptPanel from './components/EncryptPanel.jsx';
import SimulatorPanel from './components/SimulatorPanel.jsx';
import DecryptPanel from './components/DecryptPanel.jsx';

const TABS = [
  { id: 'encrypt', label: 'Encrypt', hint: 'Alice: encrypt a message' },
  { id: 'simulator', label: 'Visual Simulator', hint: 'Step-by-step matrices' },
  { id: 'decrypt', label: 'Decrypt', hint: 'Bob: recover the message' },
];

// The evaluation example — pre-filled everywhere so the demo starts instantly.
export const DEMO_INPUT = { message: 'MEET ME AT 5 PM', key1: 'CIPHER', key2: 'NETWORK' };

export default function App() {
  const [tab, setTab] = useState('encrypt');
  // Result of the most recent encryption — shared with the Simulator tab.
  const [lastEncryption, setLastEncryption] = useState(null);
  const [backendError, setBackendError] = useState(null);
  const bootstrapped = useRef(false);

  const handleEncrypted = useCallback((result) => {
    setLastEncryption(result);
    setBackendError(null);
  }, []);

  // Auto-run the demo encryption once on start-up so every tab has data immediately.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    encryptRequest(DEMO_INPUT)
      .then(setLastEncryption)
      .catch((err) => setBackendError(err.message));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-lock" aria-hidden="true">
            ✦
          </span>
          <div>
            <h1>Double Transposition Cipher</h1>
            <p className="tagline">
              Classical cryptography demo — encryption, decryption &amp; confidentiality
            </p>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
              title={t.hint}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {backendError && (
        <div className="banner banner-error" role="alert">
          <strong>Backend unreachable.</strong> {backendError}
        </div>
      )}

      <main className="app-main">
        {tab === 'encrypt' && (
          <EncryptPanel
            result={lastEncryption}
            onEncrypted={handleEncrypted}
            onGoToSimulator={() => setTab('simulator')}
          />
        )}
        {tab === 'simulator' && <SimulatorPanel result={lastEncryption} onGoToEncrypt={() => setTab('encrypt')} />}
        {tab === 'decrypt' && <DecryptPanel defaultEncryption={lastEncryption} />}
      </main>

      <footer className="app-footer">
        <p>
          <strong>Educational use only.</strong> Double transposition is a classical cipher from the
          era of pen-and-paper cryptography. It demonstrates confidentiality through a secret
          permutation, but it provides no authentication or integrity and is trivially breakable by
          modern standards. Real applications must use authenticated encryption such as AES-GCM.
        </p>
      </footer>
    </div>
  );
}
