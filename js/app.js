// Main Chess Application Logic
// Manages game state, Stockfish engine, board interaction, and UI

class ChessApp {
  constructor() {
    this.game = null; // chess.js instance
    this.board = null; // Board renderer
    this.stockfishWorker = null;
    this.gemini = null;
    this.currentPlayer = null;
    this.playerColor = 'w'; // User plays white by default
    this.isThinking = false;
    this.moveHistory = [];
    this.selectedSquare = null;
    this.legalMoves = [];
    this.hints = false;
    this.autoCommentary = true;
    this.gameOver = false;
    this.capturedByWhite = [];
    this.capturedByBlack = [];
    
    this.init();
  }

  async init() {
    // Initialize Chess.js
    this.game = new Chess();
    
    // Initialize Gemini
    this.gemini = new GeminiLive();
    this.gemini.onStream = (chunk, full) => this.onAIStream(chunk, full);
    this.gemini.onComplete = (text) => this.onAIComplete(text);
    this.gemini.onError = (err) => this.onAIError(err);

    // Initialize board renderer
    this.board = new ChessBoard('chess-board', this);
    
    // Init Stockfish
    this.initStockfish();
    
    // Set default player
    this.selectPlayer('magnus');
    
    // Setup event listeners
    this.setupUI();
    
    // Check for stored API key
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      this.gemini.setApiKey(storedKey);
      document.getElementById('api-key-input').value = storedKey;
      this.showApiStatus(true);
    } else {
      setTimeout(() => this.showApiModal(), 800);
    }
  }

  initStockfish() {
    try {
      // Stockfish 18 WASM runs directly as a Web Worker — no wrapper needed
      this.stockfishWorker = new Worker('/js/stockfish-18-lite-single.js');
      this.stockfishReady = false;
      this.stockfishWorker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : '';
        if (line === 'uciok') {
          this.stockfishWorker.postMessage('isready');
          return;
        }
        if (line === 'readyok' && !this.stockfishReady) {
          this.stockfishReady = true;
          return;
        }
        this.handleStockfishMessage(line);
      };
      this.stockfishWorker.onerror = (e) => {
        console.warn('Stockfish worker error:', e);
      };
      // Start UCI handshake
      this.stockfishWorker.postMessage('uci');
    } catch(e) {
      console.warn('Stockfish worker failed:', e);
    }
  }

  sendToStockfish(cmd) {
    if (this.stockfishWorker) {
      this.stockfishWorker.postMessage(cmd);
    }
  }

  handleStockfishMessage(data) {
    if (typeof data !== 'string') return;

    if (data.startsWith('bestmove')) {
      const parts = data.split(' ');
      const bestMove = parts[1];
      if (bestMove && bestMove !== '(none)' && !this.gameOver) {
        this.makeAIMove(bestMove);
      } else if (bestMove === '(none)') {
        this.handleGameOver();
      }
    }

    // Hint arrow
    if (this.hints && data.includes('depth 15') && data.includes(' pv ')) {
      const pvMatch = data.match(/ pv ([a-h][1-8][a-h][1-8])/);
      if (pvMatch) {
        this.board.showHintArrow(pvMatch[1].substring(0,2), pvMatch[1].substring(2,4));
      }
    }
  }

  selectPlayer(playerId) {
    this.currentPlayer = PLAYERS[playerId];
    this.gemini.setPlayer(this.currentPlayer);
    this.updatePlayerUI();
    this.newGame();
  }

  updatePlayerUI() {
    const p = this.currentPlayer;
    document.getElementById('active-player-name').textContent = p.name;
    document.getElementById('active-player-title').textContent = p.title;
    document.getElementById('active-player-country').textContent = p.country;
    document.getElementById('active-player-elo').textContent = `${p.elo} ELO`;
    document.getElementById('active-player-style').textContent = p.style;
    document.getElementById('active-player-catchphrase').textContent = p.catchphrase;
    document.getElementById('active-player-bio').textContent = p.bio;
    document.getElementById('active-avatar').textContent = p.avatar;
    
    // Update accent color
    document.documentElement.style.setProperty('--player-color', p.color);
    
    // Highlight selected in dropdown
    document.querySelectorAll('.player-card').forEach(card => {
      card.classList.remove('active-player-card');
      if (card.dataset.playerId === p.id) {
        card.classList.add('active-player-card');
      }
    });

    // Clear AI chat
    this.clearAIChat();
    
    // Intro message
    setTimeout(() => {
      this.addAIMessage(`I am ${p.name}. ${p.catchphrase} Ready to play? Make your first move!`, false);
    }, 400);
  }

  newGame() {
    this.game.reset();
    this.moveHistory = [];
    this.selectedSquare = null;
    this.legalMoves = [];
    this.gameOver = false;
    this.capturedByWhite = [];
    this.capturedByBlack = [];
    this.board.render();
    this.board.clearArrows();
    this.updateMoveHistory();
    this.updateCaptured();
    this.updateStatus('Your move');
    this.updateMoveCounter();
    
    // Configure Stockfish for player
    const p = this.currentPlayer;
    this.sendToStockfish(`setoption name Skill Level value ${p.skillLevel}`);
    this.sendToStockfish(`setoption name UCI_LimitStrength value true`);
    this.sendToStockfish(`setoption name UCI_Elo value ${p.elo}`);
    document.getElementById('game-over-overlay').classList.add('hidden');
  }

  handleSquareClick(square) {
    if (this.gameOver || this.isThinking) return;
    if (this.game.turn() !== this.playerColor) return;

    const piece = this.game.get(square);

    if (this.selectedSquare) {
      // Try to move
      const moveMade = this.tryMove(this.selectedSquare, square);
      if (!moveMade) {
        // Select new square if own piece
        if (piece && piece.color === this.playerColor) {
          this.selectedSquare = square;
          this.legalMoves = this.game.moves({ square, verbose: true }).map(m => m.to);
          this.board.render();
          this.board.highlightSquares(square, this.legalMoves);
        } else {
          this.selectedSquare = null;
          this.legalMoves = [];
          this.board.render();
        }
      }
    } else {
      if (piece && piece.color === this.playerColor) {
        this.selectedSquare = square;
        this.legalMoves = this.game.moves({ square, verbose: true }).map(m => m.to);
        this.board.render();
        this.board.highlightSquares(square, this.legalMoves);
      }
    }
  }

  tryMove(from, to) {
    // Check for promotion
    const piece = this.game.get(from);
    let promotion = 'q';
    if (piece && piece.type === 'p') {
      if ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1')) {
        promotion = 'q'; // Auto-queen for simplicity
      }
    }

    const move = this.game.move({ from, to, promotion });
    if (!move) return false;

    this.onMoveMade(move);
    return true;
  }

  onMoveMade(move) {
    this.selectedSquare = null;
    this.legalMoves = [];
    this.moveHistory.push(move);
    
    // Track captured pieces
    if (move.captured) {
      if (move.color === 'w') {
        this.capturedByWhite.push(move.captured);
      } else {
        this.capturedByBlack.push(move.captured);
      }
    }
    
    this.board.render();
    this.board.highlightLastMove(move.from, move.to);
    this.board.clearArrows();
    this.updateMoveHistory();
    this.updateCaptured();
    this.updateMoveCounter();
    
    // Check game over
    if (this.checkGameOver()) return;
    
    // Update status
    this.updateStatus(`${this.currentPlayer.name} is thinking...`);
    
    // AI Commentary (async, non-blocking)
    if (this.autoCommentary && this.moveHistory.length <= 40) {
      const fanName = move.san;
      setTimeout(() => {
        this.gemini.getAutoCommentary(
          this.game.fen(),
          fanName,
          this.moveHistory.length,
          move.color
        );
      }, 300);
    }
    
    // Trigger Stockfish
    setTimeout(() => this.getAIMove(), 200);
  }

  makeAIMove(uciMove) {
    const from = uciMove.substring(0, 2);
    const to = uciMove.substring(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : 'q';
    
    const move = this.game.move({ from, to, promotion });
    if (!move) {
      this.isThinking = false;
      return;
    }
    
    this.isThinking = false;
    this.moveHistory.push(move);
    
    if (move.captured) {
      if (move.color === 'w') this.capturedByWhite.push(move.captured);
      else this.capturedByBlack.push(move.captured);
    }
    
    this.board.render();
    this.board.highlightLastMove(move.from, move.to);
    this.updateMoveHistory();
    this.updateCaptured();
    this.updateMoveCounter();
    
    if (this.checkGameOver()) return;
    
    this.updateStatus('Your move');
    
    // Request hint if enabled
    if (this.hints) {
      setTimeout(() => this.requestHint(), 500);
    }
  }

  getAIMove() {
    if (this.gameOver) return;
    this.isThinking = true;
    const fen = this.game.fen();
    const p = this.currentPlayer;
    
    this.sendToStockfish('stop');
    this.sendToStockfish(`position fen ${fen}`);
    this.sendToStockfish(`setoption name Skill Level value ${p.skillLevel}`);
    this.sendToStockfish(`go movetime ${p.moveTime}`);
  }

  requestHint() {
    if (this.gameOver || this.game.turn() !== this.playerColor) return;
    const fen = this.game.fen();
    this.sendToStockfish('stop');
    this.sendToStockfish(`position fen ${fen}`);
    this.sendToStockfish(`go depth 18`);
  }

  checkGameOver() {
    if (this.game.isCheckmate()) {
      const winner = this.game.turn() === 'w' ? this.currentPlayer.name : 'You';
      this.showGameOver(
        this.game.turn() === 'w' ? `${this.currentPlayer.name} Wins!` : '🎉 You Win!',
        this.game.turn() === 'w' ? `Checkmate! ${this.currentPlayer.name} delivered checkmate.` : `Brilliant! You checkmated ${this.currentPlayer.name}!`
      );
      this.gameOver = true;
      return true;
    }
    if (this.game.isDraw()) {
      let reason = 'Draw!';
      if (this.game.isStalemate()) reason = 'Stalemate';
      else if (this.game.isThreefoldRepetition()) reason = 'Threefold Repetition';
      else if (this.game.isInsufficientMaterial()) reason = 'Insufficient Material';
      this.showGameOver('Draw!', reason);
      this.gameOver = true;
      return true;
    }
    if (this.game.isCheck()) {
      this.updateStatus('Check!');
      this.board.flashCheck();
    }
    return false;
  }

  showGameOver(title, message) {
    document.getElementById('game-over-title').textContent = title;
    document.getElementById('game-over-message').textContent = message;
    document.getElementById('game-over-overlay').classList.remove('hidden');
    this.isThinking = false;
    this.updateStatus(title);
  }

  handleGameOver() {
    this.isThinking = false;
  }

  updateStatus(text) {
    document.getElementById('game-status').textContent = text;
  }

  updateMoveCounter() {
    const moveNum = Math.ceil(this.moveHistory.length / 2);
    document.getElementById('move-counter').textContent = `Move ${moveNum}`;
  }

  updateMoveHistory() {
    const container = document.getElementById('move-history');
    const moves = this.moveHistory;
    let html = '';
    
    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const white = moves[i] ? moves[i].san : '';
      const black = moves[i + 1] ? moves[i + 1].san : '';
      
      const isLastMove = i >= moves.length - 2;
      html += `
        <div class="move-row ${isLastMove ? 'last-move-row' : ''}">
          <span class="move-number">${moveNum}.</span>
          <span class="move-san ${moves[i] && i === moves.length - 1 ? 'current-move' : ''}">${white}</span>
          <span class="move-san ${black && i + 1 === moves.length - 1 ? 'current-move' : ''}">${black}</span>
        </div>`;
    }
    
    container.innerHTML = html || '<div class="text-gray-500 text-sm text-center py-4">No moves yet</div>';
    container.scrollTop = container.scrollHeight;
  }

  updateCaptured() {
    const PIECE_SYMBOLS = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };
    
    const white = this.capturedByWhite.map(p => PIECE_SYMBOLS[p] || p).join('');
    const black = this.capturedByBlack.map(p => PIECE_SYMBOLS[p] || p).join('');
    
    document.getElementById('captured-by-white').textContent = white || '—';
    document.getElementById('captured-by-black').textContent = black || '—';
  }

  // AI Chat methods
  addAIMessage(text, isUser = false) {
    const container = document.getElementById('ai-chat-messages');
    const div = document.createElement('div');
    div.className = isUser ? 'user-message' : 'ai-message';
    
    if (!isUser) {
      const avatar = document.createElement('div');
      avatar.className = 'ai-avatar';
      avatar.textContent = this.currentPlayer?.avatar || 'AI';
      div.appendChild(avatar);
    }
    
    const bubble = document.createElement('div');
    bubble.className = isUser ? 'user-bubble' : 'ai-bubble';
    bubble.textContent = text;
    div.appendChild(bubble);
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return bubble;
  }

  onAIStream(chunk, full) {
    let bubble = document.getElementById('current-ai-bubble');
    if (!bubble) {
      const container = document.getElementById('ai-chat-messages');
      const div = document.createElement('div');
      div.className = 'ai-message';
      
      const avatar = document.createElement('div');
      avatar.className = 'ai-avatar';
      avatar.textContent = this.currentPlayer?.avatar || 'AI';
      div.appendChild(avatar);
      
      bubble = document.createElement('div');
      bubble.className = 'ai-bubble streaming';
      bubble.id = 'current-ai-bubble';
      div.appendChild(bubble);
      container.appendChild(div);
    }
    bubble.textContent = full;
    document.getElementById('ai-chat-messages').scrollTop = 
      document.getElementById('ai-chat-messages').scrollHeight;
  }

  onAIComplete(text) {
    const bubble = document.getElementById('current-ai-bubble');
    if (bubble) {
      bubble.classList.remove('streaming');
      bubble.removeAttribute('id');
    }
  }

  onAIError(err) {
    const bubble = document.getElementById('current-ai-bubble');
    if (bubble) {
      bubble.removeAttribute('id');
      bubble.classList.remove('streaming');
    }
    this.addAIMessage(`⚠️ ${err}`, false);
  }

  clearAIChat() {
    document.getElementById('ai-chat-messages').innerHTML = '';
  }

  sendUserMessage() {
    const input = document.getElementById('ai-chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    this.addAIMessage(text, true);
    input.value = '';
    
    this.gemini.sendMessage(text, this.game.fen());
  }

  // API Key methods
  showApiModal() {
    document.getElementById('api-modal').classList.remove('hidden');
  }

  saveApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    if (!key) return;
    this.gemini.setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    document.getElementById('api-modal').classList.add('hidden');
    this.showApiStatus(true);
    this.addAIMessage('Gemini AI connected! I will now provide live commentary and coaching.', false);
  }

  showApiStatus(connected) {
    const indicator = document.getElementById('api-status');
    if (connected) {
      indicator.className = 'api-connected';
      indicator.title = 'Gemini AI Connected';
    } else {
      indicator.className = 'api-disconnected';
      indicator.title = 'Click to connect Gemini AI';
    }
  }

  toggleHints() {
    this.hints = !this.hints;
    const btn = document.getElementById('hints-btn');
    btn.textContent = this.hints ? '💡 Hints ON' : '💡 Hints OFF';
    btn.classList.toggle('btn-active', this.hints);
    if (this.hints && this.game.turn() === this.playerColor) {
      this.requestHint();
    } else {
      this.board.clearArrows();
    }
  }

  toggleCommentary() {
    this.autoCommentary = !this.autoCommentary;
    const btn = document.getElementById('commentary-btn');
    btn.textContent = this.autoCommentary ? '🎙️ Commentary ON' : '🎙️ Commentary OFF';
    btn.classList.toggle('btn-active', this.autoCommentary);
  }

  resign() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.isThinking = false;
    this.showGameOver(`${this.currentPlayer.name} Wins!`, 'You resigned. Better luck next time!');
    this.addAIMessage(`Good game! Don't worry - every loss is a lesson. Want to try again?`, false);
  }

  // Setup all UI event listeners
  setupUI() {
    // Player cards
    document.querySelectorAll('.player-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectPlayer(card.dataset.playerId);
        document.getElementById('player-dropdown').classList.add('hidden');
      });
    });

    // Player selector toggle
    document.getElementById('player-selector-btn').addEventListener('click', () => {
      document.getElementById('player-dropdown').classList.toggle('hidden');
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#player-selector-area')) {
        document.getElementById('player-dropdown').classList.add('hidden');
      }
    });

    // New game
    document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
    document.getElementById('game-over-new-game').addEventListener('click', () => this.newGame());

    // Resign
    document.getElementById('resign-btn').addEventListener('click', () => this.resign());

    // Hints
    document.getElementById('hints-btn').addEventListener('click', () => this.toggleHints());

    // Commentary
    document.getElementById('commentary-btn').addEventListener('click', () => this.toggleCommentary());

    // API Key
    document.getElementById('api-key-btn').addEventListener('click', () => this.showApiModal());
    document.getElementById('save-api-key').addEventListener('click', () => this.saveApiKey());
    document.getElementById('close-modal').addEventListener('click', () => {
      document.getElementById('api-modal').classList.add('hidden');
    });
    document.getElementById('api-key-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.saveApiKey();
    });

    // Chat input
    document.getElementById('ai-chat-send').addEventListener('click', () => this.sendUserMessage());
    document.getElementById('ai-chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendUserMessage();
    });

    // Flip board
    document.getElementById('flip-btn').addEventListener('click', () => {
      this.playerColor = this.playerColor === 'w' ? 'b' : 'w';
      this.board.flipped = !this.board.flipped;
      this.board.render();
      document.getElementById('flip-btn').textContent = this.board.flipped ? '🔄 White Side' : '🔄 Black Side';
    });

    // Color choice
    document.getElementById('play-white-btn').addEventListener('click', () => {
      this.playerColor = 'w';
      this.board.flipped = false;
      this.newGame();
    });
    document.getElementById('play-black-btn').addEventListener('click', () => {
      this.playerColor = 'b';
      this.board.flipped = true;
      this.newGame();
      // AI makes first move as white
      setTimeout(() => this.getAIMove(), 500);
    });

    // API status indicator click
    document.getElementById('api-status').addEventListener('click', () => this.showApiModal());
  }
}

// Wait for everything to load
window.addEventListener('DOMContentLoaded', () => {
  window.chessApp = new ChessApp();
});
