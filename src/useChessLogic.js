import { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { useStockfish } from './useStockfish';

export function useChessLogic(currentPlayer, hintsEnabled, gameMode = 'ai') {
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [captured, setCaptured] = useState({ w: [], b: [] });
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [playerColor, setPlayerColor] = useState('w');
  const [hintArrow, setHintArrow] = useState(null);
  const [viewingMoveIndex, setViewingMoveIndex] = useState(null); // null = live, -1 = start, 0+ = after that move
  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to }
  const [premove, setPremove] = useState(null); // { from, to }
  const { isReady: stockfishReady, getBestMove } = useStockfish();

  // --- Move history navigation (analysis mode) ---
  const isViewingHistory = viewingMoveIndex !== null;

  const viewingGame = useMemo(() => {
    if (viewingMoveIndex === null) return null;
    try {
      const viewFen = viewingMoveIndex === -1
        ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        : moveHistory[viewingMoveIndex]?.after;
      if (!viewFen) return null;
      return new Chess(viewFen);
    } catch { return null; }
  }, [viewingMoveIndex, moveHistory]);

  const goToMove = (index) => {
    if (index >= moveHistory.length - 1) setViewingMoveIndex(null);
    else if (index < -1) setViewingMoveIndex(-1);
    else setViewingMoveIndex(index);
  };

  const goBack = () => {
    if (moveHistory.length === 0) return;
    setViewingMoveIndex(prev => {
      if (prev === null) return moveHistory.length - 2;
      return prev > -1 ? prev - 1 : prev;
    });
  };

  const goForward = () => {
    setViewingMoveIndex(prev => {
      if (prev === null) return null;
      return prev >= moveHistory.length - 2 ? null : prev + 1;
    });
  };

  const goToStart = () => {
    if (moveHistory.length > 0) setViewingMoveIndex(-1);
  };

  const goToEnd = () => setViewingMoveIndex(null);

  // Convert Stockfish UCI move (e.g. "e2e4") to chess.js move object
  const applyUciMove = (uciMove) => {
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
    const moveOptions = { from, to };
    if (promotion) moveOptions.promotion = promotion;
    return game.move(moveOptions);
  };

  const getAIMove = async () => {
    if (gameOver) return;
    setIsAiThinking(true);

    const moves = game.moves({ verbose: true });
    if (moves.length === 0) {
      setIsAiThinking(false);
      return;
    }

    const currentFen = game.fen();

    // Engine config from player's world ranking
    const engineConfig = {
      elo: currentPlayer?.engineElo || currentPlayer?.elo || 2000,
      depth: currentPlayer?.engineDepth || 18,
      moveTimeMs: currentPlayer?.engineMoveTime || 2000,
    };

    try {
      // Use Stockfish engine for the AI move with ELO-based strength
      const bestUci = stockfishReady
        ? await getBestMove(currentFen, engineConfig)
        : null;

      let moveObj = null;

      if (bestUci) {
        moveObj = applyUciMove(bestUci);
      }

      // Fallback: pick a random legal move if Stockfish fails
      if (!moveObj) {
        const fallback = moves[Math.floor(Math.random() * moves.length)];
        moveObj = game.move(fallback.san);
      }

      if (moveObj) {
        setFen(game.fen());
        setMoveHistory((prev) => [...prev, moveObj]);

        if (moveObj.captured) {
          setCaptured(prev => ({
            ...prev,
            [moveObj.color]: [...prev[moveObj.color], moveObj.captured]
          }));
        }

        setIsAiThinking(false);
        checkGameOver();
      } else {
        setIsAiThinking(false);
      }
    } catch (e) {
      console.error('AI Move error:', e);
      setIsAiThinking(false);
    }
  };

  const requestHint = async () => {
    if (gameOver || game.turn() !== playerColor) return;

    if (stockfishReady) {
      const bestUci = await getBestMove(game.fen(), { elo: 2800, depth: 16, moveTimeMs: 1500 });
      if (bestUci) {
        const from = bestUci.slice(0, 2);
        const to = bestUci.slice(2, 4);
        setHintArrow({ from, to });
        return;
      }
    }

    // Fallback: random legal move
    const moves = game.moves({ verbose: true });
    if (moves.length > 0) {
      const move = moves[Math.floor(Math.random() * moves.length)];
      setHintArrow({ from: move.from, to: move.to });
    }
  };

  useEffect(() => {
    if (hintsEnabled && game.turn() === playerColor && !gameOver) {
      requestHint();
    } else {
      setHintArrow(null);
    }
  }, [hintsEnabled, fen]);

  // Trigger AI's first move when player switches to black
  useEffect(() => {
    if (gameMode === 'ai' && playerColor === 'b' && moveHistory.length === 0 && !gameOver && stockfishReady) {
      getAIMove();
    }
  }, [playerColor, stockfishReady]);

  // Execute premove when it becomes the player's turn
  useEffect(() => {
    if (!premove || gameOver || gameMode === 'local') return;
    if (game.turn() !== playerColor) return;

    try {
      const moves = game.moves({ square: premove.from, verbose: true });
      const targetMove = moves.find(m => m.to === premove.to);
      if (targetMove) {
        const moveOptions = { from: premove.from, to: premove.to };
        if (targetMove.promotion) moveOptions.promotion = 'q'; // premoves auto-queen
        const move = game.move(moveOptions);
        if (move) {
          setPremove(null);
          onMoveMade(move);
          return;
        }
      }
    } catch (e) {
      // premove was invalid
    }
    setPremove(null);
  }, [fen]);

  const handleSquareClick = (square, selectedSquare) => {
    const isLocal = gameMode === 'local';
    const currentTurnColor = game.turn();
    if (gameOver) return null;

    // Cancel pending promotion on any board click
    if (pendingPromotion) {
      setPendingPromotion(null);
      return null;
    }

    const isPlayerTurn = isLocal || currentTurnColor === playerColor;

    // --- Premove mode (not player's turn, non-local) ---
    if (!isPlayerTurn) {
      if (selectedSquare) {
        // If clicking own piece, re-select it
        const clickedPiece = game.get(square);
        if (clickedPiece && clickedPiece.color === playerColor) {
          setPremove(null);
          return square;
        }
        // Set premove destination
        setPremove({ from: selectedSquare, to: square });
        return null;
      }
      // Select own piece for premove
      const piece = game.get(square);
      if (piece && piece.color === playerColor) {
        setPremove(null);
        return square;
      }
      setPremove(null);
      return null;
    }

    // --- Normal mode (player's turn) ---
    if (isAiThinking) return null;
    setPremove(null);

    if (selectedSquare) {
      try {
        const moves = game.moves({ square: selectedSquare, verbose: true });
        const promotionMove = moves.find(m => m.to === square && m.promotion);

        if (promotionMove) {
          // Show promotion chooser instead of auto-queening
          setPendingPromotion({ from: selectedSquare, to: square });
          return null;
        }

        const move = game.move({ from: selectedSquare, to: square });
        if (move) {
          onMoveMade(move);
          return null;
        }
      } catch (e) {
        // invalid move, fall through to piece selection
      }
    }

    const piece = game.get(square);
    if (piece) {
      if (isLocal && piece.color === currentTurnColor) return square;
      if (!isLocal && piece.color === playerColor) return square;
    }
    return null;
  };

  const completePromotion = (promotionPiece) => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    try {
      const move = game.move({ from, to, promotion: promotionPiece });
      if (move) onMoveMade(move);
    } catch (e) {
      console.error('Promotion error:', e);
    }
    setPendingPromotion(null);
  };

  const cancelPromotion = () => {
    setPendingPromotion(null);
  };

  const onMoveMade = (move) => {
    setViewingMoveIndex(null);
    setPendingPromotion(null);
    setFen(game.fen());
    setMoveHistory((prev) => [...prev, move]);
    
    if (move.captured) {
      setCaptured(prev => ({
        ...prev,
        [move.color]: [...prev[move.color], move.captured]
      }));
    }

    const isOver = checkGameOver();

    // In AI mode, trigger AI move if game is not over and it's AI's turn
    if (gameMode === 'ai' && !isOver && game.turn() !== playerColor) {
      getAIMove();
    }
  };

  const checkGameOver = () => {
    if (game.isCheckmate()) {
      const winnerColor = game.turn() === 'w' ? 'b' : 'w';
      setGameResult({ type: 'checkmate', winnerColor });
      setGameOver(true);
      return true;
    } else if (game.isStalemate()) {
      setGameResult({ type: 'stalemate' });
      setGameOver(true);
      return true;
    } else if (game.isThreefoldRepetition()) {
      setGameResult({ type: 'repetition' });
      setGameOver(true);
      return true;
    } else if (game.isInsufficientMaterial()) {
      setGameResult({ type: 'insufficient' });
      setGameOver(true);
      return true;
    } else if (game.isDrawByFiftyMoves()) {
      setGameResult({ type: 'fifty-move' });
      setGameOver(true);
      return true;
    } else if (game.isDraw()) {
      setGameResult({ type: 'draw' });
      setGameOver(true);
      return true;
    }
    return false;
  };

  // Undo last move (in AI mode: undo both AI + player move)
  const undoMove = () => {
    if (gameOver || moveHistory.length === 0 || isAiThinking) return false;

    const undoOne = () => {
      const undone = game.undo();
      if (!undone) return null;
      // Remove from move history
      setMoveHistory(prev => prev.slice(0, -1));
      // Remove captured piece if any
      if (undone.captured) {
        setCaptured(prev => {
          const arr = [...prev[undone.color]];
          const idx = arr.lastIndexOf(undone.captured);
          if (idx !== -1) arr.splice(idx, 1);
          return { ...prev, [undone.color]: arr };
        });
      }
      return undone;
    };

    if (gameMode === 'ai') {
      // Undo AI move + player move (go back one full turn)
      if (moveHistory.length >= 2) {
        undoOne(); // undo AI move
        undoOne(); // undo player move
      } else if (moveHistory.length === 1) {
        undoOne();
      }
    } else {
      undoOne();
    }

    setFen(game.fen());
    setHintArrow(null);
    return true;
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setMoveHistory([]);
    setGameOver(false);
    setGameResult(null);
    setCaptured({ w: [], b: [] });
    setHintArrow(null);
    setViewingMoveIndex(null);
    setPendingPromotion(null);
    setPremove(null);
    setIsAiThinking(false);
  };

  const resign = () => {
    if (gameOver) return;
    setGameOver(true);
    setGameResult({ type: 'resign', loserColor: playerColor });
  };

  const forceGameOver = (result) => {
    setGameOver(true);
    setGameResult(result);
  };

  // Force with structured data
  const forceGameOverStructured = (resultObj) => {
    setGameOver(true);
    setGameResult(resultObj);
  };

  const makeExternalMove = (san) => {
    try {
      if (gameOver) return;
      const moveObj = game.move(san);
      if (moveObj) {
        onMoveMade(moveObj);
      }
    } catch (e) {
      console.error("Invalid external move", e);
    }
  };

  return {
    game, fen, moveHistory, gameOver, gameResult, captured, isAiThinking,
    playerColor, setPlayerColor, handleSquareClick, resetGame, undoMove, hintArrow, resign, forceGameOver, forceGameOverStructured, makeExternalMove,
    viewingGame, viewingMoveIndex, isViewingHistory, goToMove, goBack, goForward, goToStart, goToEnd,
    pendingPromotion, premove, completePromotion, cancelPromotion
  };
}
