/**
 * Chess Board Renderer
 * Handles SVG piece rendering, click-to-move, and visual effects
 */

const PIECE_SVG = {
  // White pieces
  wK: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-5 1-5-4V9" fill="#fff"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" fill="#fff"/><path d="M20 8h5" stroke-linejoin="miter"/></g></svg>`,
  wQ: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm16.25 4.75a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-5 7.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-15 .75a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/><path d="M9 26c8.5-8.5 15.5-6 22.5.5l2.5-4.5" stroke-linejoin="miter"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0-1-1.5-2.5-2.5" stroke-linejoin="miter"/><path d="M11.5 30c3.5-1 18.5-1 22 0"/><path d="M12 33.5c4-1.5 17-1.5 21 0"/></g></svg>`,
  wR: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zm3.5-7l1.5-2.5h17l1.5 2.5h-20zm-.5 0v-4a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v4H12zM14 29.5v-13h17v13H14z"/><path d="M9 9h4v3H9zm7 0h4v3h-4zm7 0h4v3h-4zm7 0h4v3h-4z"/><path d="M9 12h27"/></g></svg>`,
  wB: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" fill="#fff"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" fill="#fff"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" fill="#fff"/><path d="M17.5 26h10m-12.5 4h15" stroke-linejoin="miter"/></g></svg>`,
  wN: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/><path d="M24 18c.38 5.12-1.2 8.5 3 11.5" fill="#fff"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 0 1 .866.5z" fill="#000" stroke="#000"/><path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 6.9 4.45h.05c.55 2.17.01 5.37-2.235 7.975-2.245 2.605-6.685 4.875-14.315 4.875" fill="#fff"/></g></svg>`,
  wP: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  
  // Black pieces
  bK: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-5 1-5-4V9" fill="#000"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" fill="#000"/><path d="M20 8h5" stroke-linejoin="miter"/></g></svg>`,
  bQ: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/><path d="M9 26c8.5-8.5 15.5-6 22.5.5l2.5-4.5" fill="none" stroke="#fff"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0-1-1.5-2.5-2.5"/><path d="M11.5 30c3.5-1 18.5-1 22 0"/><path d="M12 33.5c4-1.5 17-1.5 21 0"/></g></svg>`,
  bR: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zm3.5-7l1.5-2.5h17l1.5 2.5h-20zm-.5 0v-4a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v4H12zM14 29.5v-13h17v13H14z"/><path d="M9 9h4v3H9zm7 0h4v3h-4zm7 0h4v3h-4zm7 0h4v3h-4z"/><path d="M9 12h27"/></g></svg>`,
  bB: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" fill="#000"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" fill="#000"/><circle cx="22.5" cy="8" r="2.5" fill="#000"/><path d="M17.5 26h10m-12.5 4h15" stroke="#fff" stroke-linejoin="miter"/></g></svg>`,
  bN: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#000"/><path d="M24 18c.38 5.12-1.2 8.5 3 11.5" fill="#000"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 0 1 .866.5z" fill="#fff" stroke="#fff"/></g></svg>`,
  bP: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
};

/**
 * ChessBoard class - renders and manages the chess board UI
 * @param {string} containerId - DOM element ID for the board container
 * @param {ChessApp} app - Reference to the main application instance
 */
class ChessBoard {
  constructor(containerId, app) {
    this.container = document.getElementById(containerId);
    this.app = app;
    this.flipped = false;
    this.lastMoveFrom = null;
    this.lastMoveTo = null;
    this.arrows = [];
    this.hintArrow = null;
    this.squareSize = 0;
    
    this.createBoard();
    this.render();
    
    // Responsive resize
    window.addEventListener('resize', () => this.onResize());
  }

