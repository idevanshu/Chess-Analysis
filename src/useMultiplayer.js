import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

export function useMultiplayer(roomCode, userId, token, onOpponentMove, onGameEnded, onSync) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [opponentOnline, setOpponentOnline] = useState(false);

  useEffect(() => {
    if (!roomCode || !userId) return;

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
    });

    // Opponent disconnected
    socket.on('opponentDisconnected', (data) => {
      console.log('[MP] Opponent disconnected:', data);
      setOpponentOnline(false);
    });

    // Receive validated move from opponent
    socket.on('opponentMove', (data) => {
      console.log('[MP] Opponent move:', data);
      onOpponentMove(data);
    });

    // Our move was confirmed by server
    socket.on('moveConfirmed', (data) => {
      // Could be used for optimistic UI — for now just log
      console.log('[MP] Move confirmed:', data.san);
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

    // Board sync on join/reconnect — lets late joiners catch up
    socket.on('gameSync', (data) => {
      console.log('[MP] Game sync:', data);
      if (onSync) onSync(data);
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

  return { sendMove, resign, connected, opponentOnline };
}
