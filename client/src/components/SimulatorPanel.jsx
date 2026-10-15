import { MatrixGrid, ReadOrderStrip, ChunkStrip } from './MatrixView.jsx';

/**
 * SimulatorPanel — the visual encryption simulator.
 * Walks through the exact structures the API computed: framing, matrix 1, the first
 * column transposition, matrix 2, the second transposition, and the final ciphertext.
 */
export default function SimulatorPanel({ result, onGoToEncrypt }) {
  if (!result) {
    return (
      <section className="panel">
        <div className="panel-intro">
          <h2>2 · Visual Encryption Simulator</h2>
        </div>
        <div className="card empty-state">
          <p>
            No encryption has been run yet. Encrypt a message on the <strong>Encrypt</strong> tab
            and it will appear here, step by step.
          </p>
          <button type="button" className="btn btn-primary" onClick={onGoToEncrypt}>
            Go to Encrypt →
          </button>
        </div>
      </section>
    );
  }

  const { plaintext, ciphertext, steps, meta, keys } = result;
  const s1 = steps.first;
  const s2 = steps.second;

  return (
    <section className="panel">
      <div className="panel-intro">
        <h2>2 · Visual Encryption Simulator</h2>
        <p>
          Follow the message <strong>&ldquo;{plaintext}&rdquo;</strong> through both permutations.
          Columns are colour-coded: the colour of a column shows the position at which the key
          reads it out.
        </p>
      </div>

      {/* ---- Step 1: prepare the plaintext ---- */}
      <div className="card step-card">
        <div className="step-head">
          <span className="step-badge">Step 1</span>
          <h3>Prepare the plaintext</h3>
        </div>
        <p>
          The message is normalized (uppercased, punctuation removed) and a{' '}
          <strong>3-digit length header</strong> is added so the receiver knows exactly where the
          real message ends. The framed text is then written into matrix 1 row by row, left to
          right. The matrix has one column per character of <strong>key 1 ({keys.key1})</strong>.
        </p>
        <div className="text-line">
          <span className="text-line-label">Normalized</span>
          <span className="mono big">{plaintext}</span>
        </div>
        <div className="text-line">
          <span className="text-line-label">Framed</span>
          <span className="mono big">
            <span className="header-chip" title="length header">
              {steps.framing.header}
            </span>
            {plaintext.split('').map((ch, i) => (
              <span key={i}>{ch === ' ' ? <span className="char-space">·</span> : ch}</span>
            ))}
            {meta.pad1 > 0 && (
              <span className="pad-run" title="padding">
                {'X'.repeat(meta.pad1)}
              </span>
            )}
          </span>
        </div>
        <MatrixGrid
          grid={s1.grid}
          labels={s1.columnLabels}
          readOrder={s1.readOrder}
          padCount={s1.padCount}
          title={`Matrix 1 — ${s1.rows} rows × ${s1.cols} columns (key 1: ${keys.key1})`}
          caption="Written row by row. The number under each key letter is the order in which that column will be read out."
        />
      </div>

      {/* ---- Step 2: first transposition ---- */}
      <div className="card step-card">
        <div className="step-head">
          <span className="step-badge">Step 2</span>
          <h3>First transposition — read the columns of matrix 1</h3>
        </div>
        <p>
          Key 1 determines the column order: sort the key letters alphabetically and read the
          matching columns in that order (ties keep their left-to-right position).
        </p>
        <div className="text-line">
          <span className="text-line-label">Key 1 = {keys.key1}</span>
          <span className="mono small-note">
            alphabetical order of letters → read columns{' '}
            {s1.readOrder.map((c) => c + 1).join(', ')}
          </span>
        </div>
        <ReadOrderStrip readOrder={s1.readOrder} labels={s1.columnLabels} />
        <ChunkStrip chunks={s1.readChunks} readOrder={s1.readOrder} labels={s1.columnLabels} />
        <div className="text-line">
          <span className="text-line-label">Intermediate text</span>
          <span className="mono big cipher-run">{s1.output}</span>
        </div>
      </div>

      {/* ---- Step 3: second transposition ---- */}
      <div className="card step-card">
        <div className="step-head">
          <span className="step-badge">Step 3</span>
          <h3>Second transposition — matrix 2 with key 2</h3>
        </div>
        <p>
          The intermediate text is written row by row into matrix 2, which has one column per
          character of <strong>key 2 ({keys.key2})</strong>. If the last row is incomplete it is
          filled with the padding character <span className="pad-run">X</span>. The columns are
          then read out in key 2&apos;s order — this produces the final ciphertext.
        </p>
        <MatrixGrid
          grid={s2.grid}
          labels={s2.columnLabels}
          readOrder={s2.readOrder}
          padCount={s2.padCount}
          title={`Matrix 2 — ${s2.rows} rows × ${s2.cols} columns (key 2: ${keys.key2})`}
          caption={
            s2.padCount > 0
              ? `The ${s2.padCount} red X${s2.padCount > 1 ? 's' : ''} are padding added to complete the last row.`
              : 'The intermediate text exactly fills this matrix — no padding needed.'
          }
        />
        <ReadOrderStrip readOrder={s2.readOrder} labels={s2.columnLabels} />
        <ChunkStrip
          chunks={s2.readChunks}
          readOrder={s2.readOrder}
          labels={s2.columnLabels}
          padCount={s2.padCount}
        />
      </div>

      {/* ---- Step 4: ciphertext ---- */}
      <div className="card step-card step-final">
        <div className="step-head">
          <span className="step-badge">Step 4</span>
          <h3>Ciphertext</h3>
        </div>
        <p>
          The columns from step 3, concatenated in key 2&apos;s order, are the message Bob
          receives. Without both keys, this sequence is just a wall of characters.
        </p>
        <p className="ciphertext ciphertext-lg">{ciphertext}</p>
        <div className="stats-row">
          <span className="stat">
            <span className="stat-value">{meta.normalizedLength}</span>
            <span className="stat-label">plaintext chars</span>
          </span>
          <span className="stat">
            <span className="stat-value">
              {meta.rows1}×{meta.cols1}
            </span>
            <span className="stat-label">matrix 1</span>
          </span>
          <span className="stat">
            <span className="stat-value">
              {meta.rows2}×{meta.cols2}
            </span>
            <span className="stat-label">matrix 2</span>
          </span>
          <span className="stat">
            <span className="stat-value">{meta.ciphertextLength}</span>
            <span className="stat-label">ciphertext chars</span>
          </span>
        </div>
      </div>
    </section>
  );
}
