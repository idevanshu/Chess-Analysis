import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * React hook for multiplayer chess functionality via Socket.IO
 * Handles real-time game synchronization, moves, chat, and game actions
 * 
 * @param {string} roomCode - Unique room identifier
 * @param {string} userId - Current user identifier
 * @param {string} token - JWT authentication token
 * @param {function} onOpponentMove - Callback when opponent makes a move
 * @param {function} onGameEnded - Callback when game ends
 * @param {function} onSync - Callback for board synchronization
 * @returns {object} - Multiplayer state and actions
 */
export function useMultiplayer(roomCode, userId, token, onOpponentMove, onGameEnded, onSync) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [opponentName, setOpponentName] = useState(null);

  // Keep callback refs up-to-date to avoid stale closures in socket handlers
  const onOpponentMoveRef = useRef(onOpponentMove);
  const onGameEndedRef = useRef(onGameEnded);
  const onSyncRef = useRef(onSync);
  onOpponentMoveRef.current = onOpponentMove;
  onGameEndedRef.current = onGameEnded;
  onSyncRef.current = onSync;

  // Chat messages between players
  const [chatMessages, setChatMessages] = useState([]);

  // Draw offer state - tracks draw offers between players
  const [drawOffered, setDrawOffered] = useState(false);
  const [drawOfferSent, setDrawOfferSent] = useState(false);

  // Rematch state - tracks rematch offers and new room creation
  const [rematchOffered, setRematchOffered] = useState(false);
  const [rematchOfferSent, setRematchOfferSent] = useState(false);
  const [rematchRoomCode, setRematchRoomCode] = useState(null);

  // Takeback state - tracks move takeback requests
  const [takebackRequested, setTakebackRequested] = useState(false);
  const [takebackSent, setTakebackSent] = useState(false);

  // Abort state - tracks if game was aborted
  const [gameAborted, setGameAborted] = useState(false);

  // Server-synced timer values for multiplayer clock
  const [serverWhiteTime, setServerWhiteTime] = useState(null);
  const [serverBlackTime, setServerBlackTime] = useState(null);

  // Time control configuration from room settings
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

    // Connect to Socket.IO server with JWT authentication
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

    // Handle opponent joining the room
    socket.on('userJoined', (data) => {
      console.log('[MP] Opponent joined:', data);
      setOpponentOnline(true);
      if (data.name) {
        setOpponentName(data.name);
      }
    });

    // Handle opponent disconnection
    socket.on('opponentDisconnected', (data) => {
      console.log('[MP] Opponent disconnected:', data);
      setOpponentOnline(false);
    });

    // Handle validated move received from opponent
    socket.on('opponentMove', (data) => {
      console.log('[MP] Opponent move:', data);
      if (data.whiteTime !== undefined) setServerWhiteTime(data.whiteTime);
      if (data.blackTime !== undefined) setServerBlackTime(data.blackTime);
      onOpponentMoveRef.current(data);
    });

    // Handle server confirmation of our move
    socket.on('moveConfirmed', (data) => {
      console.log('[MP] Move confirmed:', data.san);
      if (data.whiteTime !== undefined) setServerWhiteTime(data.whiteTime);
      if (data.blackTime !== undefined) setServerBlackTime(data.blackTime);
    });

    // Handle move rejection by server
    socket.on('moveError', (data) => {
      console.error('[MP] Move error:', data.error);
    });

    // Handle game end events (checkmate, draw, resignation)
    socket.on('gameEnded', (data) => {
      console.log('[MP] Game ended:', data);
      onGameEndedRef.current(data);
    });

    // Handle board synchronization on join or reconnect
    socket.on('gameSync', (data) => {
      console.log('[MP] Game sync:', data);
      // If game is active, opponent must be online - mark them present
      if (data.status === 'active') setOpponentOnline(true);
      if (data.timeControl) setRoomTimeControl(data.timeControl);
      if (data.whiteTime !== undefined) setServerWhiteTime(data.whiteTime);
      if (data.blackTime !== undefined) setServerBlackTime(data.blackTime);
      if (data.chat) setChatMessages(data.chat);
      if (onSyncRef.current) onSyncRef.current(data);
    });

    // Handle opponent reconnection
    socket.on('opponentReconnected', (data) => {
      console.log('[MP] Opponent reconnected:', data);
      setOpponentOnline(true);
    });

    // Handle incoming chat messages
    socket.on('chatMessage', (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    // Handle draw offer from opponent
    socket.on('drawOffered', (data) => {
      console.log('[MP] Draw offered by:', data.by);
      setDrawOffered(true);
    });

    // Handle draw offer declined by opponent
    socket.on('drawDeclined', () => {
      console.log('[MP] Draw declined');
      setDrawOfferSent(false);
    });

    // Handle game abort event
    socket.on('gameAborted', () => {
      console.log('[MP] Game aborted');
      setGameAborted(true);
      onGameEndedRef.current({ result: 'aborted', reason: 'abort' });
    });

    // Handle abort request error
    socket.on('abortError', (data) => {
      console.error('[MP] Abort error:', data.error);
    });

    // Handle rematch offer from opponent
    socket.on('rematchOffered', (data) => {
      console.log('[MP] Rematch offered by:', data.by);
      setRematchOffered(true);
    });

    // Handle rematch room creation
    socket.on('rematchCreated', (data) => {
      console.log('[MP] Rematch created:', data.roomCode);
      setRematchRoomCode(data.roomCode);
    });

    // Handle rematch declined by opponent
    socket.on('rematchDeclined', () => {
      console.log('[MP] Rematch declined');
      setRematchOfferSent(false);
    });

    // Handle takeback request from opponent
    socket.on('takebackRequested', (data) => {
      console.log('[MP] Takeback requested by:', data.by);
      setTakebackRequested(true);
    });

    // Handle takeback acceptance - sync board state
    socket.on('takebackAccepted', (data) => {
      console.log('[MP] Takeback accepted');
      setTakebackSent(false);
      setTakebackRequested(false);
      // Notify parent to replay moves from scratch
      if (onSyncRef.current) onSyncRef.current({ fen: data.fen, moves: data.moves, isTakeback: true });
    });

    // Handle takeback declined by opponent
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

  /**
   * Send move to server for validation and broadcasting
   * @param {object} move - Move object
   * @param {string} fen - Current FEN position
   * @param {string} san - Standard Algebraic Notation of the move
   */
  const sendMove = useCallback((move, fen, san) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('makeMove', {
        roomCode,
        san,
      });
    }
  }, [roomCode]);

  /**
   * Submit resignation to server
   */
  const resign = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('resign', roomCode);
    }
  }, [roomCode]);

  /**
   * Send chat message to opponent
   * @param {string} message - Message text to send
   */
  const sendChat = useCallback((message) => {
    if (socketRef.current?.connected && message?.trim()) {
      socketRef.current.emit('chatMessage', { roomCode, message: message.trim() });
    }
  }, [roomCode]);

  /**
   * Offer a draw to the opponent
   */
  const offerDraw = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('offerDraw', roomCode);
      setDrawOfferSent(true);
    }
  }, [roomCode]);

  /**
   * Respond to opponent's draw offer
   * @param {boolean} accept - Whether to accept or decline the draw
   */
  const respondDraw = useCallback((accept) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('respondDraw', { roomCode, accept });
      setDrawOffered(false);
    }
  }, [roomCode]);

  /**
   * Request to abort the game (only allowed before 2 moves)
   */
  const abortGame = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('abortGame', roomCode);
    }
  }, [roomCode]);

  /**
   * Offer a rematch to the opponent after game ends
   */
  const offerRematch = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('offerRematch', roomCode);
      setRematchOfferSent(true);
    }
  }, [roomCode]);

  /**
   * Decline opponent's rematch offer
   */
  const declineRematch = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('declineRematch', roomCode);
      setRematchOffered(false);
    }
  }, [roomCode]);

  /**
   * Request opponent to take back their last move
   */
  const requestTakeback = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('takebackRequest', roomCode);
      setTakebackSent(true);
    }
  }, [roomCode]);

  /**
   * Respond to opponent's takeback request
   * @param {boolean} accept - Whether to accept or decline the takeback
   */
  const respondTakeback = useCallback((accept) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('respondTakeback', { roomCode, accept });
      setTakebackRequested(false);
    }
  }, [roomCode]);

  return {
    sendMove, resign, connected, opponentOnline, opponentName, setOpponentName,
    // Chat functionality
    chatMessages, sendChat,
    // Draw offer functionality
    drawOffered, drawOfferSent, offerDraw, respondDraw,
    // Rematch functionality
    rematchOffered, rematchOfferSent, rematchRoomCode, offerRematch, declineRematch,
    // Takeback functionality
    takebackRequested, takebackSent, requestTakeback, respondTakeback,
    // Abort functionality
    abortGame, gameAborted,
    // Timer synchronization
    serverWhiteTime, serverBlackTime, roomTimeControl,
  };
}
