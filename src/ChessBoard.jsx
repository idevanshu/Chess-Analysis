import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PIECE_SVG, getSquareName, getSquareCoords } from './utils';

export default React.memo(function ChessBoard({
  game, flipped, selectedSquare, handleSquareClick, lastMove, hintArrow,
  pendingPromotion, premove, onPromote, onCancelPromotion, playerColor, gameMode
}) {
  const [legalMoves, setLegalMoves] = useState([]);
  const [dragGhost, setDragGhost] = useState(null);
  const [userArrows, setUserArrows] = useState([]);
  const [highlightSquares, setHighlightSquares] = useState([]);

  const boardRef = useRef(null);
  const dragInfo = useRef({ active: false, sq: null, piece: null, moved: false, startX: 0, startY: 0 });
  const arrowStart = useRef(null);
  const handleClickRef = useRef(handleSquareClick);
  handleClickRef.current = handleSquareClick;
  const selectedRef = useRef(selectedSquare);
  selectedRef.current = selectedSquare;

  useEffect(() => {
    if (selectedSquare) {
      try {
        setLegalMoves(game.moves({ square: selectedSquare, verbose: true }).map(m => m.to));
      } catch { setLegalMoves([]); }
    } else {
      setLegalMoves([]);
    }
  }, [selectedSquare, game.fen()]);

  useEffect(() => {
    setUserArrows([]);
    setHighlightSquares([]);
  }, [game.fen()]);

  const inCheck = game.isCheck();
  let checkSquare = null;
  if (inCheck) {
    const turnColor = game.turn();
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const sq = getSquareName(c, r, false);
        const p = game.get(sq);
        if (p && p.type === 'k' && p.color === turnColor) checkSquare = sq;
      }
  }

  const getSquareAt = useCallback((cx, cy) => {
    if (!boardRef.current) return null;
    const r = boardRef.current.getBoundingClientRect();
    const col = Math.floor((cx - r.left) / (r.width / 8));
    const row = Math.floor((cy - r.top) / (r.height / 8));
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return getSquareName(col, row, flipped);
  }, [flipped]);

  const onCellDown = useCallback((e, sq) => {
    if (pendingPromotion) return;
    if (e.button === 2) { arrowStart.current = sq; return; }
    if (e.button !== 0) return;

    setUserArrows([]); setHighlightSquares([]);

    const piece = game.get(sq);
    const fenBefore = game.fen();
    handleClickRef.current(sq, selectedRef.current);
    const moveHappened = game.fen() !== fenBefore;

    const canDrag = piece && !moveHappened && (
      piece.color === game.turn() ||
      (gameMode !== 'local' && playerColor && piece.color === playerColor)
    );
    if (canDrag) {
      dragInfo.current = { active: true, sq, piece, moved: false, startX: e.clientX, startY: e.clientY };
      setDragGhost({ x: e.clientX, y: e.clientY, sq, pieceKey: piece.color + piece.type.toUpperCase(), moved: false });
    }
  }, [game, pendingPromotion, playerColor, gameMode]);

  const onCellTouchStart = useCallback((e, sq) => {
    if (pendingPromotion) return;
    const t = e.touches[0];
    setUserArrows([]); setHighlightSquares([]);

    const piece = game.get(sq);
    const fenBefore = game.fen();
    handleClickRef.current(sq, selectedRef.current);
    const moveHappened = game.fen() !== fenBefore;

    const canDrag = piece && !moveHappened && (
      piece.color === game.turn() ||
      (gameMode !== 'local' && playerColor && piece.color === playerColor)
    );
    if (canDrag) {
      dragInfo.current = { active: true, sq, piece, moved: false, startX: t.clientX, startY: t.clientY };
      setDragGhost({ x: t.clientX, y: t.clientY, sq, pieceKey: piece.color + piece.type.toUpperCase(), moved: false });
    }
  }, [game, pendingPromotion, playerColor, gameMode]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragInfo.current.active) return;
      const dx = Math.abs(e.clientX - dragInfo.current.startX);
      const dy = Math.abs(e.clientY - dragInfo.current.startY);
      if (dx > 3 || dy > 3) dragInfo.current.moved = true;
      setDragGhost(prev => prev ? { ...prev, x: e.clientX, y: e.clientY, moved: dragInfo.current.moved } : null);
    };

    const onMouseUp = (e) => {
      if (e.button === 2) {
        if (arrowStart.current) {
          try {
            const endSq = getSquareAt(e.clientX, e.clientY);
            if (endSq && typeof endSq === 'string' && endSq.length === 2) {
              const startSq = arrowStart.current;
              if (endSq === startSq) {
                setHighlightSquares(prev =>
                  prev.includes(endSq) ? prev.filter(s => s !== endSq) : [...prev, endSq]
                );
              } else {
                const key = `${startSq}-${endSq}`;
                setUserArrows(prev =>
                  prev.find(a => a.key === key)
                    ? prev.filter(a => a.key !== key)
                    : [...prev, { from: startSq, to: endSq, key }]
                );
              }
            }
          } catch (err) { /* ignore */ }
          arrowStart.current = null;
        }
        return;
      }

      if (dragInfo.current.active && dragInfo.current.moved) {
        const targetSq = getSquareAt(e.clientX, e.clientY);
        if (targetSq && targetSq !== dragInfo.current.sq) {
          handleClickRef.current(targetSq, dragInfo.current.sq);
        }
      }
      dragInfo.current = { active: false, sq: null, piece: null, moved: false, startX: 0, startY: 0 };
      setDragGhost(null);
    };

    const onTouchMove = (e) => {
      if (!dragInfo.current.active) return;
      e.preventDefault();
      const t = e.touches[0];
      dragInfo.current.moved = true;
      setDragGhost(prev => prev ? { ...prev, x: t.clientX, y: t.clientY, moved: true } : null);
    };

    const onTouchEnd = (e) => {
      if (dragInfo.current.active && dragInfo.current.moved) {
        const t = e.changedTouches[0];
        const targetSq = getSquareAt(t.clientX, t.clientY);
        if (targetSq && targetSq !== dragInfo.current.sq) {
          handleClickRef.current(targetSq, dragInfo.current.sq);
        }
      }
      dragInfo.current = { active: false, sq: null, piece: null, moved: false, startX: 0, startY: 0 };
      setDragGhost(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [getSquareAt]);

  const cellSize = dragGhost?.moved && boardRef.current
    ? boardRef.current.getBoundingClientRect().width / 8 : 0;

  // Premium board colors — warm walnut + cream
  const LIGHT_SQ = '#e8dcc8';
  const DARK_SQ = '#a67b5b';
  const SELECTED_SQ = '#7eb86a';
  const LAST_LIGHT = '#d4c896';
  const LAST_DARK = '#a68b52';
  const CHECK_SQ = '#e84040';
  const HIGHLIGHT_LIGHT = '#e8b830';
  const HIGHLIGHT_DARK = '#c49828';

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
        const isInCheck = sq === checkSquare;
        const isHighlighted = highlightSquares.includes(sq);
        const isDragSource = dragGhost?.moved && dragGhost.sq === sq;
        const isPremove = premove && (sq === premove.from || sq === premove.to);

        let bgColor;
        if (isInCheck) {
          bgColor = CHECK_SQ;
        } else if (isHighlighted) {
          bgColor = isLight ? HIGHLIGHT_LIGHT : HIGHLIGHT_DARK;
        } else if (isSelected) {
          bgColor = SELECTED_SQ;
        } else if (isLastMove) {
          bgColor = isLight ? LAST_LIGHT : LAST_DARK;
        } else {
          bgColor = isLight ? LIGHT_SQ : DARK_SQ;
        }

        cells.push(
          <div
            key={sq}
            onMouseDown={(e) => onCellDown(e, sq)}
            onTouchStart={(e) => onCellTouchStart(e, sq)}
            className="relative flex items-center justify-center cursor-pointer w-full h-full select-none"
            style={{ backgroundColor: bgColor }}
          >
            {isInCheck && (
              <div className="absolute inset-0 pointer-events-none z-[1]" style={{ boxShadow: 'inset 0 0 14px rgba(232,64,64,0.7)' }} />
            )}
            {isPremove && (
              <div
                className="absolute inset-0 pointer-events-none z-[1]"
                style={{ background: isLight ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.38)' }}
              />
            )}
            {isLegal && (
              piece ? (
                <div className="absolute inset-[3px] rounded-full border-[3px] pointer-events-none z-10" style={{ borderColor: 'rgba(0,0,0,0.14)' }} />
              ) : (
                <div className="absolute w-[28%] h-[28%] rounded-full pointer-events-none z-10" style={{ background: 'rgba(0,0,0,0.14)' }} />
              )
            )}
            {piece && (
              <div
                className={`w-[85%] h-[85%] z-[2] flex items-center justify-center ${
                  isDragSource ? 'opacity-30' : ''
                } cursor-grab active:cursor-grabbing`}
                style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.35))' }}
                dangerouslySetInnerHTML={{ __html: PIECE_SVG[piece.color + piece.type.toUpperCase()] }}
              />
            )}
            {/* Coordinates */}
            {col === 0 && (
              <span className="absolute top-[2px] left-[3px] text-[10px] font-bold pointer-events-none z-[3] select-none" style={{ color: isLight ? DARK_SQ : LIGHT_SQ, opacity: 0.7 }}>
                {flipped ? row + 1 : 8 - row}
              </span>
            )}
            {row === 7 && (
              <span className="absolute bottom-[1px] right-[3px] text-[10px] font-bold pointer-events-none z-[3] select-none" style={{ color: isLight ? DARK_SQ : LIGHT_SQ, opacity: 0.7 }}>
                {flipped ? 'hgfedcba'[col] : 'abcdefgh'[col]}
              </span>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  const renderPromotionOverlay = () => {
    if (!pendingPromotion || !onPromote || !boardRef.current) return null;

    const { col, row } = getSquareCoords(pendingPromotion.to, flipped);
    const promotionColor = game.turn();
    const pieces = ['q', 'r', 'b', 'n'];
    const goesDown = row <= 3;

    return (
      <>
        <div
          className="absolute inset-0 z-30 cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onMouseDown={(e) => { e.stopPropagation(); onCancelPromotion?.(); }}
        />
        {pieces.map((p, i) => {
          const pieceRow = goesDown ? row + i : row - i;
          return (
            <div
              key={p}
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onPromote(p); }}
              style={{
                position: 'absolute',
                left: `${col * 12.5}%`,
                top: `${pieceRow * 12.5}%`,
                width: '12.5%',
                height: '12.5%',
              }}
              className="flex items-center justify-center cursor-pointer z-40 transition-all duration-150 hover:scale-110"
            >
              <div
                style={{
                  width: '85%',
                  height: '85%',
                  background: 'linear-gradient(135deg, #f5f0e8, #e8dcc8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.4))',
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              >
                <div
                  style={{ width: '80%', height: '80%' }}
                  dangerouslySetInnerHTML={{ __html: PIECE_SVG[promotionColor + p.toUpperCase()] }}
                />
              </div>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="relative w-full aspect-square" style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}>
      {/* Board outer frame */}
      <div className="absolute -inset-[3px] rounded-lg" style={{
        background: 'linear-gradient(135deg, #3d3529, #2a2520)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '6px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }} />

      {/* Board grid */}
      <div className="relative rounded-[2px] overflow-hidden z-10" onContextMenu={(e) => e.preventDefault()}>
        <div ref={boardRef} className="grid grid-cols-8 grid-rows-8 w-full aspect-square select-none">
          {renderCells()}
        </div>

        {renderPromotionOverlay()}

        {/* SVG arrows overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 8 8">
          <defs>
            <marker id="arrowhead-hint" markerWidth="3" markerHeight="4" refX="2" refY="2" orient="auto">
              <polygon points="0 0, 3 2, 0 4" fill="rgba(100,200,100,0.9)"/>
            </marker>
            <marker id="arrowhead-user" markerWidth="3" markerHeight="4" refX="2" refY="2" orient="auto">
              <polygon points="0 0, 3 2, 0 4" fill="rgba(212,168,67,0.9)"/>
            </marker>
          </defs>

          {userArrows.map(a => {
            if (!a || !a.from || !a.to) return null;
            const fromC = getSquareCoords(a.from, flipped);
            const toC = getSquareCoords(a.to, flipped);
            return (
              <line
                key={a.key}
                x1={fromC.col + 0.5} y1={fromC.row + 0.5}
                x2={toC.col + 0.5} y2={toC.row + 0.5}
                stroke="rgba(212,168,67,0.85)"
                strokeWidth="0.22"
                markerEnd="url(#arrowhead-user)"
                strokeLinecap="round"
              />
            );
          })}

          {hintArrow && (() => {
            const fromC = getSquareCoords(hintArrow.from, flipped);
            const toC = getSquareCoords(hintArrow.to, flipped);
            return (
              <line
                x1={fromC.col + 0.5} y1={fromC.row + 0.5}
                x2={toC.col + 0.5} y2={toC.row + 0.5}
                stroke="rgba(100,200,100,0.9)"
                strokeWidth="0.18"
                markerEnd="url(#arrowhead-hint)"
                strokeLinecap="round"
              />
            );
          })()}
        </svg>
      </div>

      {/* Ghost piece during drag */}
      {dragGhost?.moved && cellSize > 0 && (
        <div
          className="fixed pointer-events-none z-[100]"
          style={{
            left: dragGhost.x - cellSize * 0.45,
            top: dragGhost.y - cellSize * 0.55,
            width: cellSize * 0.9,
            height: cellSize * 0.9,
          }}
        >
          <div
            className="w-full h-full opacity-90"
            style={{ filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.5))' }}
            dangerouslySetInnerHTML={{ __html: PIECE_SVG[dragGhost.pieceKey] }}
          />
        </div>
      )}
    </div>
  );
});
