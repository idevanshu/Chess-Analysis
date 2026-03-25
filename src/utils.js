/**
 * Chess Piece SVG Definitions
 * Professional SVG pieces based on the Cburnett/Lichess design
 * Each piece uses unique gradient IDs to avoid DOM conflicts
 */

export const PIECE_SVG = {

  // ===================== WHITE KING =====================
  wK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <defs>
      <linearGradient id="wK_f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff"/>
        <stop offset="100%" stop-color="#e0ddd4"/>
      </linearGradient>
    </defs>
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/>
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="url(#wK_f)" stroke-linecap="butt" stroke-linejoin="miter"/>
      <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5s-5 1-5-4V9" fill="url(#wK_f)"/>
      <path d="M20 8h5" stroke-linejoin="miter"/>
      <path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 9.906 14 6.997 19.85 4.5 25.5 11.85 29.5 11.85 29.5" fill="url(#wK_f)"/>
      <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/>
    </g>
  </svg>`,

  // ===================== WHITE QUEEN =====================
  wQ: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <defs>
      <linearGradient id="wQ_f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff"/>
        <stop offset="100%" stop-color="#e0ddd4"/>
      </linearGradient>
    </defs>
    <g fill="url(#wQ_f)" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/>
      <path d="M24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/>
      <path d="M41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/>
      <path d="M16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/>
      <path d="M33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/>
      <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15L14 11v14L7 14l2 12z" stroke-linecap="butt"/>
      <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/>
      <path d="M11.5 30c3.5-1 18.5-1 22 0" fill="none"/>
      <path d="M12 33.5c6-1 15-1 21 0" fill="none"/>
    </g>
  </svg>`,

  // ===================== WHITE ROOK =====================
  wR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <defs>
      <linearGradient id="wR_f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff"/>
        <stop offset="100%" stop-color="#e0ddd4"/>
      </linearGradient>
    </defs>
    <g fill="url(#wR_f)" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 39h27v-3H9v3z" stroke-linecap="butt"/>
      <path d="M12 36v-4h21v4H12z" stroke-linecap="butt"/>
      <path d="M11 14V9h4v2h5V9h5v2h5V9h4v5" stroke-linecap="butt"/>
      <path d="M34 14l-3 3H14l-3-3"/>
      <path d="M15 17v12.5h15V17"/>
      <path d="M12 36v-4h21v4H12z" stroke-linecap="butt"/>
      <path d="M14 29.5v-13h17v13H14z" stroke-linecap="butt" stroke-linejoin="miter"/>
      <path d="M14 16.5L11 14h23l-3 2.5"/>
      <path d="M11 14V9h4v2h5V9h5v2h5V9h4v5" fill="url(#wR_f)"/>
      <path d="M12 35.5h21m-21-3h21" fill="none" stroke-linejoin="miter"/>
    </g>
  </svg>`,

  // ===================== WHITE BISHOP =====================
  wB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <defs>
      <linearGradient id="wB_f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff"/>
        <stop offset="100%" stop-color="#e0ddd4"/>
      </linearGradient>
    </defs>
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <g fill="url(#wB_f)" stroke-linecap="butt">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
        <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
      </g>
      <path d="M17.5 26h10M15 30h15" stroke-linejoin="miter"/>
      <path d="M22.5 15.5v-2M20 18h5" stroke="#000" stroke-linejoin="miter"/>
    </g>
  </svg>`,

  // ===================== WHITE KNIGHT =====================
  wN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <defs>
      <linearGradient id="wN_f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff"/>
        <stop offset="100%" stop-color="#e0ddd4"/>
      </linearGradient>
    </defs>
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="url(#wN_f)"/>
      <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="url(#wN_f)"/>
      <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#000"/>
      <path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#000"/>
    </g>
  </svg>`,

  // ===================== WHITE PAWN =====================
  wP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <defs>
      <linearGradient id="wP_f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff"/>
        <stop offset="100%" stop-color="#e0ddd4"/>
      </linearGradient>
    </defs>
    <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="url(#wP_f)" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  // ===================== BLACK KING =====================
  bK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <defs>
      <linearGradient id="bK_f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a4a4a"/>
        <stop offset="100%" stop-color="#1a1a1a"/>
      </linearGradient>
    </defs>
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22.5 11.63V6" stroke-linejoin="miter"/>
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="url(#bK_f)" stroke-linecap="butt" stroke-linejoin="miter"/>
      <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5s-5 1-5-4V9" fill="url(#bK_f)"/>
      <path d="M20 8h5" stroke-linejoin="miter"/>
      <path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 9.906 14 6.997 19.85 4.5 25.5 11.85 29.5 11.85 29.5" fill="url(#bK_f)"/>
      <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#fff" stroke-width="1"/>
    </g>
  </svg>`,

  // ===================== BLACK QUEEN =====================
  bQ: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <defs>
      <linearGradient id="bQ_f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a4a4a"/>
        <stop offset="100%" stop-color="#1a1a1a"/>
      </linearGradient>
    </defs>
    <g fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <g fill="url(#bQ_f)" stroke="none">
        <circle cx="6" cy="12" r="2.75"/>
        <circle cx="14" cy="9" r="2.75"/>
        <circle cx="22.5" cy="8" r="2.75"/>
        <circle cx="31" cy="9" r="2.75"/>
        <circle cx="39" cy="12" r="2.75"/>
      </g>
      <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" fill="url(#bQ_f)" stroke-linecap="butt"/>
      <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" fill="url(#bQ_f)" stroke-linecap="butt"/>
      <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke="#fff" stroke-width="1"/>
      <circle cx="6" cy="12" r="2.75" fill="url(#bQ_f)" stroke="url(#bQ_f)"/>
      <circle cx="14" cy="9" r="2.75" fill="url(#bQ_f)" stroke="url(#bQ_f)"/>
      <circle cx="22.5" cy="8" r="2.75" fill="url(#bQ_f)" stroke="url(#bQ_f)"/>
      <circle cx="31" cy="9" r="2.75" fill="url(#bQ_f)" stroke="url(#bQ_f)"/>
      <circle cx="39" cy="12" r="2.75" fill="url(#bQ_f)" stroke="url(#bQ_f)"/>
    </g>
  </svg>`,

  // ===================== BLACK ROOK =====================
  bR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <defs>
      <linearGradient id="bR_f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a4a4a"/>
        <stop offset="100%" stop-color="#1a1a1a"/>
      </linearGradient>
    </defs>
    <g fill="url(#bR_f)" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 39h27v-3H9v3z" stroke-linecap="butt"/>
      <path d="M12.5 32l1.5-2.5h17l1.5 2.5h-20z" stroke-linecap="butt"/>
      <path d="M12 36v-4h21v4H12z" stroke-linecap="butt"/>
      <path d="M14 29.5v-13h17v13H14z" stroke-linecap="butt" stroke-linejoin="miter"/>
      <path d="M14 16.5L11 14h23l-3 2.5"/>
      <path d="M11 14V9h4v2h5V9h5v2h5V9h4v5"/>
      <path d="M12 35.5h21m-21-3h21" fill="none" stroke="#fff" stroke-width="1" stroke-linejoin="miter"/>
    </g>
  </svg>`,

  // ===================== BLACK BISHOP =====================
  bB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <defs>
      <linearGradient id="bB_f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a4a4a"/>
        <stop offset="100%" stop-color="#1a1a1a"/>
      </linearGradient>
    </defs>
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <g fill="url(#bB_f)" stroke-linecap="butt">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
        <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
      </g>
      <path d="M17.5 26h10M15 30h15" stroke="#fff" stroke-linejoin="miter"/>
      <path d="M22.5 15.5v-2M20 18h5" stroke="#fff" stroke-linejoin="miter"/>
    </g>
  </svg>`,

  // ===================== BLACK KNIGHT =====================
  bN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <defs>
      <linearGradient id="bN_f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a4a4a"/>
        <stop offset="100%" stop-color="#1a1a1a"/>
      </linearGradient>
    </defs>
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="url(#bN_f)"/>
      <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="url(#bN_f)"/>
      <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#fff" stroke="#fff"/>
      <path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#fff" stroke="#fff"/>
    </g>
  </svg>`,

  // ===================== BLACK PAWN =====================
  bP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">
    <defs>
      <linearGradient id="bP_f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a4a4a"/>
        <stop offset="100%" stop-color="#1a1a1a"/>
      </linearGradient>
    </defs>
    <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="url(#bP_f)" stroke="#000" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
};

/**
 * Convert column and row indices to chess notation (e.g., "e4")
 * @param {number} col - Column index (0-7)
 * @param {number} row - Row index (0-7)
 * @param {boolean} flipped - Whether board is flipped
 * @returns {string} - Square name in algebraic notation
 */
export const getSquareName = (col, row, flipped) => {
    const files = 'abcdefgh';
    return flipped ? `${files[7 - col]}${row + 1}` : `${files[col]}${8 - row}`;
};

/**
 * Convert chess notation (e.g., "e4") to column and row indices
 * @param {string} sq - Square name in algebraic notation
 * @param {boolean} flipped - Whether board is flipped
 * @returns {object} - {col, row} indices
 */
export const getSquareCoords = (sq, flipped) => {
    if (!sq || typeof sq !== 'string' || sq.length < 2) return { col: 0, row: 0 };
    const files = 'abcdefgh';
    const c = files.indexOf(sq[0]);
    const r = 8 - parseInt(sq[1]);
    if (c === -1 || isNaN(r)) return { col: 0, row: 0 };
    return flipped ? {col: 7-c, row: 7-r} : {col: c, row: r};
};
