import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChessBoard from './ChessBoard';
import { useChessLogic } from './useChessLogic';
import { useGemini } from './useGemini';
import { useMultiplayer } from './useMultiplayer';
import { PLAYERS, PLAYER_ORDER } from './players';
import { useAuth } from './context/AuthContext';
import AuthPage from './AuthPage';
import Dashboard from './DashboardNew';
import GameMode from './GameMode';
import { ChevronDown, Settings, MessageSquare, Plus, BarChart3, LogOut, Copy, Check } from 'lucide-react';

function GameView() {
  console.log('GameView rendering...');
  const { user, logout, token } = useAuth();
  const [showDashboard, setShowDashboard] = useState(false);
  const [showGameMode, setShowGameMode] = useState(true);
  const [gameMode, setGameMode] = useState(null); // 'ai', 'multiplayer_host', 'multiplayer_guest'
  const [multiplayerRoomCode, setMultiplayerRoomCode] = useState(null);
  const [multiplayerOpponent, setMultiplayerOpponent] = useState(null);
  const [colorCopied, setColorCopied] = useState(false);
  const [activePlayerId, setActivePlayerId] = useState(PLAYER_ORDER[0]);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [commentaryEnabled, setCommentaryEnabled] = useState(true);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [autoJoinRoomCode, setAutoJoinRoomCode] = useState(null);
  
  const currentPlayer = PLAYERS[activePlayerId];
  
  // Check for auto-join URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('roomCode');
    if (roomCode) {
      setAutoJoinRoomCode(roomCode);
    }
  }, []);
  const {
    game, fen, moveHistory, gameOver, gameResult, captured, isAiThinking,
    playerColor, setPlayerColor, handleSquareClick, resetGame, hintArrow, resign, forceGameOver, makeExternalMove
  } = useChessLogic(currentPlayer, hintsEnabled, gameMode);

  // Get Gemini commentary only for AI mode
  const {
    messages, isStreaming, isConnected,
    sendMessageStream, getAutoCommentary, announceMatch, commentOnGameOver
  } = useGemini(currentPlayer);

  // Setup multiplayer socket connection
  const handleOpponentMove = useCallback((data) => {
    console.log('Opponent move:', data);
    if (data.san) {
      makeExternalMove(data.san);
    }
  }, [makeExternalMove]);

  const handleGameEnded = useCallback((data) => {
    console.log('Game ended:', data);
    if (data.result === 'opponent_resigned') {
      forceGameOver('Opponent Resigned. You Win!');
    } else if (data.reason === 'checkmate') {
      // Server detected checkmate — chess.js locally will also catch it
    } else if (data.reason === 'draw') {
      forceGameOver('Draw!');
    }
  }, [forceGameOver]);

  // Sync handler for late joins / reconnects
  const handleGameSync = useCallback((data) => {
    console.log('Game sync received:', data);
    // Board sync is handled by chess.js replaying moves — for now just log
  }, []);

  const { sendMove, resign: multiplayerResign, connected: mpConnected, opponentOnline } = useMultiplayer(
    multiplayerRoomCode,
    user?.id,
    token,
    handleOpponentMove,
    handleGameEnded,
    handleGameSync
  );

  // Send move in multiplayer if we just played
  useEffect(() => {
    const lastMove = moveHistory[moveHistory.length - 1];
    if (lastMove && gameMode && gameMode.includes('multiplayer')) {
      if (lastMove.color === playerColor) {
        sendMove(lastMove.san, fen, lastMove.san);
      }
    }
  }, [moveHistory.length, gameMode, playerColor, sendMove, fen]);

  const chatEndRef = useRef(null);
  const gameSavedRef = useRef(false);
  
  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Helper function to classify moves and assign accuracy
  const classifyMove = (move, moveIndex) => {
    // Classify based on move properties
    let moveType = 'strategic';
    let accuracy = 75 + Math.random() * 20; // 75-95 by default

    if (move.captured) {
      // Captured a piece - tactical
      moveType = 'tactical';
      accuracy = 80 + Math.random() * 20; // 80-100 for tactical
    } else if (move.san.includes('+')) {
      // Check - attacking move
      moveType = 'tactical';
      accuracy = 85 + Math.random() * 15;
    } else if (move.san.includes('#')) {
      // Checkmate - best move
      moveType = 'best';
      accuracy = 100;
    } else {
      // Regular move - strategic
      // Add some variance based on move number
      const baseAccuracy = 70 + (moveIndex * 0.5); // Accuracy slightly improves with move count
      accuracy = Math.min(95, baseAccuracy + Math.random() * 15);
    }

    // Randomly classify some moves as blunders (low accuracy)
    if (Math.random() < 0.05) { // 5% chance of blunder
      moveType = 'blunder';
      accuracy = Math.round(Math.random() * 30); // 0-30% accuracy for blunders
    }

    return {
      moveType,
      accuracy: Math.round(accuracy)
    };
  };

  // Reset save flag when game ends/resets
  useEffect(() => {
    if (!gameOver) {
      gameSavedRef.current = false;
    }
  }, [gameOver]);

  // Save game when finished
  useEffect(() => {
    if (gameOver && token && !gameSavedRef.current) {
      gameSavedRef.current = true;
      console.log('Game Over Effect triggered - saving game');
      console.log('Game Mode:', gameMode);
      console.log('Result:', gameResult);
      console.log('Move History Length:', moveHistory.length);
      
      const movesFormatted = moveHistory.map((m, i) => {
        const classification = classifyMove(m, i);
        return {
          moveNumber: i + 1,
          san: m.san,
          fen: m.after || game.fen(),
          color: m.color,
          moveType: classification.moveType,
          accuracy: classification.accuracy
        };
      });
      
      console.log('Formatted Moves:', movesFormatted);
      
      let resultStr = 'draw';
      console.log('Game Result String:', gameResult);
      
      // Detect win/loss more robustly
      if (gameResult) {
        if (gameResult.includes('Wins')) {
          // "White Wins", "Black Wins", etc.
          const whiteWins = gameResult.includes('White');
          const playerIsWhite = playerColor === 'w';
          resultStr = (whiteWins === playerIsWhite) ? 'win' : 'loss';
          console.log('Win/Loss game detected:', { whiteWins, playerIsWhite, resultStr });
        } else if (gameResult.includes('Draw') || gameResult.includes('draw')) {
          resultStr = 'draw';
          console.log('Draw detected');
        } else if (gameResult.includes('Resignation') || gameResult.includes('resignation')) {
          // Player resigned - it's a loss
          resultStr = 'loss';
          console.log('Resignation detected - marking as loss');
        } else if (gameResult.includes('Checkmate')) {
          // Checkmate - need to determine winner
          resultStr = 'win'; // Assume it's a win (dominated the game)
          console.log('Checkmate detected - marking as win');
        }
      }
      console.log('Final game result determined:', resultStr);

      const gameData = {
        opponent: gameMode === 'ai' ? currentPlayer.name : (multiplayerOpponent?.name || 'Local Player'),
        opponentElo: gameMode === 'ai' ? currentPlayer.elo : 1200,
        playerColor: playerColor,
        result: resultStr,
        moves: movesFormatted,
        duration: 300,
        openingName: 'Standard Opening'
      };

      console.log('Saving game with data:', gameData);
      console.log('Token present:', !!token);
      console.log('Moves formatted length:', movesFormatted.length);

      fetch('/api/games/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gameData)
      })
        .then(res => {
          console.log('Game save response status:', res.status);
          if (!res.ok) {
            throw new Error(`Server responded with ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('Game saved successfully:', data);
          if (data.userStats) {
            console.log('Updated user stats:', data.userStats);
          }
        })
        .catch(err => {
          console.error('Game save error:', err);
        });
    }
  }, [gameOver, gameResult, token]);

  const handlePlayAI = () => {
    setGameMode('ai');
    setShowGameMode(false);
    setMultiplayerRoomCode(null);
  };

  const handleLocalStart = () => {
    setGameMode('local');
    setShowGameMode(false);
    setMultiplayerRoomCode(null);
    setPlayerColor('w');
  };

  const handleMultiplayerStart = (mode, roomCode, data = null) => {
    setMultiplayerRoomCode(roomCode);
    if (mode === 'host') {
      setGameMode('multiplayer_host');
      setPlayerColor('w');
    } else {
      setGameMode('multiplayer_guest');
      setMultiplayerOpponent(data?.host);
      setPlayerColor(data?.guestColor === 'w' || data?.guestColor === 'white' ? 'w' : 'b');
    }
    setShowGameMode(false);
  };

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(multiplayerRoomCode);
    setColorCopied(true);
    setTimeout(() => setColorCopied(false), 2000);
  };

  // Announce the match when AI game starts or resets
  const matchAnnouncedRef = useRef(false);
  useEffect(() => {
    if (gameMode === 'ai' && commentaryEnabled && moveHistory.length === 0 && !gameOver) {
      // Small delay so the messages state clears first from useGemini's own reset
      const timer = setTimeout(() => {
        const colorLabel = playerColor === 'w' ? 'White' : 'Black';
        announceMatch(currentPlayer.name, currentPlayer.elo, colorLabel, fen);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [gameMode, commentaryEnabled, moveHistory.length === 0, currentPlayer?.id]);

  // Commentary on game over
  const gameOverCommentedRef = useRef(false);
  useEffect(() => {
    if (!gameOver) {
      gameOverCommentedRef.current = false;
      return;
    }
    if (gameMode === 'ai' && gameOver && gameResult && commentaryEnabled && !gameOverCommentedRef.current) {
      gameOverCommentedRef.current = true;
      commentOnGameOver(gameResult, fen, moveHistory.length);
    }
  }, [gameOver, gameResult, gameMode]);

  // Trigger auto commentary on every move for AI games
  useEffect(() => {
    if (gameMode !== 'ai' || moveHistory.length === 0 || !commentaryEnabled || gameOver) return;

    const lastMove = moveHistory[moveHistory.length - 1];
    const moveNum = moveHistory.length;

    // Build rich context for the commentator
    let context = '';
    const who = lastMove.color === playerColor ? 'The player' : currentPlayer.name;

    if (lastMove.captured) {
      const pieceNames = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
      context += `${who} captured a ${pieceNames[lastMove.captured] || lastMove.captured} on ${lastMove.to}. `;
    }
    if (lastMove.san.includes('#')) {
      context += 'CHECKMATE! ';
    } else if (lastMove.san.includes('+')) {
      context += 'Check! ';
    }
    if (lastMove.san === 'O-O' || lastMove.san === 'O-O-O') {
      context += `${who} just castled. `;
    }
    if (lastMove.promotion) {
      context += `PAWN PROMOTION to ${lastMove.promotion}! `;
    }

    // Always comment on captures, checks, promotions, castling
    // For regular moves, comment ~50% of the time to keep it lively but not overwhelming
    const isExciting = lastMove.captured || lastMove.san.includes('+') || lastMove.san.includes('#') || lastMove.promotion || lastMove.san === 'O-O' || lastMove.san === 'O-O-O';
    const shouldComment = isExciting || Math.random() < 0.5;

    if (shouldComment) {
      getAutoCommentary(fen, moveNum, lastMove.san, context);
    }
  }, [moveHistory.length, gameMode]);

  const onSquareClick = useCallback((sq, currentSelected) => {
    const result = handleSquareClick(sq, currentSelected);
    if (result !== undefined) {
      setSelectedSquare(result);
    }
  }, [handleSquareClick]);

  const handlePlayerSelect = (id) => {
    setActivePlayerId(id);
    setShowPlayerDropdown(false);
    if (gameMode === 'ai') {
      resetGame();
    }
  };

  const submitChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isStreaming) return;
    sendMessageStream(chatInput, fen);
    setChatInput('');
  };

  // Convert moved square names for last move highlight
  const lastMoveObj = moveHistory[moveHistory.length - 1];

  return (
    <div style={{ '--player-color': currentPlayer.color }} className="flex flex-col min-h-screen">
      {/* HEADER */}
      <header className="relative z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl h-14 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center font-bold text-sm">♟</div>
            <span className="font-display font-bold text-lg bg-gradient-to-br from-cyan-400 to-violet-600 text-transparent bg-clip-text hidden sm:block">Chess Legends</span>
          </div>

          {gameMode && gameMode.includes('multiplayer') && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs">
              <span className="text-white/60">Room:</span>
              <span className="font-mono font-bold text-cyan-400">{multiplayerRoomCode}</span>
              <button
                onClick={copyRoomCode}
                className="ml-1 p-0.5 hover:bg-white/10 rounded text-white/60 hover:text-white transition"
              >
                {colorCopied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}

          <div className="relative">
            {gameMode === 'ai' && (
              <button 
                onClick={() => setShowPlayerDropdown(!showPlayerDropdown)}
                className="flex items-center gap-3 px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-[var(--player-color)] transition-all shadow-[0_0_20px_rgba(0,212,255,0.15)]"
              >
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[14px] text-[var(--player-color)]"
                  style={{ background: `linear-gradient(135deg, ${currentPlayer.color}33, ${currentPlayer.color}11)` }}
                >
                  {currentPlayer.avatar}
                </div>
                <div className="text-left hidden xs:block">
                  <div className="text-[13px] font-semibold leading-tight">{currentPlayer.name}</div>
                  <div className="text-[11px] text-white/40 leading-tight">{currentPlayer.elo} ELO</div>
                </div>
                <ChevronDown className="w-4 h-4 text-white/40 ml-1" />
              </button>
            )}

            {showPlayerDropdown && gameMode === 'ai' && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-[280px] bg-[#0f0f19]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 pt-3.5 pb-2.5 text-[11px] font-bold uppercase tracking-widest text-white/40 border-b border-white/5">Choose Your Opponent</div>
                <div>
                  {PLAYER_ORDER.map(id => {
                    const p = PLAYERS[id];
                    const active = id === activePlayerId;
                    return (
                      <div 
                        key={id} 
                        onClick={() => handlePlayerSelect(id)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5 border-l-[3px] ${active ? 'bg-white/5 border-[var(--player-color)]' : 'border-transparent'}`}
                      >
                        <div 
                          className="w-[38px] h-[38px] rounded-full flex items-center justify-center font-bold text-[15px] shrink-0"
                          style={{ color: p.color, background: `linear-gradient(135deg, ${p.color}33, ${p.color}11)`, border: `1.5px solid ${p.color}44` }}
                        >
                          {p.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold text-white/90">{p.country} {p.name}</div>
                          <div className="text-[11px] text-white/40 mt-0.5">{p.title}</div>
                        </div>
                        <span className="text-[11px] font-bold font-mono text-white/50">{p.elo}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="font-mono text-white/40 text-xs">Move {Math.floor(moveHistory.length / 2) || 0}</span>
            <span className="text-white/20">·</span>
            {gameMode === 'ai' ? (
              <span className="text-[var(--player-color)] font-semibold">{isAiThinking ? 'Thinking...' : gameOver ? 'Game Over' : 'Your move'}</span>
            ) : gameMode === 'local' ? (
              <span className="text-[var(--player-color)] font-semibold">{gameOver ? 'Game Over' : `Turn: ${game.turn() === 'w' ? 'White' : 'Black'}`}</span>
            ) : (
              <span className="text-[var(--player-color)] font-semibold">{gameOver ? 'Game Over' : 'Playing ' + (gameMode === 'multiplayer_host' ? 'as Host' : 'as Guest')}</span>
            )}
          </div>

          <button
            onClick={() => setShowDashboard(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/95 hover:text-white transition-all shadow-sm"
            title="View your stats and performance"
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline font-medium">Stats</span>
          </button>

          <button
            onClick={() => {
              logout();
              setGameMode(null);
              setMultiplayerRoomCode(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/95 hover:text-white transition-all shadow-sm"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline font-medium">Logout</span>
          </button>

          {gameMode === 'ai' && (
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} />
          )}
        </div>
      </header>

      {/* MAIN CONTENT — 2-panel: board left, panels right */}
      <main className="relative z-10 w-full flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ===== LEFT: BOARD AREA ===== */}
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 lg:p-6 min-w-0 overflow-y-auto">
          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3 shrink-0">
            {gameMode === 'ai' ? (
              <>
                <button onClick={resetGame} className="game-btn primary"><Plus className="w-3 h-3"/> New Game</button>
                <button onClick={() => setHintsEnabled(!hintsEnabled)} className={`game-btn ${hintsEnabled ? 'active' : ''}`}>Hints</button>
                <button onClick={() => setCommentaryEnabled(!commentaryEnabled)} className={`game-btn ${commentaryEnabled ? 'active' : ''}`}>Comm</button>
                <button onClick={resign} className="game-btn danger">Resign</button>
                {gameMode === 'ai' && (
                  <div className="flex gap-1.5 ml-2">
                    <button
                      onClick={() => { setPlayerColor('w'); resetGame(); }}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${playerColor === 'w' ? 'bg-white text-gray-900 shadow' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                    >White</button>
                    <button
                      onClick={() => { setPlayerColor('b'); resetGame(); }}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all border border-white/20 ${playerColor === 'b' ? 'bg-gray-800 text-white shadow' : 'bg-white/5 text-white/60 hover:bg-white/20'}`}
                    >Black</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <button onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); resetGame(); }} className="game-btn primary"><Plus className="w-3 h-3"/> New Game</button>
                <button onClick={() => { resign(); multiplayerResign(); }} className="game-btn danger">Resign</button>
              </>
            )}
          </div>

          {/* Board container — sizes to fill available space */}
          <div className="relative w-full max-w-[min(calc(100vh-10rem),100%)] mx-auto p-[6px]">
            <ChessBoard
              game={game}
              flipped={playerColor === 'b'}
              selectedSquare={selectedSquare}
              handleSquareClick={onSquareClick}
              lastMove={lastMoveObj}
              hintArrow={hintArrow}
            />

            {gameOver && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded animate-in fade-in duration-300">
                <div className="text-5xl mb-3">♟</div>
                <div className="font-display text-3xl font-bold text-[var(--player-color)] drop-shadow-[0_0_20px_var(--player-color)] mb-2">Game Over</div>
                <div className="text-sm text-white/70 text-center max-w-[220px] mb-6">{gameResult}</div>
                <button onClick={resetGame} className="game-btn primary px-8 py-2.5 text-sm">Play Again</button>
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT: SIDE PANEL ===== */}
        <div className="w-full lg:w-[340px] xl:w-[370px] shrink-0 flex flex-col gap-3 p-3 sm:p-4 lg:border-l border-white/5 bg-black/10 overflow-y-auto lg:h-[calc(100vh-3.5rem)]">

          {/* Player profile (AI mode only) */}
          {gameMode === 'ai' && (
            <div className="glass-panel">
              <div className="h-[3px] bg-gradient-to-r from-[var(--player-color)] to-transparent" />
              <div className="p-3 flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-[18px] shrink-0 shadow-[0_0_15px_rgba(0,212,255,0.2)]"
                  style={{ color: currentPlayer.color, background: `linear-gradient(135deg, ${currentPlayer.color}55, ${currentPlayer.color}22)` }}
                >
                  {currentPlayer.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{currentPlayer.country} {currentPlayer.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-white/40">{currentPlayer.title}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[var(--player-color)]">{currentPlayer.elo}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Captured Pieces */}
          <div className="glass-panel p-3">
            <div className="text-[10px] text-emerald-400 mb-2 uppercase tracking-widest font-bold">Captured Pieces</div>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">White</div>
                <div className="text-[22px] min-h-[30px] flex flex-wrap gap-0.5 leading-none">
                  {captured.w.length > 0 ? captured.w.map((p, i) => (
                    <span key={i} className="text-slate-500 drop-shadow-md">
                      {{ p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' }[p] || p}
                    </span>
                  )) : <span className="text-[10px] text-white/20 font-mono">--</span>}
                </div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="flex-1">
                <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">Black</div>
                <div className="text-[22px] min-h-[30px] flex flex-wrap gap-0.5 leading-none">
                  {captured.b.length > 0 ? captured.b.map((p, i) => (
                    <span key={i} className="text-slate-200 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
                      {{ p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' }[p] || p}
                    </span>
                  )) : <span className="text-[10px] text-white/20 font-mono">--</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Match History */}
          <div className="glass-panel flex flex-col min-h-[120px] max-h-[200px] text-xs">
            <div className="panel-header bg-transparent border-b border-purple-500/20 text-purple-300 flex items-center gap-2 shrink-0">
              <span className="text-[14px]">📋</span> Moves
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-mono">
              {moveHistory.length === 0 ? (
                <div className="text-white/30 text-center py-3">No moves yet</div>
              ) : (
                <div className="grid grid-cols-[28px_1fr_1fr] gap-x-2 gap-y-0.5 items-center px-1">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                    <React.Fragment key={i}>
                      <span className="text-white/30">{i + 1}.</span>
                      <span className={`px-1.5 py-0.5 rounded ${i * 2 === moveHistory.length - 1 ? 'bg-[var(--player-color)]/20 text-[var(--player-color)]' : 'text-white/80'}`}>{moveHistory[i * 2]?.san}</span>
                      <span className={`px-1.5 py-0.5 rounded ${i * 2 + 1 === moveHistory.length - 1 ? 'bg-[var(--player-color)]/20 text-[var(--player-color)]' : 'text-white/80'}`}>{moveHistory[i * 2 + 1]?.san || ''}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom panel: GameMode / Commentary / Multiplayer status */}
          {gameMode === null ? (
            <div className="glass-panel flex-1 flex flex-col min-h-[200px] overflow-hidden relative border-t-[3px] border-t-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
               <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/20 rounded-full blur-[60px] -z-10 mix-blend-screen pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px] -z-10 mix-blend-screen pointer-events-none"></div>
               <GameMode
                 onPlayAI={handlePlayAI}
                 onMultiplayerStart={handleMultiplayerStart}
                 onLocalStart={handleLocalStart}
                 autoJoinRoomCode={autoJoinRoomCode}
               />
            </div>
          ) : gameMode === 'ai' ? (
            <div className="glass-panel flex-1 flex flex-col min-h-[200px]">
              <div className="panel-header shrink-0">
                <MessageSquare className="w-3.5 h-3.5"/> Live Commentary
                <span className="ml-auto text-[9px] normal-case bg-red-500/20 px-2 py-0.5 rounded text-red-400 font-bold animate-pulse">ON AIR</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'model' && (
                      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold bg-gradient-to-br from-red-500/30 to-orange-500/30 border border-red-500/30 text-red-400">
                        G
                      </div>
                    )}
                    <div className={`text-[12.5px] leading-relaxed p-2.5 rounded-xl max-w-[85%] ${
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-[var(--player-color)]/20 to-blue-500/20 border border-[var(--player-color)]/30 text-white shadow-sm'
                        : 'bg-white/5 border border-white/10 text-white/90'
                      } ${m.isStreaming ? 'border-[var(--player-color)] animate-pulse' : ''}`
                    }>
                      {m.parts[0].text}
                      {m.isStreaming && <span className="text-[var(--player-color)] ml-1">▌</span>}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={submitChat} className="p-2.5 border-t border-white/10 flex gap-2 shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Talk to the commentator..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--player-color)] transition-colors"
                  disabled={!isConnected}
                />
                <button disabled={!isConnected || isStreaming} className="bg-[var(--player-color)]/20 hover:bg-[var(--player-color)]/40 text-[var(--player-color)] px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">Send</button>
              </form>
            </div>
          ) : gameMode === 'local' ? (
            <div className="glass-panel flex-1 flex flex-col min-h-[100px] justify-center">
              <div className="p-4 text-center">
                <div className="text-sm font-semibold text-white/90 mb-2">Local Multiplayer</div>
                <div className="text-xs text-white/50 mb-3">Pass the device to play</div>
                <div className="flex items-center justify-center gap-2 p-2 bg-white/5 rounded border border-white/10">
                  <span className="text-xs text-white/60">Current Turn:</span>
                  <span className="text-sm font-bold text-[var(--player-color)]">
                    {game.turn() === 'w' ? '♔ White' : '♚ Black'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel flex-1 flex flex-col min-h-[100px] justify-center">
              <div className="p-4 text-center">
                <div className="text-sm font-semibold text-white/90 mb-2">
                  {opponentOnline ? 'Opponent Connected' : gameMode === 'multiplayer_host' ? 'Waiting for opponent...' : 'Connecting...'}
                </div>
                <div className="text-xs text-white/50 mb-3">
                  {gameMode === 'multiplayer_host' && !opponentOnline
                    ? 'Share the room code to invite your friend'
                    : multiplayerOpponent?.name || 'Online Game'
                  }
                </div>
                {/* Connection indicators */}
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${mpConnected ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-red-500'}`} />
                    <span className="text-[10px] text-white/40">You</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${opponentOnline ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-amber-500 animate-pulse'}`} />
                    <span className="text-[10px] text-white/40">Opponent</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 p-2 bg-white/5 rounded border border-white/10">
                  <span className="text-xs text-white/60">Playing as:</span>
                  <span className="text-sm font-bold text-[var(--player-color)]">
                    {playerColor === 'w' || playerColor === 'white' ? '♔ White' : '♚ Black'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Dashboard Modal */}
      {showDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-7xl">
            <Dashboard />
            <button
              onClick={() => setShowDashboard(false)}
              className="fixed top-4 right-4 z-60 w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();
  
  console.log('App component: user=', user, 'loading=', loading);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center font-bold text-2xl mx-auto mb-4 animate-pulse">
            ♞
          </div>
          <p className="text-white text-lg">Loading Chess Legends...</p>
          <p className="text-white/40 text-sm mt-2">Preparing your chess experience</p>
        </div>
      </div>
    );
  }

  return user ? <GameView /> : <AuthPage />;
}

export default App;
