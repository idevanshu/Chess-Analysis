import React, { useState, useEffect } from 'react';
import { PIECE_SVG, getSquareName, getSquareCoords } from './utils';

export default React.memo(function ChessBoard({ game, flipped, selectedSquare, handleSquareClick, lastMove, hintArrow }) {
  const [legalMoves, setLegalMoves] = useState([]);
  const board = game.board();

  useEffect(() => {
    if (selectedSquare) {
      setLegalMoves(game.moves({ square: selectedSquare, verbose: true }).map(m => m.to));
    } else {
      setLegalMoves([]);
    }
  }, [selectedSquare, game.fen()]);

  const renderCells = () => {
    const cells = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = getSquareName(col, row, flipped);
        const isLight = (row + col) % 2 === 0;
        const piece = game.get(sq);

        const isLastMove = lastMove && (sq === lastMove.from || sq === lastMove.to);
        const isSelected = sq === selectedSquare;
        const isLegal = legalMoves.includes(sq);

        // Premium board colors — warm wood tones
        let bg;
        if (isSelected) {
          bg = 'bg-[#D4A746]'; // selected: warm gold
        } else if (isLastMove) {
          bg = isLight ? 'bg-[#DBC47A]' : 'bg-[#B89A4A]'; // last move: muted amber
        } else {
          bg = isLight ? 'bg-[#F0D9B5]' : 'bg-[#B58863]'; // classic brown/wood theme
        }

        cells.push(
          <div
            key={sq}
            onClick={() => handleSquareClick(sq, selectedSquare)}
            className={`relative flex items-center justify-center cursor-pointer w-full h-full ${bg} transition-colors duration-150`}
          >
            {/* Legal move indicators */}
            {isLegal && (
              piece ? (
                // Capture ring
                <div className="absolute inset-[3px] rounded-full border-[3px] border-black/20 pointer-events-none z-10" />
              ) : (
                // Move dot
                <div className="absolute w-[30%] h-[30%] rounded-full bg-black/15 pointer-events-none z-10" />
              )
            )}

            {/* Piece */}
            {piece && (
              <div
                className="w-[82%] h-[82%] z-[2] flex items-center justify-center transition-transform duration-100 hover:scale-110 cursor-grab active:cursor-grabbing"
                style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.4))' }}
                dangerouslySetInnerHTML={{ __html: PIECE_SVG[piece.color + piece.type.toUpperCase()] }}
              />
            )}

            {/* Coordinates */}
            {col === 0 && (
              <span className={`absolute top-[2px] left-[4px] text-[10px] font-bold pointer-events-none z-[3] select-none ${isLight ? 'text-[#B58863]' : 'text-[#F0D9B5]'}`}>
                {flipped ? row + 1 : 8 - row}
              </span>
            )}
            {row === 7 && (
              <span className={`absolute bottom-[1px] right-[4px] text-[10px] font-bold pointer-events-none z-[3] select-none ${isLight ? 'text-[#B58863]' : 'text-[#F0D9B5]'}`}>
                {flipped ? 'hgfedcba'[col] : 'abcdefgh'[col]}
              </span>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="relative w-full aspect-square">
      {/* Outer wooden frame */}
      <div className="absolute -inset-[6px] rounded-lg bg-gradient-to-br from-[#6B4F3A] via-[#5A422E] to-[#4A3626] shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]" />
      {/* Board */}
      <div className="relative rounded-[3px] overflow-hidden z-10">
        <div className="grid grid-cols-8 grid-rows-8 w-full aspect-square select-none">
          {renderCells()}
        </div>

        {/* Hint arrow overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 8 8">
          <defs>
            <marker id="arrowhead-hint" markerWidth="3" markerHeight="4" refX="2" refY="2" orient="auto">
              <polygon points="0 0, 3 2, 0 4" fill="rgba(100,200,100,0.9)"/>
            </marker>
          </defs>
          {hintArrow && (
            <line
              x1={getSquareCoords(hintArrow.from, flipped).col + 0.5}
              y1={getSquareCoords(hintArrow.from, flipped).row + 0.5}
              x2={getSquareCoords(hintArrow.to, flipped).col + 0.5}
              y2={getSquareCoords(hintArrow.to, flipped).row + 0.5}
              stroke="rgba(100,200,100,0.9)"
              strokeWidth="0.18"
              markerEnd="url(#arrowhead-hint)"
              strokeLinecap="round"
            />
          )}
        </svg>
      </div>
    </div>
  );
});
