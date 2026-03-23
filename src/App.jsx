import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChessBoard from './ChessBoard';
import { useChessLogic } from './useChessLogic';
import { useChessSound } from './useChessSound';
import { useChessTimer, formatTime } from './useChessTimer';
import { useGemini } from './useGemini';
import { useMultiplayer } from './useMultiplayer';
import { PLAYERS, PLAYER_ORDER } from './players';
import { useAuth } from './context/AuthContext';
import AuthPage from './AuthPage';
import Dashboard from './DashboardNew';
import GameMode from './GameMode';
import { ChevronDown, Settings, MessageSquare, Plus, BarChart3, LogOut, Copy, Check, Undo2, Clock, ArrowLeft, User, Swords, Wifi, WifiOff, Volume2, VolumeX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw, Flag, MessageCircle, Handshake, X, Send, RefreshCw } from 'lucide-react';

// Classic chess clock panel — sits to the left of the board
function ChessClock({ whiteTime, blackTime, activeTurn, gameStarted, gameOver, playerColor, timeControl }) {
  const isFlipped = playerColor === 'b';
  // Top clock = opponent, Bottom clock = you
  const topColor = isFlipped ? 'w' : 'b';
  const bottomColor = isFlipped ? 'b' : 'w';
  const topTime = topColor === 'w' ? whiteTime : blackTime;
  const bottomTime = bottomColor === 'w' ? whiteTime : blackTime;
  const topActive = gameStarted && !gameOver && activeTurn === topColor;
  const bottomActive = gameStarted && !gameOver && activeTurn === bottomColor;

  return (
    <div className="hidden md:flex flex-col w-[130px] lg:w-[150px] shrink-0 mr-3 lg:mr-4 select-none">
      {/* Clock housing */}
      <div className="flex-1 flex flex-col rounded-2xl overflow-hidden bg-gradient-to-b from-[#1a1a2e] to-[#16162a] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]">
        {/* Opponent clock (top) */}
        <ClockFace
          time={topTime}
          isActive={topActive}
          label={topColor === 'w' ? 'White' : 'Black'}
          piece={topColor === 'w' ? '♔' : '♚'}
          pieceColor={topColor === 'w' ? '#e2e8f0' : '#94a3b8'}
        />

        {/* Divider with format badge */}
        <div className="relative px-3">
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          {timeControl && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 bg-[#1a1a2e] text-[9px] font-bold uppercase tracking-wider text-white/30 whitespace-nowrap">
              {timeControl.format}
            </div>
          )}
        </div>

        {/* Player clock (bottom) */}
        <ClockFace
          time={bottomTime}
          isActive={bottomActive}
          label={bottomColor === 'w' ? 'White' : 'Black'}
          piece={bottomColor === 'w' ? '♔' : '♚'}
          pieceColor={bottomColor === 'w' ? '#e2e8f0' : '#94a3b8'}
        />
      </div>

      {/* Label */}
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <Clock className="w-3 h-3 text-white/25" />
        <span className="text-[10px] text-white/25 font-medium">{timeControl?.label}</span>
      </div>
    </div>
  );
}

// Individual clock face
function ClockFace({ time, isActive, label, piece, pieceColor }) {
  const isLow = time < 30;
  const isCritical = time < 10;

  return (
    <div className={`flex-1 flex flex-col items-center justify-center py-4 px-2 transition-all duration-300 relative ${
      isActive ? 'bg-white/[0.04]' : ''
    }`}>
      {/* Active glow */}
      {isActive && (
        <div className={`absolute inset-0 pointer-events-none ${
          isCritical ? 'bg-red-500/[0.06]' : isLow ? 'bg-amber-500/[0.04]' : 'bg-emerald-500/[0.04]'
        }`} />
      )}

      {/* Active dot indicator */}
      <div className={`w-2 h-2 rounded-full mb-2 transition-all duration-300 ${
        isActive
          ? isCritical
            ? 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse'
            : isLow
              ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
              : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
          : 'bg-white/10'
      }`} />

      {/* Piece icon */}
      <span className="text-2xl mb-1 drop-shadow-lg" style={{ color: pieceColor }}>
        {piece}
      </span>

      {/* Player label */}
      <span className={`text-[10px] uppercase tracking-widest font-bold mb-2 transition-colors ${
        isActive ? 'text-white/60' : 'text-white/25'
      }`}>
        {label}
      </span>

      {/* Time display */}
      <div className={`font-mono font-black tabular-nums tracking-tight transition-all duration-300 ${
        isCritical && isActive
          ? 'text-3xl lg:text-4xl text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
          : isLow && isActive
            ? 'text-3xl lg:text-4xl text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]'
            : isActive
              ? 'text-3xl lg:text-4xl text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]'
              : 'text-3xl lg:text-4xl text-white/30'
      }`}>
        {formatTime(time)}
      </div>
    </div>
  );
}

