import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

export function useMultiplayer(roomCode, userId, token, onOpponentMove, onGameEnded, onSync) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [opponentName, setOpponentName] = useState(null);

  // Refs avoid stale closures in socket handlers
  const onOpponentMoveRef = useRef(onOpponentMove);
  const onGameEndedRef = useRef(onGameEnded);
  const onSyncRef = useRef(onSync);
  onOpponentMoveRef.current = onOpponentMove;
  onGameEndedRef.current = onGameEnded;
  onSyncRef.current = onSync;

  const [chatMessages, setChatMessages] = useState([]);

  const [drawOffered, setDrawOffered] = useState(false);
  const [drawOfferSent, setDrawOfferSent] = useState(false);

  const [rematchOffered, setRematchOffered] = useState(false);
  const [rematchOfferSent, setRematchOfferSent] = useState(false);
  const [rematchRoomCode, setRematchRoomCode] = useState(null);

  const [takebackRequested, setTakebackRequested] = useState(false);
  const [takebackSent, setTakebackSent] = useState(false);

  const [gameAborted, setGameAborted] = useState(false);

  const [serverWhiteTime, setServerWhiteTime] = useState(null);
  const [serverBlackTime, setServerBlackTime] = useState(null);

  const [roomTimeControl, setRoomTimeControl] = useState(null);

  useEffect(() => {
    if (!roomCode || !userId) return;

    setChatMessages([]);
    setDrawOffered(false);
    setDrawOfferSent(false);
    setRematchOffered(false);
    setRematchOfferSent(false);
    setRematchRoomCode(null);
    setTakebackRequested(false);
    setTakebackSent(false);
    setGameAborted(false);

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinRoom', roomCode);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('userJoined', (data) => {
      setOpponentOnline(true);
      if (data.name) {
        setOpponentName(data.name);
      }
    });

    socket.on('opponentDisconnected', () => {
      setOpponentOnline(false);
    });

    socket.on('opponentMove', (data) => {
      if (data.whiteTime !== undefined) setServerWhiteTime(data.whiteTime);
      if (data.blackTime !== undefined) setServerBlackTime(data.blackTime);
      onOpponentMoveRef.current(data);
    });

    socket.on('moveConfirmed', (data) => {
      if (data.whiteTime !== undefined) setServerWhiteTime(data.whiteTime);
      if (data.blackTime !== undefined) setServerBlackTime(data.blackTime);
    });

    socket.on('moveError', () => {
    });

    socket.on('gameEnded', (data) => {
      onGameEndedRef.current(data);
    });

    socket.on('gameSync', (data) => {
      // Active game implies opponent is online
      if (data.status === 'active') setOpponentOnline(true);
      if (data.timeControl) setRoomTimeControl(data.timeControl);
      if (data.whiteTime !== undefined) setServerWhiteTime(data.whiteTime);
      if (data.blackTime !== undefined) setServerBlackTime(data.blackTime);
      if (data.chat) setChatMessages(data.chat);
      if (onSyncRef.current) onSyncRef.current(data);
    });

    socket.on('opponentReconnected', () => {
      setOpponentOnline(true);
    });

    socket.on('chatMessage', (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    socket.on('drawOffered', () => {
      setDrawOffered(true);
    });

    socket.on('drawDeclined', () => {
      setDrawOfferSent(false);
    });

    socket.on('gameAborted', () => {
      setGameAborted(true);
      onGameEndedRef.current({ result: 'aborted', reason: 'abort' });
    });

    socket.on('abortError', () => {
    });

    socket.on('rematchOffered', () => {
      setRematchOffered(true);
    });

    socket.on('rematchCreated', (data) => {
      setRematchRoomCode(data.roomCode);
    });

    socket.on('rematchDeclined', () => {
      setRematchOfferSent(false);
    });

    socket.on('takebackRequested', () => {
      setTakebackRequested(true);
    });

    socket.on('takebackAccepted', (data) => {
      setTakebackSent(false);
      setTakebackRequested(false);
      if (onSyncRef.current) onSyncRef.current({ fen: data.fen, moves: data.moves, isTakeback: true });
    });

    socket.on('takebackDeclined', () => {
      setTakebackSent(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [roomCode, userId, token]);

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

  const sendChat = useCallback((message) => {
    if (socketRef.current?.connected && message?.trim()) {
      socketRef.current.emit('chatMessage', { roomCode, message: message.trim() });
    }
  }, [roomCode]);

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
    }
  }, [roomCode]);

  const abortGame = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('abortGame', roomCode);
    }
  }, [roomCode]);

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
    chatMessages, sendChat,
    drawOffered, drawOfferSent, offerDraw, respondDraw,
    rematchOffered, rematchOfferSent, rematchRoomCode, offerRematch, declineRematch,
    takebackRequested, takebackSent, requestTakeback, respondTakeback,
    abortGame, gameAborted,
    serverWhiteTime, serverBlackTime, roomTimeControl,
  };
}
