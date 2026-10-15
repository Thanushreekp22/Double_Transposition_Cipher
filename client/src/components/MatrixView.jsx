/**
 * MatrixGrid + visualization helpers shared by the Simulator and Decrypt panels.
 * Columns are colour-coded by the position at which the key reads them, so the eye
 * can follow exactly how each column jumps in the ciphertext.
 */

export const COLUMN_COLORS = [
  'col-rank-0',
  'col-rank-1',
  'col-rank-2',
  'col-rank-3',
  'col-rank-4',
  'col-rank-5',
  'col-rank-6',
  'col-rank-7',
];

export function rankColor(rank) {
  return COLUMN_COLORS[(rank ?? 0) % COLUMN_COLORS.length];
}

/** Renders one matrix: first header row = key letters, second = 1-based column numbers. */
export function MatrixGrid({ grid, labels, readOrder, padCount = 0, title, caption }) {
  if (!grid || grid.length === 0) return null;
  const rows = grid.length;
  const cols = grid[0].length;
  // Position of each column in the read order -> colour + badge.
  const rankOf = new Array(cols).fill(null);
  (readOrder || []).forEach((col, position) => {
    rankOf[col] = position;
  });

  return (
    <figure className="matrix-wrap">
      {title && <figcaption className="matrix-title">{title}</figcaption>}
      <table className="matrix">
        <thead>
          <tr>
            <th className="matrix-corner">key</th>
            {labels.map((label, c) => (
              <th key={c} className={`matrix-key ${rankColor(rankOf[c])}`}>
                {label}
              </th>
            ))}
          </tr>
          <tr>
            <th className="matrix-corner">col</th>
            {labels.map((_, c) => (
              <th key={c} className="matrix-colnum">
                {c + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, r) => (
            <tr key={r}>
              <th className="matrix-rownum">{r + 1}</th>
              {row.map((ch, c) => {
                // Padding occupies the final `padCount` cells in row-major order.
                const isPad = padCount > 0 && r * cols + c >= rows * cols - padCount;
                const cls = ['matrix-cell'];
                if (rankOf[c] != null) cls.push(rankColor(rankOf[c]));
                if (isPad) cls.push('cell-pad');
                if (ch === ' ') cls.push('cell-space');
                return (
                  <td key={c} className={cls.join(' ')}>
                    {ch === ' ' ? '·' : ch}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && <figcaption className="matrix-caption">{caption}</figcaption>}
    </figure>
  );
}

/**
 * Renders the "column read order" strip, e.g. col 1 → col 5 → col 4 …
 * Each chip is coloured by the same rank colour used in the grids.
 */
export function ReadOrderStrip({ readOrder, labels }) {
  if (!readOrder || readOrder.length === 0) return null;
  return (
    <div className="read-order" aria-label="Column read order">
      {readOrder.map((col, position) => (
        <span key={col} className="read-step">
          <span className={`read-chip ${rankColor(position)}`}>
            <span className="read-pos">{position + 1}</span>
            col {col + 1}
            <span className="read-letter">{labels?.[col]}</span>
          </span>
          {position < readOrder.length - 1 && <span className="read-arrow">→</span>}
        </span>
      ))}
    </div>
  );
}

/**
 * Renders the concatenated column chunks that make up the output text.
 * Each chunk shows which matrix column it came from, colour-coded.
 */
export function ChunkStrip({ chunks, readOrder, labels, padCount = 0 }) {
  if (!chunks) return null;
  let remainingPad = padCount;
  return (
    <div className="chunk-strip">
      {chunks.map((chunk, position) => {
        const col = readOrder?.[position] ?? position;
        const isPadChunk = remainingPad >= chunk.length;
        remainingPad -= chunk.length;
        return (
          <span key={position} className="chunk-group">
            <span className={`chunk ${rankColor(position)} ${isPadChunk ? 'chunk-pad' : ''}`}>
              {chunk.split('').map((ch, i) => (
                <span key={i} className={ch === ' ' ? 'chunk-space' : undefined}>
                  {ch === ' ' ? '·' : ch}
                </span>
              ))}
            </span>
            <span className="chunk-label">
              col {col + 1}
              {labels?.[col] ? ` (${labels[col]})` : ''}
            </span>
          </span>
        );
      })}
    </div>
  );
}
