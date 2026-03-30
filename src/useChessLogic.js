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
  const [viewingMoveIndex, setViewingMoveIndex] = useState(null);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [premove, setPremove] = useState(null);
  const { isReady: stockfishReady, getBestMove } = useStockfish();

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

    const engineConfig = {
      elo: currentPlayer?.engineElo || currentPlayer?.elo || 2000,
      depth: currentPlayer?.engineDepth || 18,
      moveTimeMs: currentPlayer?.engineMoveTime || 2000,
    };

    try {
      const bestUci = stockfishReady
        ? await getBestMove(currentFen, engineConfig)
        : null;

      let moveObj = null;

      if (bestUci) {
        moveObj = applyUciMove(bestUci);
      }

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

  useEffect(() => {
    if (gameMode === 'ai' && playerColor === 'b' && moveHistory.length === 0 && !gameOver && stockfishReady) {
      getAIMove();
    }
  }, [playerColor, stockfishReady]);

  useEffect(() => {
    if (!premove || gameOver || gameMode === 'local') return;
    if (game.turn() !== playerColor) return;

    try {
      const moves = game.moves({ square: premove.from, verbose: true });
      const targetMove = moves.find(m => m.to === premove.to);
      if (targetMove) {
        const moveOptions = { from: premove.from, to: premove.to };
        // Premoves always auto-queen
        if (targetMove.promotion) moveOptions.promotion = 'q';
        const move = game.move(moveOptions);
        if (move) {
          setPremove(null);
          onMoveMade(move);
          return;
        }
      }
    } catch (e) {
    }
    setPremove(null);
  }, [fen]);

  const handleSquareClick = (square, selectedSquare) => {
    const isLocal = gameMode === 'local';
    const currentTurnColor = game.turn();
    if (gameOver) return null;

    if (pendingPromotion) {
      setPendingPromotion(null);
      return null;
    }

    const isPlayerTurn = isLocal || currentTurnColor === playerColor;

    if (!isPlayerTurn) {
      if (selectedSquare) {
        const clickedPiece = game.get(square);
        if (clickedPiece && clickedPiece.color === playerColor) {
          setPremove(null);
          return square;
        }
        setPremove({ from: selectedSquare, to: square });
        return null;
      }
      const piece = game.get(square);
      if (piece && piece.color === playerColor) {
        setPremove(null);
        return square;
      }
      setPremove(null);
      return null;
    }

    if (isAiThinking) return null;
    setPremove(null);

    if (selectedSquare) {
      try {
        const moves = game.moves({ square: selectedSquare, verbose: true });
        const promotionMove = moves.find(m => m.to === square && m.promotion);

        if (promotionMove) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return null;
        }

        const move = game.move({ from: selectedSquare, to: square });
        if (move) {
          onMoveMade(move);
          return null;
        }
      } catch (e) {
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

  const undoMove = () => {
    if (gameOver || moveHistory.length === 0 || isAiThinking) return false;

    const undoOne = () => {
      const undone = game.undo();
      if (!undone) return null;
      setMoveHistory(prev => prev.slice(0, -1));
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
      // Undo both AI + player move for a full turn
      if (moveHistory.length >= 2) {
        undoOne();
        undoOne();
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
    }
  };

  const loadGameFromMoves = (sanList) => {
    const newGame = new Chess();
    const history = [];
    const caps = { w: [], b: [] };
    for (const san of sanList) {
      try {
        const moveObj = newGame.move(san);
        if (moveObj) {
          history.push(moveObj);
          if (moveObj.captured) {
            caps[moveObj.color].push(moveObj.captured);
          }
        }
      } catch (e) {
        break;
      }
    }
    setGame(newGame);
    setFen(newGame.fen());
    setMoveHistory(history);
    setCaptured(caps);
    setViewingMoveIndex(null);
    setPendingPromotion(null);
    setPremove(null);
    setGameOver(false);
    setGameResult(null);
    setIsAiThinking(false);
  };

  return {
    game, fen, moveHistory, gameOver, gameResult, captured, isAiThinking,
    playerColor, setPlayerColor, handleSquareClick, resetGame, undoMove, hintArrow, resign, forceGameOver, forceGameOverStructured, makeExternalMove, loadGameFromMoves,
    viewingGame, viewingMoveIndex, isViewingHistory, goToMove, goBack, goForward, goToStart, goToEnd,
    pendingPromotion, premove, completePromotion, cancelPromotion
  };
}