  createBoard() {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    
    // Board grid
    this.grid = document.createElement('div');
    this.grid.style.display = 'grid';
    this.grid.style.gridTemplateColumns = 'repeat(8, 1fr)';
    this.grid.style.gridTemplateRows = 'repeat(8, 1fr)';
    this.grid.style.width = '100%';
    this.grid.style.height = '100%';
    this.grid.style.userSelect = 'none';
    this.container.appendChild(this.grid);

    // SVG overlay for arrows
    this.svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgOverlay.style.position = 'absolute';
    this.svgOverlay.style.top = '0';
    this.svgOverlay.style.left = '0';
    this.svgOverlay.style.width = '100%';
    this.svgOverlay.style.height = '100%';
    this.svgOverlay.style.pointerEvents = 'none';
    this.svgOverlay.setAttribute('viewBox', '0 0 8 8');
    
    // Arrow marker
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="arrowhead" markerWidth="3" markerHeight="4" refX="2" refY="2" orient="auto">
        <polygon points="0 0, 3 2, 0 4" fill="rgba(255,215,0,0.85)"/>
      </marker>
      <marker id="arrowhead-hint" markerWidth="3" markerHeight="4" refX="2" refY="2" orient="auto">
        <polygon points="0 0, 3 2, 0 4" fill="rgba(100,255,100,0.85)"/>
      </marker>
    `;
    this.svgOverlay.appendChild(defs);
    this.container.appendChild(this.svgOverlay);
  }

  getSquareName(file, rank) {
    const files = 'abcdefgh';
    if (this.flipped) {
      return files[7 - file] + (rank + 1);
    }
    return files[file] + (8 - rank);
  }

  getSquareCoords(square) {
    const files = 'abcdefgh';
    const file = files.indexOf(square[0]);
    const rank = 8 - parseInt(square[1]);
    
    if (this.flipped) {
      return { col: 7 - file, row: 7 - rank };
    }
    return { col: file, row: rank };
  }

  render() {
    this.grid.innerHTML = '';
    const board = this.app.game.board();
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = this.getSquareName(col, row);
        const isLight = (row + col) % 2 === 0;
        const piece = this.app.game.get(square);
        
        const cell = document.createElement('div');
        cell.className = 'chess-cell';
        cell.dataset.square = square;
        
        // Base color
        let bg = isLight ? '#f0d9b5' : '#b58863';
        
        // Highlight last move
        if (square === this.lastMoveFrom || square === this.lastMoveTo) {
          bg = isLight ? '#cdd16e' : '#aaa23a';
        }
        
        // Selected square
        if (square === this.app.selectedSquare) {
          bg = '#f6f669';
        }
        
        cell.style.background = bg;
        cell.style.position = 'relative';
        cell.style.cursor = 'pointer';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        
        // Legal move dots
        if (this.app.legalMoves.includes(square)) {
          const dot = document.createElement('div');
          if (piece) {
            // Capture highlight ring
            dot.style.position = 'absolute';
            dot.style.inset = '0';
            dot.style.borderRadius = '0';
            dot.style.border = '4px solid rgba(0,150,0,0.5)';
            dot.style.boxSizing = 'border-box';
          } else {
            dot.style.width = '30%';
            dot.style.height = '30%';
            dot.style.borderRadius = '50%';
            dot.style.background = 'rgba(0, 150, 0, 0.45)';
          }
          dot.style.pointerEvents = 'none';
          cell.appendChild(dot);
        }
        
        // Piece
        if (piece) {
          const pieceKey = piece.color + piece.type.toUpperCase();
          const img = document.createElement('div');
          img.className = 'chess-piece';
          img.innerHTML = PIECE_SVG[pieceKey] || '';
          img.style.width = '85%';
          img.style.height = '85%';
          img.style.transition = 'transform 0.1s';
          img.style.zIndex = '2';
          cell.appendChild(img);
        }
        
        // Rank/file labels
        if (col === 0) {
          const rankLabel = document.createElement('span');
          rankLabel.style.cssText = `position:absolute;top:2px;left:3px;font-size:10px;font-weight:700;color:${isLight ? '#b58863' : '#f0d9b5'};pointer-events:none;z-index:3;`;
          rankLabel.textContent = this.flipped ? row + 1 : 8 - row;
          cell.appendChild(rankLabel);
        }
        if (row === 7) {
          const fileLabel = document.createElement('span');
          const files = 'abcdefgh';
          fileLabel.style.cssText = `position:absolute;bottom:2px;right:3px;font-size:10px;font-weight:700;color:${isLight ? '#b58863' : '#f0d9b5'};pointer-events:none;z-index:3;`;
          fileLabel.textContent = this.flipped ? files[7 - col] : files[col];
          cell.appendChild(fileLabel);
        }
        
        cell.addEventListener('click', () => this.app.handleSquareClick(square));
        
        this.grid.appendChild(cell);
      }
    }
  }

  highlightSquares(selected, moves) {
    // Already rendered in render()
  }

  highlightLastMove(from, to) {
    this.lastMoveFrom = from;
    this.lastMoveTo = to;
    this.render();
  }

  flashCheck() {
    const king = this.findKingSquare(this.app.game.turn());
    if (!king) return;
    const { col, row } = this.getSquareCoords(king);
    const cells = this.grid.children;
    const idx = row * 8 + col;
    if (cells[idx]) {
      cells[idx].style.background = '#ff4444';
      setTimeout(() => {
        cells[idx].style.background = (row + col) % 2 === 0 ? '#f0d9b5' : '#b58863';
      }, 800);
    }
  }

  findKingSquare(color) {
    const board = this.app.game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === color) {
          const files = 'abcdefgh';
          return files[c] + (8 - r);
        }
      }
    }
    return null;
  }

  showHintArrow(from, to) {
    this.clearArrows();
    const fromC = this.getSquareCoords(from);
    const toC = this.getSquareCoords(to);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromC.col + 0.5);
    line.setAttribute('y1', fromC.row + 0.5);
    line.setAttribute('x2', toC.col + 0.5);
    line.setAttribute('y2', toC.row + 0.5);
    line.setAttribute('stroke', 'rgba(100,255,100,0.85)');
    line.setAttribute('stroke-width', '0.15');
    line.setAttribute('marker-end', 'url(#arrowhead-hint)');
    
    this.hintArrow = line;
    this.svgOverlay.appendChild(line);
  }

  clearArrows() {
    if (this.hintArrow && this.svgOverlay.contains(this.hintArrow)) {
      this.svgOverlay.removeChild(this.hintArrow);
    }
    this.hintArrow = null;
  }

  onResize() {
    this.render();
  }
}

window.ChessBoard = ChessBoard;
