import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useMultiplayer(roomCode, userId, onOpponentMove, onGameEnded) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomCode || !userId) return;

    // Initialize socket connection
    socketRef.current = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      socketRef.current.emit('joinRoom', roomCode);
    });

    socketRef.current.on('userJoined', (data) => {
      console.log('Opponent joined:', data);
    });

    socketRef.current.on('opponentMove', (data) => {
      console.log('Opponent move received:', data);
      onOpponentMove(data);
    });

    socketRef.current.on('gameEnded', (data) => {
      console.log('Game ended:', data);
      onGameEnded(data);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomCode, userId, onOpponentMove, onGameEnded]);

  const sendMove = useCallback((move, fen, san) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('makeMove', {
        roomCode,
        move,
        fen,
        san
      });
    }
  }, [roomCode]);

  const resign = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('resign', roomCode);
    }
  }, [roomCode]);

  return { sendMove, resign, socket: socketRef.current };
}
