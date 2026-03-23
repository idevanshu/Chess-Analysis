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

  // Legal moves for selected piece
  useEffect(() => {
    if (selectedSquare) {
      try {
        setLegalMoves(game.moves({ square: selectedSquare, verbose: true }).map(m => m.to));
      } catch { setLegalMoves([]); }
    } else {
      setLegalMoves([]);
    }
  }, [selectedSquare, game.fen()]);

  // Clear user annotations when position changes
  useEffect(() => {
    setUserArrows([]);
    setHighlightSquares([]);
  }, [game.fen()]);

  // Find king in check
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

  // Get square from viewport coordinates
  const getSquareAt = useCallback((cx, cy) => {
    if (!boardRef.current) return null;
    const r = boardRef.current.getBoundingClientRect();
    const col = Math.floor((cx - r.left) / (r.width / 8));
    const row = Math.floor((cy - r.top) / (r.height / 8));
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return getSquareName(col, row, flipped);
  }, [flipped]);

  // ─── Cell mouse down ───
  const onCellDown = useCallback((e, sq) => {
    // Block board interaction during promotion chooser
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

  // ─── Cell touch start ───
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

  // ─── Global event listeners ───
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragInfo.current.active) return;
      const dx = Math.abs(e.clientX - dragInfo.current.startX);
      const dy = Math.abs(e.clientY - dragInfo.current.startY);
      if (dx > 3 || dy > 3) dragInfo.current.moved = true;
      setDragGhost(prev => prev ? { ...prev, x: e.clientX, y: e.clientY, moved: dragInfo.current.moved } : null);
    };

    const onMouseUp = (e) => {
      // ── Right-click: finish arrow ──
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
          } catch (err) {
            // Silently handle any arrow drawing errors
          }
          arrowStart.current = null;
        }
        return;
      }

      // ── Left-click: finish drag ──
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

  // Ghost piece size
  const cellSize = dragGhost?.moved && boardRef.current
    ? boardRef.current.getBoundingClientRect().width / 8 : 0;

  // ─── Render cells ───
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

        let bg;
        if (isInCheck) {
          bg = 'bg-[#E84040]';
        } else if (isHighlighted) {
          bg = isLight ? 'bg-[#E8A83E]' : 'bg-[#D4922E]';
        } else if (isSelected) {
          bg = 'bg-[#D4A746]';
        } else if (isLastMove) {
          bg = isLight ? 'bg-[#DBC47A]' : 'bg-[#B89A4A]';
        } else {
          bg = isLight ? 'bg-[#F0D9B5]' : 'bg-[#B58863]';
        }

        cells.push(
          <div
            key={sq}
            onMouseDown={(e) => onCellDown(e, sq)}
            onTouchStart={(e) => onCellTouchStart(e, sq)}
            className={`relative flex items-center justify-center cursor-pointer w-full h-full ${bg} transition-colors duration-150`}
          >
            {isInCheck && (
              <div className="absolute inset-0 shadow-[inset_0_0_12px_rgba(239,68,68,0.7)] pointer-events-none z-[1] rounded-sm" />
            )}
            {isPremove && (
              <div
                className="absolute inset-0 pointer-events-none z-[1]"
                style={{
                  background: isLight
                    ? 'rgba(20, 85, 180, 0.41)'
                    : 'rgba(20, 85, 180, 0.48)',
                }}
              />
            )}
            {isLegal && (
              piece ? (
                <div className="absolute inset-[3px] rounded-full border-[3px] border-black/20 pointer-events-none z-10" />
              ) : (
                <div className="absolute w-[30%] h-[30%] rounded-full bg-black/15 pointer-events-none z-10" />
              )
            )}
            {piece && (
              <div
                className={`w-[82%] h-[82%] z-[2] flex items-center justify-center transition-transform duration-100 ${
                  isDragSource ? 'opacity-30' : 'hover:scale-110'
                } cursor-grab active:cursor-grabbing ${isInCheck ? 'animate-pulse' : ''}`}
                style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.4))' }}
                dangerouslySetInnerHTML={{ __html: PIECE_SVG[piece.color + piece.type.toUpperCase()] }}
              />
            )}
            {col === 0 && (
              <span className={`absolute top-[2px] left-[4px] text-[10px] font-bold pointer-events-none z-[3] select-none ${
                isLight && !isHighlighted ? 'text-[#B58863]' : 'text-[#F0D9B5]'
              }`}>
                {flipped ? row + 1 : 8 - row}
              </span>
            )}
            {row === 7 && (
              <span className={`absolute bottom-[1px] right-[4px] text-[10px] font-bold pointer-events-none z-[3] select-none ${
                isLight && !isHighlighted ? 'text-[#B58863]' : 'text-[#F0D9B5]'
              }`}>
                {flipped ? 'hgfedcba'[col] : 'abcdefgh'[col]}
              </span>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  // ─── Promotion overlay ───
  const renderPromotionOverlay = () => {
    if (!pendingPromotion || !onPromote || !boardRef.current) return null;

    const { col, row } = getSquareCoords(pendingPromotion.to, flipped);
    const promotionColor = game.turn();
    const pieces = ['q', 'r', 'b', 'n'];
    const goesDown = row <= 3;

    return (
      <>
        {/* Dim backdrop */}
        <div
          className="absolute inset-0 bg-black/40 z-30 cursor-pointer"
          onMouseDown={(e) => { e.stopPropagation(); onCancelPromotion?.(); }}
        />
        {/* Piece choices */}
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
              className="flex items-center justify-center cursor-pointer z-40 bg-white/95 hover:bg-cyan-100 border border-gray-300/50 shadow-lg transition-colors"
            >
              <div
                className="w-[80%] h-[80%]"
                style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))' }}
                dangerouslySetInnerHTML={{ __html: PIECE_SVG[promotionColor + p.toUpperCase()] }}
              />
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="relative w-full aspect-square" style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}>
      {/* Outer wooden frame */}
      <div className="absolute -inset-[6px] rounded-lg bg-gradient-to-br from-[#6B4F3A] via-[#5A422E] to-[#4A3626] shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]" />

      {/* Board */}
      <div className="relative rounded-[3px] overflow-hidden z-10" onContextMenu={(e) => e.preventDefault()}>
        <div ref={boardRef} className="grid grid-cols-8 grid-rows-8 w-full aspect-square select-none">
          {renderCells()}
        </div>

        {/* Promotion overlay */}
        {renderPromotionOverlay()}

        {/* SVG overlay for arrows */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 8 8">
          <defs>
            <marker id="arrowhead-hint" markerWidth="3" markerHeight="4" refX="2" refY="2" orient="auto">
              <polygon points="0 0, 3 2, 0 4" fill="rgba(100,200,100,0.9)"/>
            </marker>
            <marker id="arrowhead-user" markerWidth="3" markerHeight="4" refX="2" refY="2" orient="auto">
              <polygon points="0 0, 3 2, 0 4" fill="rgba(235,149,50,0.9)"/>
            </marker>
          </defs>

          {/* User-drawn strategy arrows */}
          {userArrows.map(a => {
            if (!a || !a.from || !a.to) return null;
            const fromC = getSquareCoords(a.from, flipped);
            const toC = getSquareCoords(a.to, flipped);
            return (
              <line
                key={a.key}
                x1={fromC.col + 0.5} y1={fromC.row + 0.5}
                x2={toC.col + 0.5} y2={toC.row + 0.5}
                stroke="rgba(235,149,50,0.85)"
                strokeWidth="0.22"
                markerEnd="url(#arrowhead-user)"
                strokeLinecap="round"
              />
            );
          })}

          {/* Hint arrow */}
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