// Compact clock for mobile screens
function MobileClockFace({ time, isActive, label, piece }) {
  const isLow = time < 30;
  const isCritical = time < 10;
  return (
    <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
      isActive
        ? isCritical
          ? 'bg-red-500/15 border border-red-500/30'
          : isLow
            ? 'bg-amber-500/10 border border-amber-500/25'
            : 'bg-white/10 border border-white/15'
        : 'bg-white/5 border border-white/5'
    }`}>
      <span className="text-xl">{piece}</span>
      <div className="flex flex-col">
        <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold leading-none">{label}</span>
        <span className={`font-mono text-xl font-black tabular-nums leading-tight ${
          isActive
            ? isCritical ? 'text-red-400 animate-pulse' : isLow ? 'text-amber-400' : 'text-white'
            : 'text-white/35'
        }`}>
          {formatTime(time)}
        </span>
      </div>
      {isActive && (
        <div className={`w-1.5 h-1.5 rounded-full ml-auto ${
          isCritical ? 'bg-red-500 animate-pulse' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
        }`} />
      )}
    </div>
  );
}

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
  const [timeControl, setTimeControl] = useState(null); // { initialTime, increment, label, format }
  const [autoFlipLocal, setAutoFlipLocal] = useState(true);
  const [manualFlip, setManualFlip] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const { playSound, enabledRef: soundEnabledRef } = useChessSound();
  const movesScrollRef = useRef(null);

  const currentPlayer = PLAYERS[activePlayerId];
  
  // Check for auto-join URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('roomCode');
    if (roomCode) {
      setAutoJoinRoomCode(roomCode);
      // Clean URL so refreshing doesn't re-trigger join
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  const {
    game, fen, moveHistory, gameOver, gameResult, captured, isAiThinking,
    playerColor, setPlayerColor, handleSquareClick, resetGame, undoMove, hintArrow, resign, forceGameOver, forceGameOverStructured, makeExternalMove,
    viewingGame, viewingMoveIndex, isViewingHistory, goToMove, goBack, goForward, goToStart, goToEnd,
    pendingPromotion, premove, completePromotion, cancelPromotion
  } = useChessLogic(currentPlayer, hintsEnabled, gameMode);

  // Chess timer
  const gameStarted = moveHistory.length > 0;
  const { whiteTime, blackTime, isTimedOut, timedOutColor, resetTimers, syncTime } = useChessTimer(
    timeControl,
    game.turn(),
    gameStarted,
    gameOver
  );

  // Handle timeout — end game when clock runs out
  useEffect(() => {
    if (isTimedOut && timedOutColor && !gameOver) {
      const winnerColor = timedOutColor === 'w' ? 'b' : 'w';
      forceGameOverStructured({ type: 'timeout', winnerColor, loserColor: timedOutColor });
    }
  }, [isTimedOut, timedOutColor, gameOver, forceGameOverStructured]);

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
      forceGameOverStructured({ type: 'opponent_resigned', winnerColor: playerColor });
    } else if (data.result === 'aborted' || data.reason === 'abort') {
      // Abort is handled via mpGameAborted state — no need to force game over
    } else if (data.reason === 'agreement') {
      forceGameOverStructured({ type: 'draw' });
    } else if (data.reason === 'timeout') {
      // Server detected timeout
      const hostWon = data.result === 'hostWin';
      const winnerColor = hostWon ? 'w' : 'b'; // simplified — depends on host color
      forceGameOverStructured({ type: 'timeout', winnerColor, loserColor: winnerColor === 'w' ? 'b' : 'w' });
    } else if (data.reason === 'checkmate') {
      // Server detected checkmate — chess.js locally will also catch it
    } else if (data.reason === 'draw') {
      forceGameOverStructured({ type: 'draw' });
    }
  }, [forceGameOverStructured, playerColor]);

  // Sync handler for late joins / reconnects
  const handleGameSync = useCallback((data) => {
    console.log('Game sync received:', data);
    // Set correct color from server (important for random color selection)
    if (data.hostColor && gameMode === 'multiplayer_host') {
      setPlayerColor(data.hostColor);
    } else if (data.guestColor && gameMode === 'multiplayer_guest') {
      setPlayerColor(data.guestColor);
    }
    // Set time control from server if not already set
    if (data.timeControl?.initialTime && !timeControl) {
      setTimeControl(data.timeControl);
    }
  }, [gameMode, timeControl]);

  const {
    sendMove, resign: multiplayerResign, connected: mpConnected, opponentOnline, opponentName: mpOpponentName, setOpponentName: setMpOpponentName,
    // Chat
    chatMessages: mpChatMessages, sendChat: mpSendChat,
    // Draw
    drawOffered: mpDrawOffered, drawOfferSent: mpDrawOfferSent, offerDraw: mpOfferDraw, respondDraw: mpRespondDraw,
    // Rematch
    rematchOffered: mpRematchOffered, rematchOfferSent: mpRematchOfferSent, rematchRoomCode: mpRematchRoomCode,
    offerRematch: mpOfferRematch, declineRematch: mpDeclineRematch,
    // Takeback
    takebackRequested: mpTakebackRequested, takebackSent: mpTakebackSent,
    requestTakeback: mpRequestTakeback, respondTakeback: mpRespondTakeback,
    // Abort
    abortGame: mpAbortGame, gameAborted: mpGameAborted,
    // Timer sync
    serverWhiteTime: mpServerWhiteTime, serverBlackTime: mpServerBlackTime, roomTimeControl: mpRoomTimeControl,
  } = useMultiplayer(
    multiplayerRoomCode,
    user?.id,
    token,
    handleOpponentMove,
    handleGameEnded,
    handleGameSync
  );
  const [mpChatInput, setMpChatInput] = useState('');

  // Sync timer from server in multiplayer
  useEffect(() => {
    if (gameMode?.includes('multiplayer') && mpServerWhiteTime !== null && mpServerBlackTime !== null) {
      syncTime(mpServerWhiteTime, mpServerBlackTime);
    }
  }, [mpServerWhiteTime, mpServerBlackTime, gameMode, syncTime]);

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
  const mpChatEndRef = useRef(null);
  const gameSavedRef = useRef(false);
  
  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Auto-scroll multiplayer chat
  useEffect(() => {
    mpChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mpChatMessages]);

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
      
      // Determine result from structured gameResult object
      let resultStr = 'draw';
      if (gameResult && typeof gameResult === 'object') {
        const r = gameResult;
        if (r.type === 'checkmate' || r.type === 'timeout' || r.type === 'opponent_resigned') {
          resultStr = r.winnerColor === playerColor ? 'win' : 'loss';
        } else if (r.type === 'resign') {
          resultStr = 'loss';
        } else {
          resultStr = 'draw'; // stalemate, repetition, insufficient, fifty-move, draw
        }
      } else if (typeof gameResult === 'string') {
        // Legacy fallback
        if (gameResult.includes('Win') && !gameResult.includes('Opponent')) resultStr = 'win';
        else if (gameResult.includes('resigned') || gameResult.includes('defeated')) resultStr = 'loss';
        else resultStr = 'draw';
      }
      console.log('Game result:', gameResult, '→', resultStr);

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

  // --- Sound effects ---
  useEffect(() => {
    if (moveHistory.length === 0 || !soundEnabledRef.current) return;
    playSound(moveHistory[moveHistory.length - 1]);
  }, [moveHistory.length]);

  useEffect(() => {
    if (gameOver && soundEnabledRef.current && gameResult && gameResult.type !== 'checkmate') {
      playSound('gameEnd');
    }
  }, [gameOver]);

  const handleToggleSound = () => {
    setSoundOn(prev => {
      soundEnabledRef.current = !prev;
      return !prev;
    });
  };

  // --- Keyboard navigation for move history ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!gameMode || showGameMode) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
      else if (e.key === 'Home') { e.preventDefault(); goToStart(); }
      else if (e.key === 'End') { e.preventDefault(); goToEnd(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode, showGameMode, moveHistory.length]);

  // Auto-scroll moves panel
  useEffect(() => {
    if (movesScrollRef.current) {
      if (viewingMoveIndex === null) {
        movesScrollRef.current.scrollTop = movesScrollRef.current.scrollHeight;
      }
    }
  }, [moveHistory.length, viewingMoveIndex]);

  const handlePlayAI = (tc) => {
    setTimeControl(tc || null);
    setGameMode('ai');
    setShowGameMode(false);
    setMultiplayerRoomCode(null);
  };

  const handleLocalStart = (tc) => {
    setTimeControl(tc || null);
    setGameMode('local');
    setShowGameMode(false);
    setMultiplayerRoomCode(null);
    setPlayerColor('w');
  };

  const handleMultiplayerStart = (mode, roomCode, data = null) => {
    setMultiplayerRoomCode(roomCode);
    if (mode === 'host') {
      setGameMode('multiplayer_host');
      setPlayerColor('w'); // host is always white (server may have set based on preference)
    } else {
      setGameMode('multiplayer_guest');
      setMultiplayerOpponent(data?.host);
      // Set opponent name from join response (host info)
      if (data?.host?.name) {
        setMpOpponentName(data.host.name);
      }
      // Guest gets the opposite color — default to black
      const color = data?.guestColor;
      setPlayerColor(color === 'w' || color === 'white' ? 'w' : 'b');
      console.log('[MP] Guest color set to:', color === 'w' || color === 'white' ? 'w' : 'b', 'raw:', color);
      // Set time control from room data (guest learns TC from server)
      if (data?.timeControl?.initialTime) {
        setTimeControl(data.timeControl);
      }
    }
    setShowGameMode(false);
  };

  const handleNewGame = () => {
    resetGame();
    resetTimers();
  };

  const copyRoomCode = async () => {
    const shareLink = `${window.location.origin}${window.location.pathname}?roomCode=${multiplayerRoomCode}`;
    await navigator.clipboard.writeText(shareLink);
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
      // Pass a readable string to the commentator
      const rd = getResultDisplay();
      commentOnGameOver(`${rd.title} ${rd.subtitle}`, fen, moveHistory.length);
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
    // If viewing history, snap back to live position
    if (isViewingHistory) { goToEnd(); return; }
    // Block moves in multiplayer until opponent is connected
    if (gameMode?.includes('multiplayer') && !opponentOnline) return;
    const result = handleSquareClick(sq, currentSelected);
    if (result !== undefined) {
      setSelectedSquare(result);
    }
  }, [handleSquareClick, gameMode, opponentOnline, isViewingHistory]);

  const handlePlayerSelect = (id) => {
    setActivePlayerId(id);
    setShowPlayerDropdown(false);
    if (gameMode === 'ai') {
      handleNewGame();
    }
  };

  // Format game result for display
  const getResultDisplay = () => {
    if (!gameResult) return { title: 'Game Over', subtitle: '', icon: '♟' };

    // Legacy string results (from old forceGameOver calls)
    if (typeof gameResult === 'string') {
      return { title: 'Game Over', subtitle: gameResult, icon: '♟' };
    }

    const r = gameResult;

    // Figure out player/opponent names based on mode
    const getPlayerName = (color) => {
      if (gameMode === 'ai') {
        return color === playerColor ? (user?.name || 'You') : currentPlayer.name;
      } else if (gameMode === 'local') {
        return color === 'w' ? 'White' : 'Black';
      } else {
        // multiplayer
        return color === playerColor ? (user?.name || 'You') : (mpOpponentName || 'Opponent');
      }
    };

    const youWon = r.winnerColor === playerColor;
    const winnerName = r.winnerColor ? getPlayerName(r.winnerColor) : null;
    const loserName = r.winnerColor ? getPlayerName(r.winnerColor === 'w' ? 'b' : 'w') : null;

    switch (r.type) {
      case 'checkmate': {
        if (gameMode === 'local') {
          return { title: 'Checkmate!', subtitle: `${winnerName} defeated ${loserName}`, icon: '♚' };
        }
        return {
          title: youWon ? 'Checkmate!' : 'Checkmate!',
          subtitle: youWon
            ? `You defeated ${loserName}`
            : `You got defeated by ${winnerName}`,
          icon: youWon ? '👑' : '♚',
        };
      }
      case 'stalemate':
        return { title: 'Stalemate!', subtitle: 'No legal moves. The game is a draw.', icon: '🤝' };
      case 'repetition':
        return { title: 'Draw!', subtitle: 'Threefold repetition.', icon: '🔁' };
      case 'insufficient':
        return { title: 'Draw!', subtitle: 'Insufficient material to checkmate.', icon: '🤝' };
      case 'fifty-move':
        return { title: 'Draw!', subtitle: '50-move rule. No captures or pawn moves.', icon: '🤝' };
      case 'draw':
        return { title: 'Draw!', subtitle: 'The game ended in a draw.', icon: '🤝' };
      case 'resign': {
        const resignerColor = r.loserColor;
        const resignerName = getPlayerName(resignerColor);
        const otherName = getPlayerName(resignerColor === 'w' ? 'b' : 'w');
        if (gameMode === 'local') {
          return { title: 'Resignation', subtitle: `${resignerName} resigned. ${otherName} wins!`, icon: '🏳️' };
        }
        return {
          title: 'Resignation',
          subtitle: resignerColor === playerColor
            ? `You resigned. ${otherName} wins!`
            : `${resignerName} resigned. You win!`,
          icon: '🏳️',
        };
      }
      case 'opponent_resigned': {
        const opName = mpOpponentName || 'Opponent';
        return { title: 'Opponent Resigned', subtitle: `${opName} resigned. You win!`, icon: '👑' };
      }
      case 'timeout': {
        if (gameMode === 'local') {
          return { title: 'Time\'s Up!', subtitle: `${loserName} ran out of time. ${winnerName} wins!`, icon: '⏱️' };
        }
        const youTimedOut = r.loserColor === playerColor;
        return {
          title: 'Time\'s Up!',
          subtitle: youTimedOut
            ? `You ran out of time. ${winnerName} wins!`
            : `${loserName} ran out of time. You win!`,
          icon: '⏱️',
        };
      }
      default:
        return { title: 'Game Over', subtitle: '', icon: '♟' };
    }
  };

  const submitChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isStreaming) return;
    sendMessageStream(chatInput, fen);
    setChatInput('');
  };

  // Display game: use viewingGame when browsing history, otherwise live game
  const displayGame = viewingGame || game;

  // Last move highlight: show viewed move when browsing, otherwise latest
  const lastMoveObj = isViewingHistory
    ? (viewingMoveIndex >= 0 ? moveHistory[viewingMoveIndex] : null)
    : moveHistory[moveHistory.length - 1];

  return (
    <div style={{ '--player-color': currentPlayer.color }} className="flex flex-col min-h-screen">
      {/* HEADER */}
      <header className="relative z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl h-14 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center font-bold text-sm">♟</div>
            <span className="font-display font-bold text-lg bg-gradient-to-br from-cyan-400 to-violet-600 text-transparent bg-clip-text hidden sm:block">Chess Legends</span>
          </div>

          {gameMode && (
            <button
              onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); handleNewGame(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/95 hover:text-white transition-all shadow-sm"
              title="Back to menu"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Menu</span>
            </button>
          )}

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

        <div className="flex items-center gap-3">
          {/* Game status info */}
          <div className="hidden sm:flex items-center gap-2 text-sm">
            {timeControl && (
              <>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">{timeControl.format?.toUpperCase()}</span>
                <span className="text-white/20">·</span>
              </>
            )}
            {gameMode && (
              <>
                <span className="font-mono text-white/40 text-xs">Move {Math.floor(moveHistory.length / 2) || 0}</span>
                <span className="text-white/20">·</span>
              </>
            )}
            {gameMode === 'ai' ? (
              <span className="text-[var(--player-color)] font-semibold text-xs">{isAiThinking ? 'Thinking...' : gameOver ? 'Game Over' : 'Your move'}</span>
            ) : gameMode === 'local' ? (
              <span className="text-[var(--player-color)] font-semibold text-xs">{gameOver ? 'Game Over' : `Turn: ${game.turn() === 'w' ? 'White' : 'Black'}`}</span>
            ) : gameMode?.includes('multiplayer') ? (
              <span className="text-cyan-400 font-semibold text-xs">
                {gameOver ? 'Game Over' : opponentOnline ? `vs ${mpOpponentName || 'Opponent'}` : 'Waiting for opponent...'}
              </span>
            ) : null}
          </div>

          {/* User profile badge */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-xs font-medium text-white/80 hidden sm:block max-w-[100px] truncate">{user?.name || 'Player'}</span>
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
                <button onClick={handleNewGame} className="game-btn primary"><Plus className="w-3 h-3"/> New Game</button>
                <button
                  onClick={undoMove}
                  disabled={moveHistory.length === 0 || isAiThinking || gameOver}
                  className="game-btn"
                  title="Undo last move"
                >
                  <Undo2 className="w-3 h-3"/> Back
                </button>
                <button onClick={() => setHintsEnabled(!hintsEnabled)} className={`game-btn ${hintsEnabled ? 'active' : ''}`}>Hints</button>
                <button onClick={() => setCommentaryEnabled(!commentaryEnabled)} className={`game-btn ${commentaryEnabled ? 'active' : ''}`}>Comm</button>
                <button onClick={handleToggleSound} className={`game-btn ${soundOn ? 'active' : ''}`} title="Toggle sound">
                  {soundOn ? <Volume2 className="w-3 h-3"/> : <VolumeX className="w-3 h-3"/>}
                </button>
                <button onClick={resign} className="game-btn danger">Resign</button>
                <div className="flex gap-1.5 ml-2">
                  <button
                    onClick={() => { setPlayerColor('w'); handleNewGame(); }}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${playerColor === 'w' ? 'bg-white text-gray-900 shadow' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                  >White</button>
                  <button
                    onClick={() => { setPlayerColor('b'); handleNewGame(); }}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all border border-white/20 ${playerColor === 'b' ? 'bg-gray-800 text-white shadow' : 'bg-white/5 text-white/60 hover:bg-white/20'}`}
                  >Black</button>
                </div>
              </>
            ) : gameMode === 'local' ? (
              <>
                <button onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); handleNewGame(); }} className="game-btn primary"><Plus className="w-3 h-3"/> New Game</button>
                <button
                  onClick={undoMove}
                  disabled={moveHistory.length === 0 || gameOver}
                  className="game-btn"
                  title="Undo last move"
                >
                  <Undo2 className="w-3 h-3"/> Back
                </button>
                <button onClick={() => setAutoFlipLocal(!autoFlipLocal)} className={`game-btn ${autoFlipLocal ? 'active' : ''}`} title="Auto-flip board on turn change">
                  <RotateCcw className="w-3 h-3"/> Auto Flip
                </button>
                {!autoFlipLocal && (
                  <button onClick={() => setManualFlip(!manualFlip)} className="game-btn" title="Flip board">
                    Flip
                  </button>
                )}
                <button onClick={handleToggleSound} className={`game-btn ${soundOn ? 'active' : ''}`} title="Toggle sound">
                  {soundOn ? <Volume2 className="w-3 h-3"/> : <VolumeX className="w-3 h-3"/>}
                </button>
                <button onClick={resign} className="game-btn danger">Resign</button>
              </>
            ) : (
              <>
                <button onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); handleNewGame(); }} className="game-btn primary"><Plus className="w-3 h-3"/> New Game</button>
                <button onClick={handleToggleSound} className={`game-btn ${soundOn ? 'active' : ''}`} title="Toggle sound">
                  {soundOn ? <Volume2 className="w-3 h-3"/> : <VolumeX className="w-3 h-3"/>}
                </button>
                {/* Abort: only before 2 moves */}
                {moveHistory.length < 2 && !gameOver && opponentOnline && (
                  <button onClick={mpAbortGame} className="game-btn" title="Abort game">
                    <X className="w-3 h-3"/> Abort
                  </button>
                )}
                {/* Takeback */}
                {moveHistory.length > 0 && !gameOver && (
                  <button
                    onClick={mpRequestTakeback}
                    disabled={mpTakebackSent}
                    className={`game-btn ${mpTakebackSent ? 'opacity-50' : ''}`}
                    title={mpTakebackSent ? 'Takeback requested...' : 'Request takeback'}
                  >
                    <Undo2 className="w-3 h-3"/> {mpTakebackSent ? 'Sent' : 'Takeback'}
                  </button>
                )}
                {/* Draw offer */}
                {moveHistory.length >= 2 && !gameOver && (
                  <button
                    onClick={mpOfferDraw}
                    disabled={mpDrawOfferSent}
                    className={`game-btn ${mpDrawOfferSent ? 'opacity-50' : ''}`}
                    title={mpDrawOfferSent ? 'Draw offer sent...' : 'Offer draw'}
                  >
                    <Handshake className="w-3 h-3"/> {mpDrawOfferSent ? 'Offered' : 'Draw'}
                  </button>
                )}
                {!gameOver && (
                  <button onClick={() => { resign(); multiplayerResign(); }} className="game-btn danger">
                    <Flag className="w-3 h-3"/> Resign
                  </button>
                )}
              </>
            )}
          </div>

          {/* Board + Clock row */}
          <div className="flex items-stretch justify-center w-full max-w-[min(calc(100vh-10rem),100%)] mx-auto">
            {/* Classic chess clock — left of board */}
            {timeControl && (
              <ChessClock
                whiteTime={whiteTime}
                blackTime={blackTime}
                activeTurn={game.turn()}
                gameStarted={gameStarted}
                gameOver={gameOver}
                playerColor={playerColor}
                timeControl={timeControl}
              />
            )}

            {/* Board */}
            <div className="relative flex-1 p-[6px]">
              <ChessBoard
                game={displayGame}
                flipped={
                  gameMode === 'local'
                    ? (autoFlipLocal && !isViewingHistory ? game.turn() === 'b' : manualFlip)
                    : playerColor === 'b'
                }
                selectedSquare={isViewingHistory ? null : selectedSquare}
                handleSquareClick={onSquareClick}
                lastMove={lastMoveObj}
                hintArrow={isViewingHistory ? null : hintArrow}
                pendingPromotion={pendingPromotion}
                premove={premove}
                onPromote={completePromotion}
                onCancelPromotion={cancelPromotion}
                playerColor={playerColor}
                gameMode={gameMode}
              />

              {/* Reviewing history indicator */}
              {isViewingHistory && !gameOver && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-[10px] font-bold text-amber-400 backdrop-blur-sm">
                  REVIEWING — Click board to return
                </div>
              )}

              {/* Waiting for opponent overlay */}
              {gameMode?.includes('multiplayer') && !opponentOnline && !gameOver && !mpGameAborted && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-40 rounded">
                  <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <div className="text-lg font-bold text-white/90 mb-1">Waiting for opponent</div>
                  <div className="text-xs text-white/50 mb-4">Share the room link to invite a friend</div>
                  {multiplayerRoomCode && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-cyan-400 tracking-widest">{multiplayerRoomCode}</span>
                      <button onClick={copyRoomCode} className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-white/70 transition-colors">
                        {colorCopied ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Game Aborted overlay */}
              {mpGameAborted && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded animate-in fade-in duration-300">
                  <div className="text-5xl mb-3">🚫</div>
                  <div className="font-display text-3xl font-bold text-amber-400 mb-2">Game Aborted</div>
                  <div className="text-sm text-white/70 text-center mb-6">The game was cancelled before it started.</div>
                  <button onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); handleNewGame(); }} className="game-btn primary px-8 py-2.5 text-sm">
                    <ArrowLeft className="w-3.5 h-3.5"/> Back to Menu
                  </button>
                </div>
              )}

              {/* Draw offer notification */}
              {mpDrawOffered && gameMode?.includes('multiplayer') && !gameOver && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-3 bg-amber-500/20 border border-amber-500/40 rounded-xl backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="text-sm font-bold text-amber-300 mb-2 text-center">
                    <Handshake className="w-4 h-4 inline mr-1" /> {mpOpponentName || 'Opponent'} offers a draw
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => mpRespondDraw(true)} className="px-4 py-1.5 bg-emerald-500/30 hover:bg-emerald-500/50 border border-emerald-500/50 rounded-lg text-xs font-bold text-emerald-300 transition-colors">
                      Accept
                    </button>
                    <button onClick={() => mpRespondDraw(false)} className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 rounded-lg text-xs font-bold text-red-300 transition-colors">
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Takeback request notification */}
              {mpTakebackRequested && gameMode?.includes('multiplayer') && !gameOver && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-3 bg-purple-500/20 border border-purple-500/40 rounded-xl backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="text-sm font-bold text-purple-300 mb-2 text-center">
                    <Undo2 className="w-4 h-4 inline mr-1" /> {mpOpponentName || 'Opponent'} wants to take back
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => mpRespondTakeback(true)} className="px-4 py-1.5 bg-emerald-500/30 hover:bg-emerald-500/50 border border-emerald-500/50 rounded-lg text-xs font-bold text-emerald-300 transition-colors">
                      Accept
                    </button>
                    <button onClick={() => mpRespondTakeback(false)} className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 rounded-lg text-xs font-bold text-red-300 transition-colors">
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {gameOver && !mpGameAborted && (() => {
                const rd = getResultDisplay();
                const isWin = gameResult?.winnerColor === playerColor;
                const isDraw = ['stalemate', 'repetition', 'insufficient', 'fifty-move', 'draw'].includes(gameResult?.type);
                const accentColor = isDraw ? 'text-amber-400' : isWin ? 'text-emerald-400' : 'text-red-400';
                const glowColor = isDraw ? 'drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]' : isWin ? 'drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]';
                const isMultiplayer = gameMode?.includes('multiplayer');
                return (
                  <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded animate-in fade-in duration-300">
                    <div className="text-5xl mb-3">{rd.icon}</div>
                    <div className={`font-display text-3xl font-bold ${accentColor} ${glowColor} mb-2`}>{rd.title}</div>
                    <div className="text-sm text-white/70 text-center max-w-[260px] mb-4">{rd.subtitle}</div>

                    {/* Rematch section for multiplayer */}
                    {isMultiplayer && !mpRematchRoomCode && (
                      <div className="mb-4 flex flex-col items-center gap-2">
                        {mpRematchOffered ? (
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-xs text-cyan-400">{mpOpponentName || 'Opponent'} wants a rematch!</span>
                            <button
                              onClick={mpOfferRematch}
                              className="game-btn primary px-6 py-2 text-sm animate-pulse"
                            >
                              <RefreshCw className="w-3.5 h-3.5"/> Accept Rematch
                            </button>
                            <button
                              onClick={mpDeclineRematch}
                              className="text-xs text-white/40 hover:text-white/70 transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={mpOfferRematch}
                            disabled={mpRematchOfferSent}
                            className={`game-btn px-6 py-2 text-sm ${mpRematchOfferSent ? 'opacity-60' : 'hover:border-cyan-500/50'}`}
                          >
                            <RefreshCw className="w-3.5 h-3.5"/>
                            {mpRematchOfferSent ? 'Waiting for opponent...' : 'Rematch'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Rematch accepted — go to new room */}
                    {isMultiplayer && mpRematchRoomCode && (
                      <div className="mb-4">
                        <button
                          onClick={() => {
                            // Navigate to rematch room
                            handleNewGame();
                            setMultiplayerRoomCode(mpRematchRoomCode);
                            // Swap colors for rematch
                            setPlayerColor(playerColor === 'w' ? 'b' : 'w');
                            setGameMode(gameMode === 'multiplayer_host' ? 'multiplayer_host' : 'multiplayer_guest');
                          }}
                          className="game-btn primary px-8 py-2.5 text-sm animate-pulse"
                        >
                          <RefreshCw className="w-3.5 h-3.5"/> Join Rematch
                        </button>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); handleNewGame(); }} className="game-btn px-6 py-2.5 text-sm">
                        <ArrowLeft className="w-3.5 h-3.5"/> Menu
                      </button>
                      {!isMultiplayer && (
                        <button onClick={handleNewGame} className="game-btn primary px-8 py-2.5 text-sm">Play Again</button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Mobile timers — shown below board on small screens when clock is hidden */}
          {timeControl && (
            <div className="flex md:hidden gap-2 mt-2 w-full max-w-[min(calc(100vh-10rem),100%)] mx-auto">
              <MobileClockFace
                time={playerColor === 'b' ? blackTime : whiteTime}
                isActive={gameStarted && !gameOver && game.turn() === (playerColor === 'b' ? 'b' : 'w')}
                label={playerColor === 'b' ? 'Black' : 'White'}
                piece={playerColor === 'b' ? '♚' : '♔'}
              />
              <MobileClockFace
                time={playerColor === 'b' ? whiteTime : blackTime}
                isActive={gameStarted && !gameOver && game.turn() === (playerColor === 'b' ? 'w' : 'b')}
                label={playerColor === 'b' ? 'White' : 'Black'}
                piece={playerColor === 'b' ? '♔' : '♚'}
              />
            </div>
          )}
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

          {/* Move History & Analysis */}
          <div className="glass-panel flex flex-col min-h-[120px] max-h-[280px] text-xs">
            <div className="panel-header bg-transparent border-b border-purple-500/20 text-purple-300 flex items-center gap-2 shrink-0">
              <span className="text-[14px]">📋</span> Moves
              {isViewingHistory && (
                <span className="ml-auto text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">REVIEWING</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-mono" ref={movesScrollRef}>
              {moveHistory.length === 0 ? (
                <div className="text-white/30 text-center py-3">No moves yet</div>
              ) : (
                <div className="grid grid-cols-[28px_1fr_1fr] gap-x-2 gap-y-0.5 items-center px-1">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
                    const whiteIdx = i * 2;
                    const blackIdx = i * 2 + 1;
                    const currentViewIdx = viewingMoveIndex === null ? moveHistory.length - 1 : viewingMoveIndex;
                    return (
                      <React.Fragment key={i}>
                        <span className="text-white/30">{i + 1}.</span>
                        <span
                          onClick={() => goToMove(whiteIdx)}
                          className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-white/10 ${
                            whiteIdx === currentViewIdx ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30' : 'text-white/80'
                          }`}
                        >
                          {moveHistory[whiteIdx]?.san}
                        </span>
                        {moveHistory[blackIdx] ? (
                          <span
                            onClick={() => goToMove(blackIdx)}
                            className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-white/10 ${
                              blackIdx === currentViewIdx ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30' : 'text-white/80'
                            }`}
                          >
                            {moveHistory[blackIdx].san}
                          </span>
                        ) : <span />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            {moveHistory.length > 0 && (
              <div className="flex items-center justify-center gap-1 px-2 py-1.5 border-t border-white/5 shrink-0">
                <button onClick={goToStart} disabled={viewingMoveIndex === -1} className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent transition-colors" title="First move (Home)">
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button onClick={goBack} disabled={viewingMoveIndex === -1} className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent transition-colors" title="Previous move (←)">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={goForward} disabled={viewingMoveIndex === null} className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent transition-colors" title="Next move (→)">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={goToEnd} disabled={viewingMoveIndex === null} className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent transition-colors" title="Current position (End)">
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
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
            <div className="glass-panel flex-1 flex flex-col min-h-[100px] overflow-hidden">
              {/* Header bar */}
              <div className="panel-header bg-transparent border-b border-cyan-500/20 text-cyan-300 flex items-center gap-2 shrink-0">
                <Swords className="w-3.5 h-3.5" /> Online Match
                {timeControl && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 font-bold ml-1">
                    {timeControl.label}
                  </span>
                )}
                <span className={`ml-auto text-[9px] normal-case px-2 py-0.5 rounded font-bold ${
                  opponentOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400 animate-pulse'
                }`}>
                  {opponentOnline ? 'LIVE' : 'WAITING'}
                </span>
              </div>

              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Player cards - compact */}
                <div className="p-2.5 flex flex-col gap-1.5 shrink-0">
                  {/* You */}
                  <div className="flex items-center gap-2.5 p-2 bg-white/5 border border-white/10 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-white/90 truncate">{user?.name || 'You'}</div>
                      <div className="text-[9px] text-white/40">{playerColor === 'w' ? '♔ White' : '♚ Black'}</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${mpConnected ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-red-500'}`} />
                  </div>

                  <div className="flex items-center gap-2 px-2">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[8px] font-bold text-white/20 tracking-widest">VS</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Opponent */}
                  <div className={`flex items-center gap-2.5 p-2 border rounded-lg transition-all ${
                    opponentOnline ? 'bg-white/5 border-white/10' : 'bg-amber-500/5 border-amber-500/20 border-dashed'
                  }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      opponentOnline ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white' : 'bg-white/5 border border-dashed border-white/20 text-white/30'
                    }`}>
                      {opponentOnline ? (mpOpponentName?.[0]?.toUpperCase() || '?') : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-white/90 truncate">
                        {opponentOnline ? (mpOpponentName || 'Opponent') : 'Waiting for friend...'}
                      </div>
                      <div className="text-[9px] text-white/40">
                        {opponentOnline ? (playerColor === 'w' ? '♚ Black' : '♔ White') : 'Share the room link'}
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      opponentOnline ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-amber-500 animate-pulse'
                    }`} />
                  </div>

                  {/* Room code + copy link (for host when waiting) */}
                  {gameMode === 'multiplayer_host' && !opponentOnline && (
                    <div className="p-2 bg-black/20 border border-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Room Code</span>
                        <button onClick={copyRoomCode} className="text-[9px] text-cyan-400/70 hover:text-cyan-400 transition-colors flex items-center gap-1">
                          {colorCopied ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy link</>}
                        </button>
                      </div>
                      <div className="text-center font-mono text-base font-black text-cyan-400 tracking-[0.3em]">{multiplayerRoomCode}</div>
                    </div>
                  )}

                  {/* Current turn indicator */}
                  {opponentOnline && !gameOver && (
                    <div className={`flex items-center justify-center gap-2 p-1.5 rounded-lg border transition-all ${
                      game.turn() === playerColor
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-white/5 border-white/10'
                    }`}>
                      <span className="text-[11px] text-white/60">
                        {game.turn() === playerColor ? 'Your turn' : `${mpOpponentName || 'Opponent'}'s turn`}
                      </span>
                      <span className="text-sm font-bold">{game.turn() === 'w' ? '♔' : '♚'}</span>
                    </div>
                  )}
                </div>

                {/* Chat area — lichess-style */}
                <div className="flex-1 flex flex-col border-t border-white/5 overflow-hidden">
                  <div className="px-2.5 py-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/30 font-bold shrink-0 border-b border-white/5">
                    <MessageCircle className="w-3 h-3" /> Chat
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                    {mpChatMessages.length === 0 ? (
                      <div className="text-[10px] text-white/20 text-center py-4">
                        {opponentOnline ? 'Say hello to your opponent!' : 'Chat will appear here'}
                      </div>
                    ) : (
                      mpChatMessages.map((msg, i) => {
                        const isMe = msg.userId === user?.id || msg.name === user?.name;
                        return (
                          <div key={i} className={`flex gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`text-[11px] px-2.5 py-1.5 rounded-lg max-w-[80%] ${
                              isMe
                                ? 'bg-cyan-500/15 border border-cyan-500/20 text-cyan-200'
                                : 'bg-white/5 border border-white/10 text-white/80'
                            }`}>
                              {!isMe && <span className="text-[9px] font-bold text-purple-400 block mb-0.5">{msg.name}</span>}
                              {msg.message}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={mpChatEndRef} />
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (mpChatInput.trim()) {
                        mpSendChat(mpChatInput);
                        setMpChatInput('');
                      }
                    }}
                    className="p-2 border-t border-white/5 flex gap-1.5 shrink-0"
                  >
                    <input
                      type="text"
                      value={mpChatInput}
                      onChange={e => setMpChatInput(e.target.value)}
                      placeholder="Type a message..."
                      maxLength={200}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-cyan-500/40 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!mpChatInput.trim()}
                      className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 transition-colors disabled:opacity-30"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
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
