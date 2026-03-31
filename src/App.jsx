import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
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
import GameAnalysis, { EvalBar } from './GameAnalysis';
<<<<<<< HEAD
import { ChevronDown, Settings, MessageSquare, Plus, BarChart3, LogOut, Copy, Check, Undo2, Clock, ArrowLeft, User, Swords, Wifi, WifiOff, Volume2, VolumeX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw, Flag, MessageCircle, Handshake, X, Send, RefreshCw, Crown, Sparkles } from 'lucide-react';

=======

import { ChevronDown, Settings, MessageSquare, Plus, BarChart3, LogOut, Copy, Check, Undo2, Clock, ArrowLeft, User, Swords, Wifi, WifiOff, Volume2, VolumeX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw, Flag, MessageCircle, Handshake, X, Send, RefreshCw, Crown, Sparkles } from 'lucide-react';
import LandingPage from "./LandingPage"
import AdminPanel from './AdminPanel';
>>>>>>> 548e95a (Added logo to landing page)
function ChessClock({ whiteTime, blackTime, activeTurn, gameStarted, gameOver, playerColor, timeControl }) {
  const isFlipped = playerColor === 'b';
  const topColor = isFlipped ? 'w' : 'b';
  const bottomColor = isFlipped ? 'b' : 'w';
  const topTime = topColor === 'w' ? whiteTime : blackTime;
  const bottomTime = bottomColor === 'w' ? whiteTime : blackTime;
  const topActive = gameStarted && !gameOver && activeTurn === topColor;
  const bottomActive = gameStarted && !gameOver && activeTurn === bottomColor;

  return (
    <div className="hidden md:flex flex-col w-[120px] lg:w-[140px] shrink-0 mr-3 select-none">
      <div
        className="flex-1 flex flex-col rounded-xl overflow-hidden"
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <ClockFace time={topTime} isActive={topActive} label={topColor === 'w' ? 'White' : 'Black'} />
        <div className="relative px-3">
          <div className="divider" />
          {timeControl && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap rounded-full"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-dim)', border: '1px solid var(--border-color)' }}
            >
              {timeControl.format}
            </div>
          )}
        </div>
        <ClockFace time={bottomTime} isActive={bottomActive} label={bottomColor === 'w' ? 'White' : 'Black'} />
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <Clock className="w-3 h-3" style={{ color: 'var(--text-dim)' }} />
        <span className="text-[10px] font-semibold" style={{ color: 'var(--text-dim)' }}>{timeControl?.label}</span>
      </div>
    </div>
  );
}

function ClockFace({ time, isActive, label }) {
  const isLow = time < 30;
  const isCritical = time < 10;
  return (
    <div className={`flex-1 flex flex-col items-center justify-center py-4 px-2 transition-all duration-300 ${isActive ? 'clock-active' : 'clock-inactive'}`}>
      <span className="text-[10px] uppercase tracking-[0.15em] font-bold mb-2" style={{ color: isActive ? 'var(--text-secondary)' : 'var(--text-dim)' }}>
        {label}
      </span>
      <div
        className={`font-mono font-black tabular-nums tracking-tight text-2xl lg:text-3xl ${isCritical && isActive ? 'clock-critical' : isLow && isActive ? 'clock-low' : ''}`}
        style={{
          color: isCritical && isActive ? 'var(--danger)' : isLow && isActive ? 'var(--warning)' : isActive ? 'var(--text-primary)' : 'var(--text-dim)'
        }}
      >
        {formatTime(time)}
      </div>
      {isActive && (
        <div className="w-1.5 h-1.5 rounded-full mt-2" style={{
          background: isCritical ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)',
          boxShadow: `0 0 8px ${isCritical ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)'}`
        }} />
      )}
    </div>
  );
}

