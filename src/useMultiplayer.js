import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

export function useMultiplayer(roomCode, userId, token, onOpponentMove, onGameEnded, onSync) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [opponentName, setOpponentName] = useState(null);

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
      onOpponentMove(data);
    });

    // Our move was confirmed by server
    socket.on('moveConfirmed', (data) => {
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

    // Board sync on join/reconnect
    socket.on('gameSync', (data) => {
      console.log('[MP] Game sync:', data);
      if (onSync) onSync(data);
    });

    // Opponent reconnected
    socket.on('opponentReconnected', (data) => {
      console.log('[MP] Opponent reconnected:', data);
      setOpponentOnline(true);
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

  return { sendMove, resign, connected, opponentOnline, opponentName, setOpponentName };
}
