import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

export function useMultiplayer(roomCode, userId, token, onOpponentMove, onGameEnded, onSync) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [opponentName, setOpponentName] = useState(null);

  // Chat
  const [chatMessages, setChatMessages] = useState([]);

  // Draw offer
  const [drawOffered, setDrawOffered] = useState(false); // opponent offered us a draw
  const [drawOfferSent, setDrawOfferSent] = useState(false); // we offered a draw

  // Rematch
  const [rematchOffered, setRematchOffered] = useState(false); // opponent offered rematch
  const [rematchOfferSent, setRematchOfferSent] = useState(false); // we offered rematch
  const [rematchRoomCode, setRematchRoomCode] = useState(null);

  // Takeback
  const [takebackRequested, setTakebackRequested] = useState(false); // opponent requested takeback
  const [takebackSent, setTakebackSent] = useState(false); // we requested takeback

  // Abort
  const [gameAborted, setGameAborted] = useState(false);

  // Timer sync from server
  const [serverWhiteTime, setServerWhiteTime] = useState(null);
  const [serverBlackTime, setServerBlackTime] = useState(null);

  // Time control from room
  const [roomTimeControl, setRoomTimeControl] = useState(null);

  useEffect(() => {
    if (!roomCode || !userId) return;

    // Reset state for new room
    setChatMessages([]);
    setDrawOffered(false);
    setDrawOfferSent(false);
    setRematchOffered(false);
    setRematchOfferSent(false);
    setRematchRoomCode(null);
    setTakebackRequested(false);
    setTakebackSent(false);
    setGameAborted(false);

    // Connect with JWT auth so server can validate identity
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[MP] Connected:', socket.id);
      setConnected(true);
      socket.emit('joinRoom', roomCode);
    });

    socket.on('disconnect', () => {
      console.log('[MP] Disconnected');
      setConnected(false);
    });

    // Opponent joined the room
    socket.on('userJoined', (data) => {
      console.log('[MP] Opponent joined:', data);
      setOpponentOnline(true);
      if (data.name) {
        setOpponentName(data.name);
      }
    });

    // Opponent disconnected
    socket.on('opponentDisconnected', (data) => {
      console.log('[MP] Opponent disconnected:', data);
      setOpponentOnline(false);
    });

    // Receive validated move from opponent
    socket.on('opponentMove', (data) => {
      console.log('[MP] Opponent move:', data);
      if (data.whiteTime !== undefined) setServerWhiteTime(data.whiteTime);
      if (data.blackTime !== undefined) setServerBlackTime(data.blackTime);
      onOpponentMove(data);
    });

    // Our move was confirmed by server
    socket.on('moveConfirmed', (data) => {
      console.log('[MP] Move confirmed:', data.san);
      if (data.whiteTime !== undefined) setServerWhiteTime(data.whiteTime);
      if (data.blackTime !== undefined) setServerBlackTime(data.blackTime);
    });

    // Move was rejected by server
    socket.on('moveError', (data) => {
      console.error('[MP] Move error:', data.error);
    });

    // Game ended (checkmate, draw, resignation)
    socket.on('gameEnded', (data) => {
      console.log('[MP] Game ended:', data);
      onGameEnded(data);
    });

    // Board sync on join/reconnect
    socket.on('gameSync', (data) => {
      console.log('[MP] Game sync:', data);
      // If game is already active, opponent must be the other player — mark online
      // (actual disconnect will correct this via opponentDisconnected event)
      if (data.status === 'active') setOpponentOnline(true);
      if (data.timeControl) setRoomTimeControl(data.timeControl);
      if (data.whiteTime !== undefined) setServerWhiteTime(data.whiteTime);
      if (data.blackTime !== undefined) setServerBlackTime(data.blackTime);
      if (data.chat) setChatMessages(data.chat);
      if (onSync) onSync(data);
    });

    // Opponent reconnected
    socket.on('opponentReconnected', (data) => {
      console.log('[MP] Opponent reconnected:', data);
      setOpponentOnline(true);
    });

    // ── Chat ──
    socket.on('chatMessage', (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    // ── Draw offer ──
    socket.on('drawOffered', (data) => {
      console.log('[MP] Draw offered by:', data.by);
      setDrawOffered(true);
    });

    socket.on('drawDeclined', () => {
      console.log('[MP] Draw declined');
      setDrawOfferSent(false);
    });

    // ── Abort ──
    socket.on('gameAborted', () => {
      console.log('[MP] Game aborted');
      setGameAborted(true);
      onGameEnded({ result: 'aborted', reason: 'abort' });
    });

    socket.on('abortError', (data) => {
      console.error('[MP] Abort error:', data.error);
    });

    // ── Rematch ──
    socket.on('rematchOffered', (data) => {
      console.log('[MP] Rematch offered by:', data.by);
      setRematchOffered(true);
    });

    socket.on('rematchCreated', (data) => {
      console.log('[MP] Rematch created:', data.roomCode);
      setRematchRoomCode(data.roomCode);
    });

    socket.on('rematchDeclined', () => {
      console.log('[MP] Rematch declined');
      setRematchOfferSent(false);
    });

    // ── Takeback ──
    socket.on('takebackRequested', (data) => {
      console.log('[MP] Takeback requested by:', data.by);
      setTakebackRequested(true);
    });

    socket.on('takebackAccepted', (data) => {
      console.log('[MP] Takeback accepted');
      setTakebackSent(false);
      setTakebackRequested(false);
      // Notify parent to replay moves from scratch
      if (onSync) onSync({ fen: data.fen, moves: data.moves, isTakeback: true });
    });

    socket.on('takebackDeclined', () => {
      console.log('[MP] Takeback declined');
      setTakebackSent(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [roomCode, userId, token]);

  // Send move via socket (server validates before broadcasting)
  const sendMove = useCallback((move, fen, san) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('makeMove', {
        roomCode,
        san,
      });
    }
  }, [roomCode]);

  const resign = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('resign', roomCode);
    }
  }, [roomCode]);

  // ── Chat ──
  const sendChat = useCallback((message) => {
    if (socketRef.current?.connected && message?.trim()) {
      socketRef.current.emit('chatMessage', { roomCode, message: message.trim() });
    }
  }, [roomCode]);

  // ── Draw ──
  const offerDraw = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('offerDraw', roomCode);
      setDrawOfferSent(true);
    }
  }, [roomCode]);

  const respondDraw = useCallback((accept) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('respondDraw', { roomCode, accept });
      setDrawOffered(false);
      if (accept) {
        // Game will end via gameEnded event
      }
    }
  }, [roomCode]);

  // ── Abort ──
  const abortGame = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('abortGame', roomCode);
    }
  }, [roomCode]);

  // ── Rematch ──
  const offerRematch = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('offerRematch', roomCode);
      setRematchOfferSent(true);
    }
  }, [roomCode]);

  const declineRematch = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('declineRematch', roomCode);
      setRematchOffered(false);
    }
  }, [roomCode]);

  // ── Takeback ──
  const requestTakeback = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('takebackRequest', roomCode);
      setTakebackSent(true);
    }
  }, [roomCode]);

  const respondTakeback = useCallback((accept) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('respondTakeback', { roomCode, accept });
      setTakebackRequested(false);
    }
  }, [roomCode]);

  return {
    sendMove, resign, connected, opponentOnline, opponentName, setOpponentName,
    // Chat
    chatMessages, sendChat,
    // Draw
    drawOffered, drawOfferSent, offerDraw, respondDraw,
    // Rematch
    rematchOffered, rematchOfferSent, rematchRoomCode, offerRematch, declineRematch,
    // Takeback
    takebackRequested, takebackSent, requestTakeback, respondTakeback,
    // Abort
    abortGame, gameAborted,
    // Timer sync
    serverWhiteTime, serverBlackTime, roomTimeControl,
  };
}
