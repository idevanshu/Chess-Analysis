import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChessBoard from './ChessBoard';
import { useChessLogic } from './useChessLogic';
import { useGemini } from './useGemini';
import { useMultiplayer } from './useMultiplayer';
import { PLAYERS, PLAYER_ORDER } from './players';
import { useAuth } from './context/AuthContext';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
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
  
  const currentPlayer = PLAYERS[activePlayerId];
  
  const {
    game, fen, moveHistory, gameOver, gameResult, captured, isAiThinking,
    playerColor, setPlayerColor, handleSquareClick, resetGame, hintArrow, resign
  } = useChessLogic(currentPlayer, hintsEnabled, gameMode !== 'ai');

  // Get Gemini commentary only for AI mode
  const {
    messages, isStreaming, isConnected,
    sendMessageStream, getAutoCommentary
  } = useGemini(currentPlayer);

  // Setup multiplayer socket connection
  const handleOpponentMove = useCallback((data) => {
    // Handle opponent move
    console.log('Opponent move:', data);
  }, []);

  const handleGameEnded = useCallback((data) => {
    // Handle game end
    console.log('Game ended:', data);
  }, []);

  const { sendMove, resign: multiplayerResign } = useMultiplayer(
    multiplayerRoomCode,
    user?.id,
    handleOpponentMove,
    handleGameEnded
  );

  const chatEndRef = useRef(null);
  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handlePlayAI = () => {
    setGameMode('ai');
    setShowGameMode(false);
    setMultiplayerRoomCode(null);
  };

  const handleMultiplayerStart = (mode, roomCode, data = null) => {
    setMultiplayerRoomCode(roomCode);
    if (mode === 'host') {
      setGameMode('multiplayer_host');
      setPlayerColor('w');
    } else {
      setGameMode('multiplayer_guest');
      setMultiplayerOpponent(data?.host);
      setPlayerColor(data?.guestColor === 'white' ? 'w' : 'b');
    }
    setShowGameMode(false);
  };

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(multiplayerRoomCode);
    setColorCopied(true);
    setTimeout(() => setColorCopied(false), 2000);
  };

  // Trigger auto commentary on move for AI
  useEffect(() => {
    if (gameMode === 'ai' && moveHistory.length > 0 && commentaryEnabled) {
      const lastMove = moveHistory[moveHistory.length - 1];
      if (lastMove.color !== playerColor) {
        // AI made a move
        getAutoCommentary(fen, moveHistory.length, lastMove.san);
      }
    }
  }, [moveHistory.length, gameMode]);

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
            ) : (
              <span className="text-[var(--player-color)] font-semibold">{gameOver ? 'Game Over' : 'Playing ' + (gameMode === 'multiplayer_host' ? 'as Host' : 'as Guest')}</span>
            )}
          </div>

          <button
            onClick={() => setShowDashboard(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-all"
            title="View your stats and performance"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Stats</span>
          </button>

          <button
            onClick={() => {
              logout();
              setGameMode(null);
              setMultiplayerRoomCode(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          {gameMode === 'ai' && (
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} />
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 w-full max-w-[1400px] mx-auto px-3 sm:px-5 py-5 flex-1 flex flex-col xl:flex-row items-center xl:items-start justify-center gap-5 xl:gap-8 overflow-hidden">
        
        {/* LEFT COL */}
        <div className="flex flex-col gap-4 w-full sm:w-[240px] shrink-0 order-2 xl:order-1 hidden sm:flex">
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

          <div className="glass-panel p-4">
            <div className="text-[11px] text-white/35 mb-2 uppercase tracking-widest font-semibold">Captured</div>
            <div className="text-[11px] text-white/50 mb-1">White points:</div>
            <div className="font-mono text-sm min-h-5 text-white/80">{captured.w.join('') || '—'}</div>
            <div className="text-[11px] text-white/50 mt-2 mb-1">Black points:</div>
            <div className="font-mono text-sm min-h-5 text-white/80">{captured.b.join('') || '—'}</div>
          </div>
        </div>

        {/* CENTER COL (Board) */}
        <div className="flex flex-col items-center gap-4 w-full xl:w-auto order-1 xl:order-2">
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            {gameMode === 'ai' ? (
              <>
                <button onClick={resetGame} className="game-btn btn-primary"><Plus className="w-3 h-3"/> New Game</button>
                <button onClick={() => setHintsEnabled(!hintsEnabled)} className={`game-btn ${hintsEnabled ? 'btn-active' : ''}`}>💡 Hints</button>
                <button onClick={() => setCommentaryEnabled(!commentaryEnabled)} className={`game-btn ${commentaryEnabled ? 'btn-active' : ''}`}>🎙️ Comm</button>
                <button onClick={resign} className="game-btn btn-danger">🏳 Resign</button>
              </>
            ) : (
              <>
                <button onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); resetGame(); }} className="game-btn btn-primary"><Plus className="w-3 h-3"/> New Game</button>
                <button onClick={multiplayerResign} className="game-btn btn-danger">🏳 Resign</button>
              </>
            )}
          </div>

          <div className="relative w-full max-w-[480px]">
            <ChessBoard 
              game={game} 
              flipped={playerColor === 'b'} 
              selectedSquare={selectedSquare}
              handleSquareClick={(sq, currentSelected) => {
                const result = handleSquareClick(sq, currentSelected);
                // If it returns a string, it selected a piece. If null, it triggered a move or deselected.
                // We update our local state to match the returned selected square.
                if (result !== undefined) {
                  setSelectedSquare(result);
                }
              }}
              lastMove={lastMoveObj}
              hintArrow={hintArrow}
            />

            {gameOver && (
              <div className="absolute inset-0 bg-dark/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded animate-in fade-in duration-300">
                <div className="text-5xl mb-3">♟</div>
                <div className="font-display text-3xl font-bold text-[var(--player-color)] drop-shadow-[0_0_20px_var(--player-color)] mb-2">Game Over</div>
                <div className="text-sm text-white/70 text-center max-w-[200px] mb-6">{gameResult}</div>
                <button onClick={resetGame} className="game-btn btn-primary px-8 py-2.5 text-sm">Play Again</button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COL */}
        <div className="flex flex-col w-full sm:w-[300px] gap-4 shrink-0 order-3 h-[500px] xl:h-[600px]">
          {/* History */}
          <div className="glass-panel flex flex-col h-[40%] text-xs">
            <div className="panel-header">📋 History</div>
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

          {gameMode === 'ai' ? (
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

      {/* Game Mode Selector Modal */}
      {showGameMode && gameMode === null && (
        <GameMode 
          onPlayAI={handlePlayAI}
          onMultiplayerStart={handleMultiplayerStart}
        />
      )}

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