function MobileClockFace({ time, isActive, label, piece }) {
  const isLow = time < 30;
  const isCritical = time < 10;
  return (
    <div
      className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
      style={{
        background: isActive ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border: `1px solid ${isActive ? 'var(--border-hover)' : 'var(--border-subtle)'}`,
        boxShadow: isActive ? '0 0 12px rgba(16, 185, 129, 0.05)' : 'none',
      }}
    >
      <span className="text-lg" style={{ color: 'var(--text-secondary)' }}>{piece}</span>
      <div className="flex flex-col">
        <span className="text-[9px] uppercase tracking-[0.1em] font-bold leading-none" style={{ color: 'var(--text-dim)' }}>{label}</span>
        <span
          className={`font-mono text-xl font-black tabular-nums leading-tight ${isCritical && isActive ? 'clock-critical' : isLow && isActive ? 'clock-low' : ''}`}
          style={{
            color: isCritical && isActive ? 'var(--danger)' : isLow && isActive ? 'var(--warning)' : isActive ? 'var(--text-primary)' : 'var(--text-dim)'
          }}
        >
          {formatTime(time)}
        </span>
      </div>
      {isActive && (
        <div className="w-1.5 h-1.5 rounded-full ml-auto" style={{ background: isCritical ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)' }} />
      )}
    </div>
  );
}

function getSavedMpSession() {
  try {
    const saved = sessionStorage.getItem('chess_mp_session');
    if (saved) {
      const s = JSON.parse(saved);
      if (s.roomCode && s.gameMode) return s;
    }
  } catch (e) { /* ignore */ }
  return null;
}

function GameView({ onAdminClick }) {
  const { user, logout, token } = useAuth();
  const savedSession = useRef(getSavedMpSession()).current;
  const [showDashboard, setShowDashboard] = useState(false);
  const [showGameMode, setShowGameMode] = useState(!savedSession);
  const [gameMode, setGameMode] = useState(savedSession?.gameMode || null);
  const [multiplayerRoomCode, setMultiplayerRoomCode] = useState(savedSession?.roomCode || null);
  const [multiplayerOpponent, setMultiplayerOpponent] = useState(savedSession?.opponentName ? { name: savedSession.opponentName } : null);
  const [colorCopied, setColorCopied] = useState(false);
  const [activePlayerId, setActivePlayerId] = useState(PLAYER_ORDER[0]);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [commentaryEnabled, setCommentaryEnabled] = useState(true);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [autoJoinRoomCode, setAutoJoinRoomCode] = useState(null);
  const [timeControl, setTimeControl] = useState(savedSession?.timeControl || null);
  const [autoFlipLocal, setAutoFlipLocal] = useState(true);
  const [manualFlip, setManualFlip] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisEval, setAnalysisEval] = useState(null);
  const { playSound, enabledRef: soundEnabledRef } = useChessSound();
  const movesScrollRef = useRef(null);
  const isReplayingRef = useRef(false);

  const currentPlayer = PLAYERS[activePlayerId];

  // Presence socket — reports game mode to server for admin live tracking
  const presenceSocketRef = useRef(null);
  useEffect(() => {
    if (!token || !user?.id) return;
    const socket = io('/', { auth: { token } });
    presenceSocketRef.current = socket;
    return () => { socket.disconnect(); presenceSocketRef.current = null; };
  }, [token, user?.id]);

  useEffect(() => {
    const socket = presenceSocketRef.current;
    if (!socket) return;
    const emitPresence = () => {
      socket.emit('setPresence', {
        mode: gameMode || 'idle',
        userName: user?.name,
        opponent: gameMode === 'ai' ? currentPlayer?.name : undefined,
      });
    };
    if (socket.connected) {
      emitPresence();
    } else {
      socket.once('connect', emitPresence);
    }
  }, [gameMode, currentPlayer?.name, user?.name]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('roomCode');
    if (roomCode) {
      setAutoJoinRoomCode(roomCode);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const {
    game, fen, moveHistory, gameOver, gameResult, captured, isAiThinking,
    playerColor, setPlayerColor, handleSquareClick, resetGame, undoMove, hintArrow, resign, forceGameOver, forceGameOverStructured, makeExternalMove, loadGameFromMoves,
    viewingGame, viewingMoveIndex, isViewingHistory, goToMove, goBack, goForward, goToStart, goToEnd,
    pendingPromotion, premove, completePromotion, cancelPromotion
  } = useChessLogic(currentPlayer, hintsEnabled, gameMode);

  useEffect(() => {
    if (savedSession?.playerColor) setPlayerColor(savedSession.playerColor);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const gameStarted = moveHistory.length > 0;
  const { whiteTime, blackTime, isTimedOut, timedOutColor, resetTimers, syncTime } = useChessTimer(timeControl, game.turn(), gameStarted, gameOver);

  useEffect(() => {
    if (isTimedOut && timedOutColor && !gameOver) {
      const winnerColor = timedOutColor === 'w' ? 'b' : 'w';
      forceGameOverStructured({ type: 'timeout', winnerColor, loserColor: timedOutColor });
    }
  }, [isTimedOut, timedOutColor, gameOver, forceGameOverStructured]);

  const { messages, isStreaming, isConnected, sendMessageStream, getAutoCommentary, announceMatch, commentOnGameOver } = useGemini(currentPlayer);

  const handleOpponentMove = useCallback((data) => {
    if (data.san) makeExternalMove(data.san);
  }, [makeExternalMove]);

  const handleGameEnded = useCallback((data) => {
    try { sessionStorage.removeItem('chess_mp_session'); } catch (e) { /* ignore */ }
    if (data.result === 'opponent_resigned') {
      forceGameOverStructured({ type: 'opponent_resigned', winnerColor: playerColor });
    } else if (data.result === 'aborted' || data.reason === 'abort') {
    } else if (data.reason === 'agreement') {
      forceGameOverStructured({ type: 'draw' });
    } else if (data.reason === 'timeout') {
      const hostWon = data.result === 'hostWin';
      const winnerColor = hostWon ? 'w' : 'b';
      forceGameOverStructured({ type: 'timeout', winnerColor, loserColor: winnerColor === 'w' ? 'b' : 'w' });
    } else if (data.reason === 'draw') {
      forceGameOverStructured({ type: 'draw' });
    }
  }, [forceGameOverStructured, playerColor]);

  const handleGameSync = useCallback((data) => {
    if (data.hostColor && gameMode === 'multiplayer_host') setPlayerColor(data.hostColor);
    else if (data.guestColor && gameMode === 'multiplayer_guest') setPlayerColor(data.guestColor);
    if (data.timeControl?.initialTime && !timeControl) setTimeControl(data.timeControl);
    if (data.moves && data.moves.length > 0 && moveHistory.length === 0 && !data.isTakeback) {
      isReplayingRef.current = true;
      loadGameFromMoves(data.moves);
      setTimeout(() => { isReplayingRef.current = false; }, 0);
    }
    if (data.isTakeback && data.moves) {
      isReplayingRef.current = true;
      loadGameFromMoves(data.moves);
      setTimeout(() => { isReplayingRef.current = false; }, 0);
    }
  }, [gameMode, timeControl, moveHistory.length, loadGameFromMoves]);

  const {
    sendMove, resign: multiplayerResign, connected: mpConnected, opponentOnline, opponentName: mpOpponentName, setOpponentName: setMpOpponentName,
    chatMessages: mpChatMessages, sendChat: mpSendChat,
    drawOffered: mpDrawOffered, drawOfferSent: mpDrawOfferSent, offerDraw: mpOfferDraw, respondDraw: mpRespondDraw,
    rematchOffered: mpRematchOffered, rematchOfferSent: mpRematchOfferSent, rematchRoomCode: mpRematchRoomCode,
    offerRematch: mpOfferRematch, declineRematch: mpDeclineRematch,
    takebackRequested: mpTakebackRequested, takebackSent: mpTakebackSent,
    requestTakeback: mpRequestTakeback, respondTakeback: mpRespondTakeback,
    abortGame: mpAbortGame, gameAborted: mpGameAborted,
    serverWhiteTime: mpServerWhiteTime, serverBlackTime: mpServerBlackTime, roomTimeControl: mpRoomTimeControl,
  } = useMultiplayer(multiplayerRoomCode, user?.id, token, handleOpponentMove, handleGameEnded, handleGameSync);
  const [mpChatInput, setMpChatInput] = useState('');

  useEffect(() => {
    if (!gameMode?.includes('multiplayer') || !multiplayerRoomCode) return;
    try {
      sessionStorage.setItem('chess_mp_session', JSON.stringify({
        roomCode: multiplayerRoomCode, gameMode, playerColor,
        opponentName: mpOpponentName || multiplayerOpponent?.name || null,
        timeControl: timeControl || null,
      }));
    } catch (e) { /* ignore */ }
  }, [gameMode, multiplayerRoomCode, playerColor, timeControl, mpOpponentName]);

  useEffect(() => {
    if (gameMode?.includes('multiplayer') && mpServerWhiteTime !== null && mpServerBlackTime !== null) {
      syncTime(mpServerWhiteTime, mpServerBlackTime);
    }
  }, [mpServerWhiteTime, mpServerBlackTime, gameMode, syncTime]);

  useEffect(() => {
    if (isReplayingRef.current) return;
    const lastMove = moveHistory[moveHistory.length - 1];
    if (lastMove && gameMode && gameMode.includes('multiplayer')) {
      if (lastMove.color === playerColor) sendMove(lastMove.san, fen, lastMove.san);
    }
  }, [moveHistory.length, gameMode, playerColor, sendMove, fen]);

  const chatEndRef = useRef(null);
  const mpChatEndRef = useRef(null);
  const gameSavedRef = useRef(false);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isStreaming]);
  useEffect(() => { mpChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mpChatMessages]);

  const classifyMove = (move, moveIndex) => {
    let moveType = 'strategic';
    let accuracy = 75 + Math.random() * 20;
    if (move.captured) { moveType = 'tactical'; accuracy = 80 + Math.random() * 20; }
    else if (move.san.includes('+')) { moveType = 'tactical'; accuracy = 85 + Math.random() * 15; }
    else if (move.san.includes('#')) { moveType = 'best'; accuracy = 100; }
    else { const baseAccuracy = 70 + (moveIndex * 0.5); accuracy = Math.min(95, baseAccuracy + Math.random() * 15); }
    if (Math.random() < 0.05) { moveType = 'blunder'; accuracy = Math.round(Math.random() * 30); }
    return { moveType, accuracy: Math.round(accuracy) };
  };

  useEffect(() => {
    if (!gameOver) gameSavedRef.current = false;
    else if (gameOver && gameMode?.includes('multiplayer')) {
      try { sessionStorage.removeItem('chess_mp_session'); } catch (e) { /* ignore */ }
    }
  }, [gameOver]);

  useEffect(() => {
    if (gameOver && token && !gameSavedRef.current) {
      gameSavedRef.current = true;
      const movesFormatted = moveHistory.map((m, i) => {
        const classification = classifyMove(m, i);
        return { moveNumber: i + 1, san: m.san, fen: m.after || game.fen(), color: m.color, moveType: classification.moveType, accuracy: classification.accuracy };
      });
      let resultStr = 'draw';
      if (gameResult && typeof gameResult === 'object') {
        const r = gameResult;
        if (r.type === 'checkmate' || r.type === 'timeout' || r.type === 'opponent_resigned') resultStr = r.winnerColor === playerColor ? 'win' : 'loss';
        else if (r.type === 'resign') resultStr = 'loss';
        else resultStr = 'draw';
      } else if (typeof gameResult === 'string') {
        if (gameResult.includes('Win') && !gameResult.includes('Opponent')) resultStr = 'win';
        else if (gameResult.includes('resigned') || gameResult.includes('defeated')) resultStr = 'loss';
        else resultStr = 'draw';
      }
      const gameData = {
        opponent: gameMode === 'ai' ? currentPlayer.name : (multiplayerOpponent?.name || 'Local Player'),
        opponentElo: gameMode === 'ai' ? currentPlayer.elo : 1200,
        playerColor, result: resultStr, moves: movesFormatted, duration: 300, openingName: 'Standard Opening'
      };
      fetch('/api/games/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(gameData)
      }).then(res => res.ok ? res.json() : null).catch(() => { });
    }
  }, [gameOver, gameResult, token]);

  useEffect(() => {
    if (moveHistory.length === 0 || !soundEnabledRef.current) return;
    playSound(moveHistory[moveHistory.length - 1]);
  }, [moveHistory.length]);

  useEffect(() => {
    if (gameOver && soundEnabledRef.current && gameResult && gameResult.type !== 'checkmate') playSound('gameEnd');
  }, [gameOver]);

  const handleToggleSound = () => { setSoundOn(prev => { soundEnabledRef.current = !prev; return !prev; }); };

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

  useEffect(() => {
    if (movesScrollRef.current) {
      if (viewingMoveIndex === null) movesScrollRef.current.scrollTop = movesScrollRef.current.scrollHeight;
    }
  }, [moveHistory.length, viewingMoveIndex]);

  const handlePlayAI = (tc) => { setTimeControl(tc || null); setGameMode('ai'); setShowGameMode(false); setMultiplayerRoomCode(null); };
  const handleLocalStart = (tc) => { setTimeControl(tc || null); setGameMode('local'); setShowGameMode(false); setMultiplayerRoomCode(null); setPlayerColor('w'); };
  const handleMultiplayerStart = (mode, roomCode, data = null) => {
    setMultiplayerRoomCode(roomCode);
    let gm, pc;
    if (mode === 'host') {
      gm = 'multiplayer_host'; pc = 'w'; setGameMode(gm); setPlayerColor(pc);
    } else {
      gm = 'multiplayer_guest'; setGameMode(gm); setMultiplayerOpponent(data?.host);
      if (data?.host?.name) setMpOpponentName(data.host.name);
      const color = data?.guestColor;
      pc = color === 'w' || color === 'white' ? 'w' : 'b';
      setPlayerColor(pc);
      if (data?.timeControl?.initialTime) setTimeControl(data.timeControl);
    }
    setShowGameMode(false);
    try {
      sessionStorage.setItem('chess_mp_session', JSON.stringify({
        roomCode, gameMode: gm, playerColor: pc,
        opponentName: data?.host?.name || null, timeControl: data?.timeControl || null,
      }));
    } catch (e) { /* ignore */ }
  };

  const handleNewGame = () => { resetGame(); resetTimers(); setShowAnalysis(false); setAnalysisEval(null); try { sessionStorage.removeItem('chess_mp_session'); } catch (e) { /* ignore */ } };
  const copyRoomCode = async () => {
    const shareLink = `${window.location.origin}${window.location.pathname}?roomCode=${multiplayerRoomCode}`;
    await navigator.clipboard.writeText(shareLink);
    setColorCopied(true); setTimeout(() => setColorCopied(false), 2000);
  };

  const matchAnnouncedRef = useRef(false);
  useEffect(() => {
    if (gameMode === 'ai' && commentaryEnabled && moveHistory.length === 0 && !gameOver) {
      const timer = setTimeout(() => {
        const colorLabel = playerColor === 'w' ? 'White' : 'Black';
        announceMatch(currentPlayer.name, currentPlayer.elo, colorLabel, fen);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [gameMode, commentaryEnabled, moveHistory.length === 0, currentPlayer?.id]);

  const gameOverCommentedRef = useRef(false);
  useEffect(() => {
    if (!gameOver) { gameOverCommentedRef.current = false; return; }
    if (gameMode === 'ai' && gameOver && gameResult && commentaryEnabled && !gameOverCommentedRef.current) {
      gameOverCommentedRef.current = true;
      const rd = getResultDisplay();
      commentOnGameOver(`${rd.title} ${rd.subtitle}`, fen, moveHistory.length);
    }
  }, [gameOver, gameResult, gameMode]);

  useEffect(() => {
    if (gameMode !== 'ai' || moveHistory.length === 0 || !commentaryEnabled || gameOver) return;
    const lastMove = moveHistory[moveHistory.length - 1];
    const moveNum = moveHistory.length;
    let context = '';
    const who = lastMove.color === playerColor ? 'The player' : currentPlayer.name;
    if (lastMove.captured) { const pieceNames = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }; context += `${who} captured a ${pieceNames[lastMove.captured] || lastMove.captured} on ${lastMove.to}. `; }
    if (lastMove.san.includes('#')) context += 'CHECKMATE! ';
    else if (lastMove.san.includes('+')) context += 'Check! ';
    if (lastMove.san === 'O-O' || lastMove.san === 'O-O-O') context += `${who} just castled. `;
    if (lastMove.promotion) context += `PAWN PROMOTION to ${lastMove.promotion}! `;
    const isExciting = lastMove.captured || lastMove.san.includes('+') || lastMove.san.includes('#') || lastMove.promotion || lastMove.san === 'O-O' || lastMove.san === 'O-O-O';
    const shouldComment = isExciting || Math.random() < 0.5;
    if (shouldComment) getAutoCommentary(fen, moveNum, lastMove.san, context);
  }, [moveHistory.length, gameMode]);

  const onSquareClick = useCallback((sq, currentSelected) => {
    if (isViewingHistory && !showAnalysis) { goToEnd(); return; }
    if (gameMode?.includes('multiplayer') && !opponentOnline) return;
    const result = handleSquareClick(sq, currentSelected);
    if (result !== undefined) setSelectedSquare(result);
  }, [handleSquareClick, gameMode, opponentOnline, isViewingHistory]);

  const handlePlayerSelect = (id) => { setActivePlayerId(id); setShowPlayerDropdown(false); if (gameMode === 'ai') handleNewGame(); };

  const getResultDisplay = () => {
    if (!gameResult) return { title: 'Game Over', subtitle: '', icon: '' };
    if (typeof gameResult === 'string') return { title: 'Game Over', subtitle: gameResult, icon: '' };
    const r = gameResult;
    const getPlayerName = (color) => {
      if (gameMode === 'ai') return color === playerColor ? (user?.name || 'You') : currentPlayer.name;
      else if (gameMode === 'local') return color === 'w' ? 'White' : 'Black';
      else return color === playerColor ? (user?.name || 'You') : (mpOpponentName || 'Opponent');
    };
    const youWon = r.winnerColor === playerColor;
    const winnerName = r.winnerColor ? getPlayerName(r.winnerColor) : null;
    const loserName = r.winnerColor ? getPlayerName(r.winnerColor === 'w' ? 'b' : 'w') : null;
    switch (r.type) {
      case 'checkmate': {
        if (gameMode === 'local') return { title: 'Checkmate!', subtitle: `${winnerName} defeated ${loserName}`, icon: '' };
        return { title: youWon ? 'Victory!' : 'Defeat', subtitle: youWon ? `You defeated ${loserName}` : `${winnerName} won by checkmate`, icon: youWon ? 'crown' : '' };
      }
      case 'stalemate': return { title: 'Stalemate', subtitle: 'No legal moves — draw.', icon: 'draw' };
      case 'repetition': return { title: 'Draw', subtitle: 'Threefold repetition.', icon: 'draw' };
      case 'insufficient': return { title: 'Draw', subtitle: 'Insufficient material.', icon: 'draw' };
      case 'fifty-move': return { title: 'Draw', subtitle: '50-move rule.', icon: 'draw' };
      case 'draw': return { title: 'Draw', subtitle: 'Game ended in a draw.', icon: 'draw' };
      case 'resign': {
        const resignerColor = r.loserColor;
        const resignerName = getPlayerName(resignerColor);
        const otherName = getPlayerName(resignerColor === 'w' ? 'b' : 'w');
        if (gameMode === 'local') return { title: 'Resignation', subtitle: `${resignerName} resigned. ${otherName} wins!`, icon: '' };
        return { title: resignerColor === playerColor ? 'You Resigned' : 'Opponent Resigned', subtitle: resignerColor === playerColor ? `${otherName} wins!` : 'You win!', icon: resignerColor !== playerColor ? 'crown' : '' };
      }
      case 'opponent_resigned': return { title: 'Opponent Resigned', subtitle: `${mpOpponentName || 'Opponent'} resigned. You win!`, icon: 'crown' };
      case 'timeout': {
        if (gameMode === 'local') return { title: "Time's Up!", subtitle: `${loserName} ran out of time. ${winnerName} wins!`, icon: '' };
        const youTimedOut = r.loserColor === playerColor;
        return { title: "Time's Up!", subtitle: youTimedOut ? `You ran out of time.` : `${loserName} flagged. You win!`, icon: youTimedOut ? '' : 'crown' };
      }
      default: return { title: 'Game Over', subtitle: '', icon: '' };
    }
  };

  const submitChat = (e) => { e.preventDefault(); if (!chatInput.trim() || isStreaming) return; sendMessageStream(chatInput, fen); setChatInput(''); };
  const displayGame = viewingGame || game;
  const lastMoveObj = isViewingHistory ? (viewingMoveIndex >= 0 ? moveHistory[viewingMoveIndex] : null) : moveHistory[moveHistory.length - 1];

  return (
    <div style={{ '--player-color': currentPlayer.color }} className="flex flex-col min-h-screen">
      <header
        className="relative z-50 h-[52px] px-4 flex items-center justify-between shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(18, 18, 28, 0.95), rgba(10, 10, 15, 0.98))',
          borderBottom: '1px solid var(--border-color)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{
              background: 'linear-gradient(135deg, var(--accent), #059669)',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.2)',
            }}>
              &#9822;
            </div>
            <span className="text-sm font-black hidden sm:block tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Chess<span style={{ color: 'var(--accent)' }}>Legends</span>
            </span>
          </div>

          {gameMode && (
            <button
              onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); handleNewGame(); }}
              className="btn btn-sm"
              title="Back to menu"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Menu</span>
            </button>
          )}

          {gameMode && gameMode.includes('multiplayer') && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Room:</span>
              <span className="font-mono font-black tracking-wider" style={{ color: 'var(--accent)' }}>{multiplayerRoomCode}</span>
              <button onClick={copyRoomCode} className="ml-0.5 p-0.5 rounded transition-colors" style={{ color: 'var(--text-muted)' }}>
                {colorCopied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          )}

          <div className="relative">
            {gameMode === 'ai' && (
              <button onClick={() => setShowPlayerDropdown(!showPlayerDropdown)} className="btn btn-sm gap-2">
                <span className="font-bold" style={{ color: currentPlayer.color }}>{currentPlayer.avatar}</span>
                <span className="hidden xs:inline text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{currentPlayer.name}</span>
                <span className="hidden xs:inline text-[10px] font-mono font-bold" style={{ color: 'var(--text-muted)' }}>{currentPlayer.elo}</span>
                <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-dim)' }} />
              </button>
            )}
            {showPlayerDropdown && gameMode === 'ai' && (
              <div
                className="absolute top-[calc(100%+8px)] left-0 w-[280px] rounded-xl overflow-hidden z-50"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(16px)',
                  animation: 'dropdownIn 0.2s ease'
                }}
              >
                <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  Choose Opponent
                </div>
                <div className="py-1">
                  {PLAYER_ORDER.map(id => {
                    const p = PLAYERS[id];
                    const active = id === activePlayerId;
                    return (
                      <div
                        key={id}
                        onClick={() => handlePlayerSelect(id)}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-150"
                        style={{
                          background: active ? 'var(--accent-muted)' : 'transparent',
                          borderLeft: `3px solid ${active ? 'var(--accent)' : 'transparent'}`
                        }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0" style={{ color: p.color, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
                          {p.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{p.country} {p.name}</div>
                          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.title}</div>
                        </div>
                        <span className="text-[10px] font-black font-mono" style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }}>{p.elo}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black" style={{ background: 'linear-gradient(135deg, var(--accent), #059669)', color: '#fff' }}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-[11px] font-semibold hidden sm:block max-w-[80px] truncate" style={{ color: 'var(--text-secondary)' }}>{user?.name || 'Player'}</span>
          </div>

          <button onClick={() => setShowDashboard(true)} className="btn btn-sm" title="Stats">
            <BarChart3 className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
            <span className="hidden sm:inline">Stats</span>
          </button>

          {onAdminClick && (
            <button
              onClick={onAdminClick}
              className="btn btn-sm"
              title="Admin Panel"
              style={{ color: '#dc2626' }}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          <button
            onClick={() => { logout(); setGameMode(null); setMultiplayerRoomCode(null); }}
            className="btn btn-sm"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
          </button>

          {gameMode === 'ai' && (
            <div className={`status-dot ${isConnected ? 'status-online' : 'status-waiting'}`} />
          )}
        </div>
      </header>

      <main className="relative z-10 w-full flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 30% 30%, rgba(16, 185, 129, 0.02) 0%, transparent 60%)',
        }} />

        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 lg:p-5 min-w-0 overflow-y-auto relative z-10">
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3 shrink-0">
            {gameMode === 'ai' ? (
              <>
                <button onClick={handleNewGame} className="btn btn-primary btn-sm"><Plus className="w-3 h-3" /> New Game</button>
                <button onClick={undoMove} disabled={moveHistory.length === 0 || isAiThinking || gameOver} className="btn btn-sm"><Undo2 className="w-3 h-3" /> Back</button>
                <button onClick={() => setHintsEnabled(!hintsEnabled)} className={`btn btn-sm ${hintsEnabled ? 'btn-active' : ''}`}>Hints</button>
                <button onClick={() => setCommentaryEnabled(!commentaryEnabled)} className={`btn btn-sm ${commentaryEnabled ? 'btn-active' : ''}`}>Comm</button>
                <button onClick={handleToggleSound} className={`btn btn-sm ${soundOn ? 'btn-active' : ''}`} title="Toggle sound">
                  {soundOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                </button>
                <button onClick={resign} className="btn btn-danger btn-sm"><Flag className="w-3 h-3" /> Resign</button>
                <div className="flex gap-1 ml-1.5">
                  <button onClick={() => { setPlayerColor('w'); handleNewGame(); }} className="btn btn-sm" style={{
                    background: playerColor === 'w' ? '#f0ece4' : 'var(--bg-elevated)', color: playerColor === 'w' ? '#2a2520' : 'var(--text-muted)',
                    borderColor: playerColor === 'w' ? '#d4cfc5' : 'var(--border-color)', fontWeight: 700
                  }}>White</button>
                  <button onClick={() => { setPlayerColor('b'); handleNewGame(); }} className="btn btn-sm" style={{
                    background: playerColor === 'b' ? '#3d3529' : 'var(--bg-elevated)', color: playerColor === 'b' ? '#e8dcc8' : 'var(--text-muted)',
                    borderColor: playerColor === 'b' ? '#5a4f42' : 'var(--border-color)', fontWeight: 700
                  }}>Black</button>
                </div>
              </>
            ) : gameMode === 'local' ? (
              <>
                <button onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); handleNewGame(); }} className="btn btn-primary btn-sm"><Plus className="w-3 h-3" /> New Game</button>
                <button onClick={undoMove} disabled={moveHistory.length === 0 || gameOver} className="btn btn-sm"><Undo2 className="w-3 h-3" /> Back</button>
                <button onClick={() => setAutoFlipLocal(!autoFlipLocal)} className={`btn btn-sm ${autoFlipLocal ? 'btn-active' : ''}`}><RotateCcw className="w-3 h-3" /> Auto Flip</button>
                {!autoFlipLocal && (<button onClick={() => setManualFlip(!manualFlip)} className="btn btn-sm">Flip</button>)}
                <button onClick={handleToggleSound} className={`btn btn-sm ${soundOn ? 'btn-active' : ''}`}>{soundOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}</button>
                <button onClick={resign} className="btn btn-danger btn-sm"><Flag className="w-3 h-3" /> Resign</button>
              </>
            ) : (
              <>
                <button onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); handleNewGame(); }} className="btn btn-primary btn-sm"><Plus className="w-3 h-3" /> New</button>
                <button onClick={handleToggleSound} className={`btn btn-sm ${soundOn ? 'btn-active' : ''}`}>{soundOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}</button>
                {moveHistory.length < 2 && !gameOver && opponentOnline && (<button onClick={mpAbortGame} className="btn btn-sm"><X className="w-3 h-3" /> Abort</button>)}
                {moveHistory.length > 0 && !gameOver && (
                  <button onClick={mpRequestTakeback} disabled={mpTakebackSent} className={`btn btn-sm ${mpTakebackSent ? 'opacity-50' : ''}`}><Undo2 className="w-3 h-3" /> {mpTakebackSent ? 'Sent' : 'Takeback'}</button>
                )}
                {moveHistory.length >= 2 && !gameOver && (
                  <button onClick={mpOfferDraw} disabled={mpDrawOfferSent} className={`btn btn-sm ${mpDrawOfferSent ? 'opacity-50' : ''}`}><Handshake className="w-3 h-3" /> {mpDrawOfferSent ? 'Offered' : 'Draw'}</button>
                )}
                {!gameOver && (<button onClick={() => { resign(); multiplayerResign(); }} className="btn btn-danger btn-sm"><Flag className="w-3 h-3" /> Resign</button>)}
              </>
            )}
          </div>

          {/* Board + Clock */}
          <div className="flex items-stretch justify-center w-full max-w-[min(calc(100vh-10rem),100%)] mx-auto">
            {timeControl && (
              <ChessClock whiteTime={whiteTime} blackTime={blackTime} activeTurn={game.turn()} gameStarted={gameStarted} gameOver={gameOver} playerColor={playerColor} timeControl={timeControl} />
            )}
            {showAnalysis && (
              <EvalBar whitePercent={analysisEval?.whitePercent ?? 50} evalText={analysisEval?.evalText ?? '0.0'} flipped={playerColor === 'b'} />
            )}

            <div className="relative flex-1" style={{ border: '1px solid #302e2b', borderRadius: '6px', padding: '2px' }}>
              <ChessBoard
                game={displayGame}
                flipped={gameMode === 'local' ? (autoFlipLocal && !isViewingHistory ? game.turn() === 'b' : manualFlip) : playerColor === 'b'}
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

              {/* Reviewing indicator */}
              {isViewingHistory && !gameOver && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full text-[10px] font-bold" style={{
                  background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'var(--warning)'
                }}>
                  REVIEWING -- Click board to return
                </div>
              )}

              {/* Waiting for opponent */}
              {gameMode?.includes('multiplayer') && !opponentOnline && !gameOver && !mpGameAborted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-40 rounded-md" style={{ background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(4px)' }}>
                  <div className="w-10 h-10 rounded-full animate-spin mb-4" style={{ border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
                  <div className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Waiting for opponent</div>
                  <div className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Share the room link to invite a friend</div>
                  {multiplayerRoomCode && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black tracking-[0.2em]" style={{ color: 'var(--accent)' }}>{multiplayerRoomCode}</span>
                      <button onClick={copyRoomCode} className="btn btn-sm">{colorCopied ? 'Copied!' : 'Copy Link'}</button>
                    </div>
                  )}
                </div>
              )}

              {/* Game Aborted */}
              {mpGameAborted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-50 rounded-md" style={{ background: 'rgba(10, 10, 15, 0.92)', backdropFilter: 'blur(8px)', animation: 'fadeInScale 0.3s ease' }}>
                  <div className="text-2xl font-black mb-2" style={{ color: 'var(--warning)' }}>Game Aborted</div>
                  <div className="text-sm text-center mb-5" style={{ color: 'var(--text-muted)' }}>The game was cancelled before it started.</div>
                  <button onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); handleNewGame(); }} className="btn btn-primary"><ArrowLeft className="w-3.5 h-3.5" /> Back to Menu</button>
                </div>
              )}

              {/* Draw offer notification */}
              {mpDrawOffered && gameMode?.includes('multiplayer') && !gameOver && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-xl" style={{
                  background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', animation: 'fadeInScale 0.2s ease'
                }}>
                  <div className="text-sm font-bold mb-2 text-center" style={{ color: 'var(--warning)' }}>
                    <Handshake className="w-4 h-4 inline mr-1" /> {mpOpponentName || 'Opponent'} offers a draw
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => mpRespondDraw(true)} className="btn btn-sm" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: 'var(--success)' }}>Accept</button>
                    <button onClick={() => mpRespondDraw(false)} className="btn btn-sm" style={{ background: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)', color: 'var(--danger)' }}>Decline</button>
                  </div>
                </div>
              )}

              {/* Takeback request */}
              {mpTakebackRequested && gameMode?.includes('multiplayer') && !gameOver && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-xl" style={{
                  background: 'rgba(212, 168, 67, 0.08)', border: '1px solid rgba(212, 168, 67, 0.2)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', animation: 'fadeInScale 0.2s ease'
                }}>
                  <div className="text-sm font-bold mb-2 text-center" style={{ color: 'var(--gold)' }}>
                    <Undo2 className="w-4 h-4 inline mr-1" /> {mpOpponentName || 'Opponent'} wants to take back
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => mpRespondTakeback(true)} className="btn btn-sm" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: 'var(--success)' }}>Accept</button>
                    <button onClick={() => mpRespondTakeback(false)} className="btn btn-sm" style={{ background: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.3)', color: 'var(--danger)' }}>Decline</button>
                  </div>
                </div>
              )}

              {gameOver && !mpGameAborted && !showAnalysis && (() => {
                const rd = getResultDisplay();
                const isWin = gameResult?.winnerColor === playerColor;
                const isDraw = ['stalemate', 'repetition', 'insufficient', 'fifty-move', 'draw'].includes(gameResult?.type);
                const accentColor = isDraw ? 'var(--gold)' : isWin ? 'var(--success)' : 'var(--danger)';
                const isMultiplayer = gameMode?.includes('multiplayer');
                return (
                  <div className="game-over-overlay">
                    {/* Result icon */}
                    {rd.icon === 'crown' && <Crown className="w-10 h-10 mb-2" style={{ color: 'var(--gold)' }} />}

                    <div className="text-3xl font-black mb-1 tracking-tight" style={{ color: accentColor, fontFamily: "'Playfair Display', serif" }}>{rd.title}</div>
                    <div className="text-sm text-center max-w-[280px] mb-5" style={{ color: 'var(--text-secondary)' }}>{rd.subtitle}</div>

                    {moveHistory.length >= 2 && (
                      <button onClick={() => setShowAnalysis(true)} className="btn btn-primary mb-3 px-6 py-2.5 text-sm">
                        <BarChart3 className="w-4 h-4" /> Review Game
                      </button>
                    )}

                    {isMultiplayer && !mpRematchRoomCode && (
                      <div className="mb-3 flex flex-col items-center gap-2">
                        {mpRematchOffered ? (
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{mpOpponentName || 'Opponent'} wants a rematch!</span>
                            <button onClick={mpOfferRematch} className="btn btn-primary px-5 py-1.5 text-sm"><RefreshCw className="w-3.5 h-3.5" /> Accept Rematch</button>
                            <button onClick={mpDeclineRematch} className="text-xs transition-colors" style={{ color: 'var(--text-dim)' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
                            >Decline</button>
                          </div>
                        ) : (
                          <button onClick={mpOfferRematch} disabled={mpRematchOfferSent} className={`btn px-5 py-1.5 text-sm ${mpRematchOfferSent ? 'opacity-60' : ''}`}>
                            <RefreshCw className="w-3.5 h-3.5" /> {mpRematchOfferSent ? 'Waiting...' : 'Rematch'}
                          </button>
                        )}
                      </div>
                    )}

                    {isMultiplayer && mpRematchRoomCode && (
                      <div className="mb-3">
                        <button
                          onClick={() => { handleNewGame(); setMultiplayerRoomCode(mpRematchRoomCode); setPlayerColor(playerColor === 'w' ? 'b' : 'w'); setGameMode(gameMode === 'multiplayer_host' ? 'multiplayer_host' : 'multiplayer_guest'); }}
                          className="btn btn-primary px-6 py-2 text-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Join Rematch
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => { setGameMode(null); setMultiplayerRoomCode(null); handleNewGame(); }} className="btn px-5 py-2 text-sm"><ArrowLeft className="w-3.5 h-3.5" /> Menu</button>
                      {!isMultiplayer && (<button onClick={handleNewGame} className="btn btn-primary px-6 py-2 text-sm">Play Again</button>)}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Mobile timers */}
          {timeControl && (
            <div className="flex md:hidden gap-2 mt-2 w-full max-w-[min(calc(100vh-10rem),100%)] mx-auto">
              <MobileClockFace time={playerColor === 'b' ? blackTime : whiteTime} isActive={gameStarted && !gameOver && game.turn() === (playerColor === 'b' ? 'b' : 'w')} label={playerColor === 'b' ? 'Black' : 'White'} piece={playerColor === 'b' ? '♚' : '♔'} />
              <MobileClockFace time={playerColor === 'b' ? whiteTime : blackTime} isActive={gameStarted && !gameOver && game.turn() === (playerColor === 'b' ? 'w' : 'b')} label={playerColor === 'b' ? 'White' : 'Black'} piece={playerColor === 'b' ? '♔' : '♚'} />
            </div>
          )}
        </div>

        <div
          className="w-full lg:w-[320px] xl:w-[350px] shrink-0 flex flex-col gap-2 p-2 sm:p-3 overflow-y-auto lg:h-[calc(100vh-52px)]"
          style={{
            background: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border-subtle)',
          }}
        >
          {showAnalysis ? (
            <GameAnalysis
              moveHistory={moveHistory} playerColor={playerColor} gameResult={gameResult}
              gameMode={gameMode} currentPlayer={currentPlayer} opponentName={mpOpponentName}
              onClose={() => setShowAnalysis(false)} onNewGame={handleNewGame}
              onBackToMenu={() => { setGameMode(null); setMultiplayerRoomCode(null); handleNewGame(); }}
              goToMove={goToMove} goBack={goBack} goForward={goForward} goToStart={goToStart} goToEnd={goToEnd}
              viewingMoveIndex={viewingMoveIndex} onEvalUpdate={setAnalysisEval}
            />
          ) : (
            <>
              {/* AI Opponent card */}
              {gameMode === 'ai' && (
                <div className="panel">
                  <div className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0" style={{
                      color: currentPlayer.color,
                      background: `${currentPlayer.color}15`,
                      border: `1px solid ${currentPlayer.color}25`,
                    }}>
                      {currentPlayer.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{currentPlayer.country} {currentPlayer.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{currentPlayer.title}</span>
                        <span className="badge badge-gold text-[9px]">{currentPlayer.elo}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[10px] font-semibold" style={{ color: isAiThinking ? 'var(--warning)' : gameOver ? 'var(--text-dim)' : 'var(--accent)' }}>
                        {isAiThinking ? 'Thinking...' : gameOver ? 'Game Over' : 'Your move'}
                      </span>
                      {timeControl && <span className="badge text-[9px]">{timeControl.format?.toUpperCase()}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Captured Pieces */}
              <div className="panel p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Captured</div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="text-[9px] mb-0.5 uppercase tracking-wider font-bold" style={{ color: 'var(--text-dim)' }}>White</div>
                    <div className="text-[20px] min-h-[26px] flex flex-wrap gap-0.5 leading-none">
                      {captured.w.length > 0 ? captured.w.map((p, i) => (
                        <span key={i} style={{ color: 'var(--text-dim)' }}>{{ p: '\u265F', n: '\u265E', b: '\u265D', r: '\u265C', q: '\u265B' }[p] || p}</span>
                      )) : <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>--</span>}
                    </div>
                  </div>
                  <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
                  <div className="flex-1">
                    <div className="text-[9px] mb-0.5 uppercase tracking-wider font-bold" style={{ color: 'var(--text-dim)' }}>Black</div>
                    <div className="text-[20px] min-h-[26px] flex flex-wrap gap-0.5 leading-none">
                      {captured.b.length > 0 ? captured.b.map((p, i) => (
                        <span key={i} style={{ color: 'var(--text-secondary)' }}>{{ p: '\u2659', n: '\u2658', b: '\u2657', r: '\u2656', q: '\u2655' }[p] || p}</span>
                      )) : <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>--</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Move History */}
              <div className="panel flex flex-col min-h-[100px] max-h-[260px] text-xs">
                <div className="panel-header shrink-0">
                  Moves
                  {isViewingHistory && <span className="badge badge-warning ml-auto text-[9px]">REVIEWING</span>}
                </div>
                <div className="flex-1 overflow-y-auto p-2 font-mono" ref={movesScrollRef}>
                  {moveHistory.length === 0 ? (
                    <div className="text-center py-4" style={{ color: 'var(--text-dim)' }}>No moves yet</div>
                  ) : (
                    <div className="grid grid-cols-[28px_1fr_1fr] gap-x-2 gap-y-0.5 items-center px-1">
                      {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
                        const whiteIdx = i * 2;
                        const blackIdx = i * 2 + 1;
                        const currentViewIdx = viewingMoveIndex === null ? moveHistory.length - 1 : viewingMoveIndex;
                        return (
                          <React.Fragment key={i}>
                            <span className="move-number">{i + 1}.</span>
                            <span onClick={() => goToMove(whiteIdx)} className={`move-san ${whiteIdx === currentViewIdx ? 'current' : ''}`}>{moveHistory[whiteIdx]?.san}</span>
                            {moveHistory[blackIdx] ? (
                              <span onClick={() => goToMove(blackIdx)} className={`move-san ${blackIdx === currentViewIdx ? 'current' : ''}`}>{moveHistory[blackIdx].san}</span>
                            ) : <span />}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
                {moveHistory.length > 0 && (
                  <div className="flex items-center justify-center gap-1 px-2 py-1.5 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <button onClick={goToStart} disabled={viewingMoveIndex === -1} className="btn btn-ghost btn-sm p-1.5"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={goBack} disabled={viewingMoveIndex === -1} className="btn btn-ghost btn-sm p-1.5"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={goForward} disabled={viewingMoveIndex === null} className="btn btn-ghost btn-sm p-1.5"><ChevronRight className="w-3.5 h-3.5" /></button>
                    <button onClick={goToEnd} disabled={viewingMoveIndex === null} className="btn btn-ghost btn-sm p-1.5"><ChevronsRight className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>

              {/* Bottom panel */}
              {gameMode === null ? (
                <div className="panel flex-1 flex flex-col min-h-[200px] overflow-hidden relative">
                  <GameMode onPlayAI={handlePlayAI} onMultiplayerStart={handleMultiplayerStart} onLocalStart={handleLocalStart} autoJoinRoomCode={autoJoinRoomCode} />
                </div>
              ) : gameMode === 'ai' ? (
                <div className="panel flex-1 flex flex-col min-h-[180px]">
                  <div className="panel-header shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /> Live Commentary
                    <span className="ml-auto flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--danger)', animation: 'pulse-dot 1.5s infinite' }} />
                      <span className="text-[9px] font-bold" style={{ color: 'var(--danger)' }}>LIVE</span>
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {m.role === 'model' && (
                          <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-black" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--accent)' }}>
                            AI
                          </div>
                        )}
                        <div className="text-xs leading-relaxed p-2.5 rounded-xl max-w-[85%]" style={{
                          background: m.role === 'user' ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                          border: `1px solid ${m.role === 'user' ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`,
                          color: 'var(--text-primary)',
                          borderColor: m.isStreaming ? 'var(--accent)' : undefined,
                        }}>
                          {m.parts[0].text}
                          {m.isStreaming && <span style={{ color: 'var(--accent)' }} className="ml-1 animate-pulse">|</span>}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={submitChat} className="p-2.5 flex gap-2 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Talk to the commentator..." className="input flex-1 text-[11px]" disabled={!isConnected} />
                    <button disabled={!isConnected || isStreaming} className="btn btn-primary btn-sm">Send</button>
                  </form>
                </div>
              ) : gameMode === 'local' ? (
                <div className="panel flex-1 flex flex-col min-h-[80px] justify-center">
                  <div className="p-5 text-center">
                    <div className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Local Multiplayer</div>
                    <div className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Pass the device to play</div>
                    <div className="flex items-center justify-center gap-2.5 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Current Turn:</span>
                      <span className="text-base font-black" style={{ color: game.turn() === 'w' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {game.turn() === 'w' ? '\u2654 White' : '\u265A Black'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Multiplayer panel */
                <div className="panel flex-1 flex flex-col min-h-[100px] overflow-hidden">
                  <div className="panel-header shrink-0">
                    <Swords className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} /> Online Match
                    {timeControl && <span className="badge ml-1 text-[9px]">{timeControl.label}</span>}
                    <span className={`ml-auto ${opponentOnline ? 'badge badge-success' : 'badge badge-warning'}`} style={{ fontSize: '9px' }}>
                      {opponentOnline ? 'LIVE' : 'WAITING'}
                    </span>
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-2.5 flex flex-col gap-2 shrink-0">
                      {/* You */}
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), #059669)', color: '#fff' }}>
                          {user?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{user?.name || 'You'}</div>
                          <div className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>{playerColor === 'w' ? '\u2654 White' : '\u265A Black'}</div>
                        </div>
                        <div className={`status-dot ${mpConnected ? 'status-online' : 'status-offline'}`} />
                      </div>

                      <div className="flex items-center gap-2 px-2">
                        <div className="flex-1 divider" />
                        <span className="text-[8px] font-black tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>VS</span>
                        <div className="flex-1 divider" />
                      </div>

                      {/* Opponent */}
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all" style={{
                        background: opponentOnline ? 'var(--bg-elevated)' : 'transparent',
                        border: opponentOnline ? '1px solid var(--border-color)' : '1px dashed var(--border-color)'
                      }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0" style={{
                          background: opponentOnline ? 'var(--bg-surface)' : 'transparent',
                          border: opponentOnline ? '1px solid var(--border-color)' : '1px dashed var(--border-color)',
                          color: opponentOnline ? 'var(--text-primary)' : 'var(--text-dim)'
                        }}>
                          {opponentOnline ? (mpOpponentName?.[0]?.toUpperCase() || '?') : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {opponentOnline ? (mpOpponentName || 'Opponent') : 'Waiting for friend...'}
                          </div>
                          <div className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {opponentOnline ? (playerColor === 'w' ? '\u265A Black' : '\u2654 White') : 'Share the room link'}
                          </div>
                        </div>
                        <div className={`status-dot ${opponentOnline ? 'status-online' : 'status-waiting'}`} />
                      </div>

                      {gameMode === 'multiplayer_host' && !opponentOnline && (
                        <div className="p-2.5 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] uppercase tracking-[0.1em] font-bold" style={{ color: 'var(--text-dim)' }}>Room Code</span>
                            <button onClick={copyRoomCode} className="text-[9px] flex items-center gap-1 font-semibold transition-colors" style={{ color: 'var(--accent)' }}>
                              {colorCopied ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy link</>}
                            </button>
                          </div>
                          <div className="text-center font-mono text-base font-black tracking-[0.3em]" style={{ color: 'var(--accent)' }}>{multiplayerRoomCode}</div>
                        </div>
                      )}

                      {opponentOnline && !gameOver && (
                        <div className="flex items-center justify-center gap-2 p-2 rounded-xl transition-all" style={{
                          background: game.turn() === playerColor ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-elevated)',
                          border: `1px solid ${game.turn() === playerColor ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`
                        }}>
                          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            {game.turn() === playerColor ? 'Your turn' : `${mpOpponentName || 'Opponent'}'s turn`}
                          </span>
                          <span className="text-sm font-bold">{game.turn() === 'w' ? '\u2654' : '\u265A'}</span>
                        </div>
                      )}
                    </div>

                    {/* Chat */}
                    <div className="flex-1 flex flex-col overflow-hidden" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <div className="px-3 py-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] font-bold shrink-0" style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <MessageCircle className="w-3 h-3" /> Chat
                      </div>
                      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5">
                        {mpChatMessages.length === 0 ? (
                          <div className="text-[10px] text-center py-4" style={{ color: 'var(--text-dim)' }}>
                            {opponentOnline ? 'Say hello to your opponent!' : 'Chat will appear here'}
                          </div>
                        ) : (
                          mpChatMessages.map((msg, i) => {
                            const isMe = msg.userId === user?.id || msg.name === user?.name;
                            return (
                              <div key={i} className={`flex gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className="text-[11px] px-3 py-1.5 rounded-xl max-w-[80%]" style={{
                                  background: isMe ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                                  border: `1px solid ${isMe ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`,
                                  color: 'var(--text-primary)'
                                }}>
                                  {!isMe && <span className="text-[9px] font-bold block mb-0.5" style={{ color: 'var(--accent)' }}>{msg.name}</span>}
                                  {msg.message}
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={mpChatEndRef} />
                      </div>
                      <form onSubmit={(e) => { e.preventDefault(); if (mpChatInput.trim()) { mpSendChat(mpChatInput); setMpChatInput(''); } }} className="p-2 flex gap-1.5 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <input type="text" value={mpChatInput} onChange={e => setMpChatInput(e.target.value)} placeholder="Type a message..." maxLength={200} className="input flex-1 text-[11px]" />
                        <button type="submit" disabled={!mpChatInput.trim()} className="btn btn-primary btn-sm p-1.5"><Send className="w-3.5 h-3.5" /></button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Dashboard Modal */}
      {showDashboard && (
        <div className="modal-backdrop overflow-y-auto">
          <div className="w-full max-w-7xl">
            <Dashboard />
            <button onClick={() => setShowDashboard(false)} className="fixed top-4 right-4 z-[60] btn p-2.5 rounded-xl" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();
<<<<<<< HEAD
=======
  const [showLanding, setShowLanding] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
>>>>>>> 548e95a (Added logo to landing page)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center animate-slideUp">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-4 animate-glow"
            style={{ background: 'linear-gradient(135deg, var(--accent), #059669)', color: '#fff' }}
          >
            &#9822;
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>ChessLegends</p>
          <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>Preparing your experience...</p>
          <div className="mt-4 w-32 h-1 rounded-full mx-auto overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div className="h-full rounded-full" style={{ background: 'var(--accent)', width: '60%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
    );
  }

<<<<<<< HEAD
  return user ? <GameView /> : <AuthPage />;
=======
  if (showLanding) {
    return <LandingPage onStart={() => setShowLanding(false)} onLogin={() => setShowLanding(false)} />;
  }

  if (!user) return <AuthPage />;

  if (user.isAdmin && showAdmin) {
    return <AdminPanel onExitAdmin={() => setShowAdmin(false)} />;
  }

  return <GameView onAdminClick={user.isAdmin ? () => setShowAdmin(true) : null} />;
>>>>>>> 548e95a (Added logo to landing page)
}

export default App;
