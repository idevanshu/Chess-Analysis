import { useState, useEffect, useRef } from 'react';
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
  const { isReady: stockfishReady, getBestMove } = useStockfish();

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

  const handleSquareClick = (square, selectedSquare) => {
    const isLocal = gameMode === 'local';
    const currentTurnColor = game.turn();
    if (gameOver || isAiThinking) return null;
    if (!isLocal && currentTurnColor !== playerColor) return null;

    if (selectedSquare) {
      try {
        const moves = game.moves({ square: selectedSquare, verbose: true });
        const isPromotion = moves.some(m => m.to === square && m.promotion);
        
        const moveOptions = { from: selectedSquare, to: square };
        if (isPromotion) moveOptions.promotion = 'q';

        const move = game.move(moveOptions);
        if (move) {
          onMoveMade(move);
          return null; // deselect
        }
      } catch (e) {
        // invalid move, check if it's our own piece to select
      }
    }

    const piece = game.get(square);
    if (piece) {
      if (isLocal && piece.color === currentTurnColor) return square;
      if (!isLocal && piece.color === playerColor) return square;
    }
    return null;
  };

  const onMoveMade = (move) => {
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
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      setGameResult(`Checkmate! ${winner} Wins!`);
      setGameOver(true);
      return true;
    } else if (game.isDraw()) {
      setGameResult('Draw!');
      setGameOver(true);
      return true;
    }
    return false;
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
    setIsAiThinking(false);
  };

  const resign = () => {
    if (gameOver) return;
    setGameOver(true);
    setGameResult('You resigned. Opponent Wins!');
  };

  const forceGameOver = (result) => {
    setGameOver(true);
    setGameResult(result);
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
    playerColor, setPlayerColor, handleSquareClick, resetGame, hintArrow, resign, forceGameOver, makeExternalMove
  };
}
