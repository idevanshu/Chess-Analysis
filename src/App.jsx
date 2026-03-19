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
    sendMessageStream, getAutoCommentary
  } = useGemini(currentPlayer);

  // Setup multiplayer socket connection
  const handleOpponentMove = useCallback((data) => {
    // Handle opponent move
    console.log('Opponent move:', data);
    if (data.san) {
      makeExternalMove(data.san);
    }
  }, [makeExternalMove]);

  const handleGameEnded = useCallback((data) => {
    // Handle game end
    console.log('Game ended:', data);
    if (data.result === 'opponent_resigned') {
      forceGameOver('Opponent Resigned. You Win!');
    }
  }, [forceGameOver]);

  const { sendMove, resign: multiplayerResign } = useMultiplayer(
    multiplayerRoomCode,
    user?.id,
    handleOpponentMove,
    handleGameEnded
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

  // Trigger auto commentary on move for AI (randomly to save API quota)
  useEffect(() => {
    if (gameMode === 'ai' && moveHistory.length > 0 && commentaryEnabled) {
      const lastMove = moveHistory[moveHistory.length - 1];
      if (lastMove.color !== playerColor) {
        // AI made a move
        // Only trigger 25% of the time to avoid 429 Too Many Requests errors
        if (Math.random() < 0.25) {
          getAutoCommentary(fen, moveHistory.length, lastMove.san);
        }
      }
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

      {/* MAIN CONTENT */}
      <main className="relative z-10 w-full max-w-[1400px] mx-auto px-3 sm:px-5 py-5 flex-1 flex flex-col xl:flex-row items-center xl:items-start justify-center gap-5 xl:gap-8 overflow-y-auto overflow-x-hidden">
        
        {/* LEFT COL */}
        <div className="flex flex-col gap-4 w-full sm:w-[240px] shrink-0 order-2 xl:order-1">
          {gameMode === 'ai' && (
            <>
            {/* Active Player Profile */}
            <div className="glass-panel">
              <div className="h-[3px] bg-gradient-to-r from-[var(--player-color)] to-transparent" />
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-[22px] shadow-[0_0_20px_rgba(0,212,255,0.25)] transition-shadow duration-300"
                    style={{ color: currentPlayer.color, background: `linear-gradient(135deg, ${currentPlayer.color}55, ${currentPlayer.color}22)` }}
                  >
                    {currentPlayer.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{currentPlayer.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm">{currentPlayer.country}</span>
                      <span className="text-[11px] text-white/40">{currentPlayer.title}</span>
                    </div>
                  </div>
                </div>
                
                <div className="font-mono text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[var(--player-color)] inline-block mb-3">
                  {currentPlayer.elo} ELO
                </div>
                
                <div className="text-[11px] text-white/50 leading-relaxed mb-3">
                  {currentPlayer.style}
                </div>
                
                <div className="text-[11px] italic text-white/40 border-l-2 pl-2 leading-relaxed" style={{ borderColor: currentPlayer.color }}>
                  {currentPlayer.catchphrase}
                </div>
              </div>
            </div>

            <div className="glass-panel p-4">
              <div className="text-[11px] text-white/35 mb-2 uppercase tracking-widest font-semibold flex items-center gap-1"><Settings className="w-3 h-3"/> Play as</div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setPlayerColor('w'); resetGame(); }} 
                  className={`flex-1 py-1.5 rounded text-xs font-bold transition-opacity hover:opacity-90 ${playerColor === 'w' ? 'bg-white text-dark' : 'bg-white/10 text-white/70'}`}
                >♔ White</button>
                <button 
                  onClick={() => { setPlayerColor('b'); resetGame(); }} 
                  className={`flex-1 py-1.5 rounded text-xs font-bold transition-opacity hover:opacity-90 border border-white/20 ${playerColor === 'b' ? 'bg-dark-2 text-white' : 'bg-white/5 text-white/70'}`}
                >♚ Black</button>
              </div>
            </div>
            </>
          )}

          <div className="glass-panel p-5 flex flex-col gap-4 border-t-[3px] border-t-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <div className="text-[10px] text-emerald-400 mb-1 uppercase tracking-widest font-bold flex flex-col gap-1.5">
              Captured Pieces
              <div className="h-px bg-gradient-to-r from-emerald-400/50 to-transparent w-full"></div>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-100 shadow-[0_0_10px_rgba(255,255,255,1)]"></div>
                <div className="text-[11px] text-white/60 uppercase tracking-widest font-semibold flex-1">White Took</div>
              </div>
              <div className="text-[26px] min-h-[38px] flex flex-wrap gap-1 leading-none bg-black/20 p-2.5 rounded-xl border border-white/5 backdrop-blur-sm">
                {captured.w.length > 0 ? captured.w.map((p, i) => (
                   <span key={i} className="text-slate-500 drop-shadow-md transition-transform hover:-translate-y-1">
                     {{ p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' }[p] || p}
                   </span>
                )) : <span className="text-xs text-white/20 font-mono normal-case tracking-normal">No captures</span>}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-slate-500 shadow-[0_0_10px_rgba(0,0,0,0.8)]"></div>
                <div className="text-[11px] text-white/60 uppercase tracking-widest font-semibold flex-1">Black Took</div>
              </div>
              <div className="text-[26px] min-h-[38px] flex flex-wrap gap-1 leading-none bg-black/20 p-2.5 rounded-xl border border-white/5 backdrop-blur-sm">
                {captured.b.length > 0 ? captured.b.map((p, i) => (
                   <span key={i} className="text-slate-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-transform hover:-translate-y-1">
                     {{ p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' }[p] || p}
                   </span>
                )) : <span className="text-xs text-white/20 font-mono normal-case tracking-normal">No captures</span>}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COL (Board) */}
        <div className="flex flex-col items-center gap-4 w-full xl:w-auto order-1 xl:order-2">
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            {gameMode === 'ai' ? (
              <>
                <button onClick={resetGame} className="game-btn primary"><Plus className="w-3 h-3"/> New Game</button>
                <button onClick={() => setHintsEnabled(!hintsEnabled)} className={`game-btn ${hintsEnabled ? 'active' : ''}`}>💡 Hints</button>
                <button onClick={() => setCommentaryEnabled(!commentaryEnabled)} className={`game-btn ${commentaryEnabled ? 'active' : ''}`}>🎙️ Comm</button>
                <button onClick={resign} className="game-btn danger">🏳 Resign</button>
              </>
            ) : (
              <>
                <button onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); resetGame(); }} className="game-btn primary"><Plus className="w-3 h-3"/> New Game</button>
                <button onClick={() => { resign(); multiplayerResign(); }} className="game-btn danger">🏳 Resign</button>
              </>
            )}
          </div>

          <div className="relative w-full max-w-[480px]">
            <ChessBoard 
              game={game} 
              flipped={playerColor === 'b'} 
              selectedSquare={selectedSquare}
              handleSquareClick={onSquareClick}
              lastMove={lastMoveObj}
              hintArrow={hintArrow}
            />

            {gameOver && (
              <div className="absolute inset-0 bg-dark/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded animate-in fade-in duration-300">
                <div className="text-5xl mb-3">♟</div>
                <div className="font-display text-3xl font-bold text-[var(--player-color)] drop-shadow-[0_0_20px_var(--player-color)] mb-2">Game Over</div>
                <div className="text-sm text-white/70 text-center max-w-[200px] mb-6">{gameResult}</div>
                <button onClick={resetGame} className="game-btn primary px-8 py-2.5 text-sm">Play Again</button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COL */}
        <div className="flex flex-col w-full sm:w-[300px] gap-4 shrink-0 order-3 h-[500px] xl:h-[600px]">
          {/* History */}
          <div className="glass-panel flex flex-col h-[40%] text-xs border-t-[3px] border-t-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
            <div className="panel-header bg-transparent border-b border-purple-500/20 text-purple-300 flex items-center gap-2">
              <span className="text-[14px]">📋</span> Match History
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-mono">
              {moveHistory.length === 0 ? (
                <div className="text-white/30 text-center py-4">No moves yet</div>
              ) : (
                <div className="grid grid-cols-[30px_1fr_1fr] gap-x-2 gap-y-1 items-center px-1">
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

          {gameMode === null ? (
            <div className="glass-panel flex-1 flex flex-col min-h-[50%] overflow-hidden relative border-t-[3px] border-t-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
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
            /* AI Chat for AI games */
            <div className="glass-panel flex-1 flex flex-col min-h-[50%]">
              <div className="panel-header">
                <MessageSquare className="w-3.5 h-3.5"/> AI Coach
                <span className="ml-auto text-[9px] normal-case bg-white/5 px-2 py-0.5 rounded text-white/40">Gemini 2.5 Flash</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'model' && (
                      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold" style={{ background: `linear-gradient(135deg, ${currentPlayer.color}55, ${currentPlayer.color}22)` }}>
                        {currentPlayer.avatar}
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

              <form onSubmit={submitChat} className="p-2.5 border-t border-white/10 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask coach..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--player-color)] transition-colors"
                  disabled={!isConnected}
                />
                <button disabled={!isConnected || isStreaming} className="bg-[var(--player-color)]/20 hover:bg-[var(--player-color)]/40 text-[var(--player-color)] px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">Send</button>
              </form>
            </div>
          ) : gameMode === 'local' ? (
            /* Local Multiplayer Status */
             <div className="glass-panel flex-1 flex flex-col min-h-[50%] justify-center">
              <div className="p-4 text-center">
                <div className="text-sm font-semibold text-white/90 mb-2">Local Multiplayer</div>
                <div className="text-xs text-white/50 mb-4">Pass the device to play</div>
                <div className="flex items-center justify-center gap-2 p-2 bg-white/5 rounded border border-white/10">
                  <span className="text-xs text-white/60">Current Turn:</span>
                  <span className="text-sm font-bold text-[var(--player-color)]">
                    {game.turn() === 'w' ? '♔ White' : '♚ Black'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Multiplayer Game Status */
            <div className="glass-panel flex-1 flex flex-col min-h-[50%] justify-center">
              <div className="p-4 text-center">
                <div className="text-sm font-semibold text-white/90 mb-2">
                  {gameMode === 'multiplayer_host' ? 'Waiting for opponent...' : 'Connected to game'}
                </div>
                <div className="text-xs text-white/50 mb-4">
                  {gameMode === 'multiplayer_host' 
                    ? 'Share the room code to invite your friend'
                    : multiplayerOpponent?.name || 'opponent'
                  }
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
