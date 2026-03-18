import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

// Fallback for older versions of chess.js that export default
const createChessInstance = () => {
    try {
        return new Chess();
    } catch {
        // If it fails, try requiring it directly or accessing default
        const ChessConstructor = window.Chess || require('chess.js');
        return new ChessConstructor();
    }
}

export function useChessLogic(currentPlayer, hintsEnabled) {
  const [game, setGame] = useState(() => {
    try { return new Chess(); } 
    catch(e) { 
        const ChessImport = require('chess.js'); 
        return new (ChessImport.Chess || ChessImport)(); 
    }
  });
  const [fen, setFen] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [captured, setCaptured] = useState({ w: [], b: [] });
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [playerColor, setPlayerColor] = useState('w');
  const [hintArrow, setHintArrow] = useState(null);

  const getAIMove = () => {
    if (gameOver) return;
    setIsAiThinking(true);
    
    // Store valid moves outside so they map correctly to the CURRENT board state
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) {
        setIsAiThinking(false);
        return;
    }
    
    setTimeout(() => {
      // Very simple greedy AI: Take a piece with the highest value if possible, else random
      let chosenMove = moves[Math.floor(Math.random() * moves.length)];
      
      const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
      let bestValue = -1;

      for (let move of moves) {
        if (move.captured) {
           const val = pieceValues[move.captured];
           // Adjust value slightly based on opponent strength simulating errors
           if (val > bestValue && Math.random() < (currentPlayer?.skillLevel || 10) / 20 * 1.5) {
             bestValue = val;
             chosenMove = move;
           }
        }
      }

      try {
        const moveObj = game.move(chosenMove.san);
        if (moveObj) {
            setFen(game.fen());
            setMoveHistory((prev) => [...prev, moveObj]);
            
            if (moveObj.captured) {
              setCaptured(prev => ({
                ...prev,
                [moveObj.color]: [...prev[moveObj.color], moveObj.captured]
              }));
            }
            if (!checkGameOver()) {
                setIsAiThinking(false);
            }
        }
      } catch (e) {
        console.error("AI Move error", e);
      }
    }, currentPlayer?.moveTime || 800);
  };

  const requestHint = () => {
    if (gameOver || game.turn() !== playerColor) return;
    const moves = game.moves({ verbose: true });
    if (moves.length > 0) {
      // Just suggest a random valid move as a fallback since no Stockfish
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

  const handleSquareClick = (square, selectedSquare) => {
    if (gameOver || isAiThinking || game.turn() !== playerColor) return null;

    if (selectedSquare) {
      try {
        const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
        if (move) {
          onMoveMade(move);
          return null; // deselect
        }
      } catch (e) {
        // invalid move, check if it's our own piece to select
      }
    }

    const piece = game.get(square);
    if (piece && piece.color === playerColor) {
      return square;
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

    if (!isOver && game.turn() !== playerColor) {
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
    
    if (playerColor === 'b') {
      setIsAiThinking(true);
      setTimeout(getAIMove, 500);
    }
  };

  const resign = () => {
    if (gameOver) return;
    setGameOver(true);
    setGameResult('You resigned. Opponent Wins!');
  };

  return {
    game, fen, moveHistory, gameOver, gameResult, captured, isAiThinking,
    playerColor, setPlayerColor, handleSquareClick, resetGame, hintArrow, resign
  };
}
