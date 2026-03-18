import React, { useState, useEffect } from 'react';
import { PIECE_SVG, getSquareName, getSquareCoords } from './utils';

export default function ChessBoard({ game, flipped, selectedSquare, handleSquareClick, lastMove, hintArrow }) {
  const [legalMoves, setLegalMoves] = useState([]);
  const board = game.board();

  useEffect(() => {
    if (selectedSquare) {
      setLegalMoves(game.moves({ square: selectedSquare, verbose: true }).map(m => m.to));
    } else {
      setLegalMoves([]);
    }
  }, [selectedSquare, game.fen()]);

  const selectSquare = (sq) => {
    const newSelected = handleSquareClick(sq, selectedSquare);
    if (newSelected !== undefined) {
      // Parent component updates selectedSquare state which passes down
    }
  };

  const renderCells = () => {
    const cells = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = getSquareName(col, row, flipped);
        const isLight = (row + col) % 2 === 0;
        const piece = game.get(sq);
        
        // Colors - sleek premium slate/blue theme
        let bgClass = isLight ? 'bg-[#dee3e6]' : 'bg-[#8ea4b2]';
        
        // highlight last move (soft yellow/green overlay)
        if (lastMove && (sq === lastMove.from || sq === lastMove.to)) {
          bgClass = isLight ? 'bg-[#ccd985]' : 'bg-[#a3b858]';
        }
        if (sq === selectedSquare) bgClass = 'bg-[#e2e65a]';

        cells.push(
          <div
            key={sq}
            onClick={() => handleSquareClick(sq, selectedSquare)}
            className={`relative flex items-center justify-center cursor-pointer transition-colors duration-200 hover:brightness-110 ${bgClass}`}
            style={{ width: '100%', paddingBottom: '100%' }}
          >
            {/* Legal move indicators */}
            {legalMoves.includes(sq) && (
              piece ? (
                <div className="absolute inset-0 border-[5px] border-emerald-500/60 rounded-sm pointer-events-none z-10 box-border" />
              ) : (
                <div className="absolute w-[28%] h-[28%] top-[36%] left-[36%] rounded-full bg-emerald-500/50 pointer-events-none z-10 shadow-inner" />
              )
            )}

            {/* Piece SVG */}
            {piece && (
              <div 
                className="absolute inset-[2%] w-[96%] h-[96%] transition-transform hover:scale-[1.12] z-[2] drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] flex items-center justify-center cursor-grab active:cursor-grabbing"
                dangerouslySetInnerHTML={{ __html: PIECE_SVG[piece.color + piece.type.toUpperCase()] }}
              />
            )}

            {/* Coordinates */}
            {col === 0 && (
              <span className={`absolute top-1 left-1.5 text-[11px] font-bold pointer-events-none z-[3] ${isLight ? 'text-[#8ea4b2]' : 'text-[#dee3e6]'}`}>
                {flipped ? row + 1 : 8 - row}
              </span>
            )}
            {row === 7 && (
              <span className={`absolute bottom-0.5 right-1.5 text-[11px] font-bold pointer-events-none z-[3] ${isLight ? 'text-[#8ea4b2]' : 'text-[#dee3e6]'}`}>
                {flipped ? 'gfedcbah'[col] : 'abcdefgh'[col]}
              </span>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="relative w-full max-w-[480px] aspect-square rounded overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_0_2px_rgba(255,255,255,0.08)] shrink-0">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full select-none">
        {renderCells()}
      </div>

      {/* Suggestion Arrow Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 8 8">
        <defs>
          <marker id="arrowhead-hint" markerWidth="3" markerHeight="4" refX="2" refY="2" orient="auto">
            <polygon points="0 0, 3 2, 0 4" fill="rgba(100,255,100,0.85)"/>
          </marker>
        </defs>
        {hintArrow && (
          <line
            x1={getSquareCoords(hintArrow.from, flipped).col + 0.5}
            y1={getSquareCoords(hintArrow.from, flipped).row + 0.5}
            x2={getSquareCoords(hintArrow.to, flipped).col + 0.5}
            y2={getSquareCoords(hintArrow.to, flipped).row + 0.5}
            stroke="rgba(100,255,100,0.85)"
            strokeWidth="0.15"
            markerEnd="url(#arrowhead-hint)"
          />
        )}
      </svg>
    </div>
  );
}
