import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, BarChart3, ArrowLeft, RotateCcw } from 'lucide-react';

// Move classification thresholds (centipawn loss) and styling
const MOVE_CLASSES = {
  best:       { label: 'Best',       color: '#96bc4b', symbol: '\u2605' },
  excellent:  { label: 'Excellent',  color: '#96bc4b', symbol: '' },
  good:       { label: 'Good',       color: '#7fae3e', symbol: '' },
  inaccuracy: { label: 'Inaccuracy', color: '#f7c631', symbol: '?!' },
  mistake:    { label: 'Mistake',    color: '#e6912c', symbol: '?' },
  blunder:    { label: 'Blunder',    color: '#ca3431', symbol: '??' },
};

function classifyByCpLoss(cpLoss) {
  if (cpLoss <= 0) return 'best';
  if (cpLoss <= 10) return 'excellent';
  if (cpLoss <= 25) return 'good';
  if (cpLoss <= 50) return 'inaccuracy';
  if (cpLoss <= 100) return 'mistake';
  return 'blunder';
}

// Chess.com-style accuracy formula per move
function moveAccuracyScore(cpLoss) {
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.abs(cpLoss)) - 3.1669));
}

// Convert engine eval (from side-to-move perspective) to white's perspective
function normalizeToWhite(evaluation, sideToMove) {
  if (!evaluation) return 0;
  if (evaluation.type === 'mate') {
    const v = sideToMove === 'w' ? evaluation.value : -evaluation.value;
    return v > 0 ? 10000 : -10000;
  }
  return sideToMove === 'w' ? evaluation.value : -evaluation.value;
}

// Sigmoid mapping: centipawns → eval bar percentage (white's share)
function cpToBarPercent(cp) {
  return Math.round(Math.max(2, Math.min(98, 50 + 50 * (2 / (1 + Math.exp(-cp / 400)) - 1))));
}

function formatEvalText(cpWhitePOV) {
  if (Math.abs(cpWhitePOV) >= 10000) return cpWhitePOV > 0 ? 'M' : '-M';
  const val = cpWhitePOV / 100;
  if (Math.abs(val) < 0.05) return '0.0';
  return val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
}

// ======================== Eval Bar ========================
export function EvalBar({ whitePercent = 50, evalText = '0.0', flipped = false }) {
  const whiteOnBottom = !flipped;

  return (
    <div className="w-[22px] shrink-0 mr-1.5 rounded-lg overflow-hidden relative" style={{ minHeight: '100%', border: '1px solid var(--border-color)' }}>
      <div className="absolute inset-0" style={{ background: '#2a2520' }} />
      <div
        className="absolute left-0 right-0 transition-all duration-500 ease-out"
        style={{ ...(whiteOnBottom ? { bottom: 0 } : { top: 0 }), height: `${whitePercent}%`, background: '#e8dcc8' }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="text-[7px] font-bold tracking-tight"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            color: whitePercent >= 50 ? '#302e2b' : '#d9d5cf',
          }}
        >
          {evalText}
        </span>
      </div>
    </div>
  );
}

// ======================== Main Analysis Component ========================
export default function GameAnalysis({
  moveHistory, playerColor, gameResult, gameMode, currentPlayer, opponentName,
  onClose, onNewGame, onBackToMenu,
  goToMove, goBack, goForward, goToStart, goToEnd, viewingMoveIndex,
  onEvalUpdate,
}) {
  const [evaluations, setEvaluations] = useState([]);
  const [moveAnalyses, setMoveAnalyses] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const startedRef = useRef(false);
  const movesScrollRef = useRef(null);

  // Build list of FENs: starting position + after each move
  const positions = useMemo(() => {
    if (!moveHistory.length) return [];
    const fens = [moveHistory[0].before || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'];
    moveHistory.forEach(m => fens.push(m.after));
    return fens;
  }, [moveHistory]);

  // Run Stockfish analysis on every position
  useEffect(() => {
    if (!positions.length || startedRef.current) return;
    startedRef.current = true;

    const worker = new Worker('/js/stockfish-18-lite-single.js');
    let resolveEval = null;
    let lastEval = null;
    let ready = false;

    worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : '';

      if (line === 'uciok') {
        worker.postMessage('setoption name UCI_LimitStrength value false');
        worker.postMessage('isready');
        return;
      }
      if (line === 'readyok' && !ready) {
        ready = true;
        runAnalysis();
        return;
      }
      // Parse eval from info lines
      if (line.startsWith('info') && line.includes(' score ')) {
        const mate = line.match(/score mate (-?\d+)/);
        const cp = line.match(/score cp (-?\d+)/);
        if (mate) lastEval = { type: 'mate', value: parseInt(mate[1]) };
        else if (cp) lastEval = { type: 'cp', value: parseInt(cp[1]) };
      }
      if (line.startsWith('bestmove') && resolveEval) {
        const r = resolveEval;
        resolveEval = null;
        r(lastEval || { type: 'cp', value: 0 });
        lastEval = null;
      }
    };

    worker.onerror = () => setError('Stockfish engine failed to load');
    worker.postMessage('uci');

    function evalPos(fen) {
      return new Promise(resolve => {
        resolveEval = resolve;
        lastEval = null;
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage('go depth 14');
      });
    }

    async function runAnalysis() {
      const evals = [];
      const analyses = [];

      for (let i = 0; i < positions.length; i++) {
        try {
          const ev = await evalPos(positions[i]);
          evals.push(ev);
        } catch {
          evals.push({ type: 'cp', value: 0 });
        }

        setEvaluations([...evals]);
        setProgress(Math.round(((i + 1) / positions.length) * 100));

        // Classify each move once we have before + after eval
        if (i > 0) {
          const mi = i - 1;
          const move = moveHistory[mi];
          const stmBefore = positions[mi].split(' ')[1];
          const stmAfter = positions[i].split(' ')[1];
          const evBefore = normalizeToWhite(evals[mi], stmBefore);
          const evAfter = normalizeToWhite(evals[i], stmAfter);

          // CP loss from the mover's perspective
          let cpLoss = move.color === 'w' ? evBefore - evAfter : evAfter - evBefore;
          cpLoss = Math.max(0, cpLoss);

          analyses[mi] = {
            classification: classifyByCpLoss(cpLoss),
            cpLoss,
            accuracy: moveAccuracyScore(cpLoss),
            evalWhite: evAfter,
          };
          setMoveAnalyses([...analyses]);
        }
      }
      setIsAnalyzing(false);
    }

    return () => { worker.postMessage('quit'); worker.terminate(); };
  }, [positions, moveHistory]);

  // Current eval for the bar (based on which move is being viewed)
  const currentEvalData = useMemo(() => {
    const idx = viewingMoveIndex === null
      ? evaluations.length - 1
      : viewingMoveIndex === -1 ? 0 : viewingMoveIndex + 1;
    if (idx < 0 || idx >= evaluations.length || !positions[idx]) return null;
    const stm = positions[idx].split(' ')[1];
    const cpW = normalizeToWhite(evaluations[idx], stm);
    return { whitePercent: cpToBarPercent(cpW), evalText: formatEvalText(cpW) };
  }, [evaluations, viewingMoveIndex, positions]);

  // Pass eval data up to parent for the eval bar
  useEffect(() => {
    if (onEvalUpdate) onEvalUpdate(currentEvalData);
  }, [currentEvalData]);

  // Accuracy scores per side
  const { whiteAccuracy, blackAccuracy, whiteStats, blackStats } = useMemo(() => {
    const wA = [], bA = [];
    const wS = { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    const bS = { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };

    moveAnalyses.forEach((m, i) => {
      if (!m) return;
      const c = moveHistory[i]?.color;
      if (c === 'w') { wA.push(m.accuracy); wS[m.classification]++; }
      else { bA.push(m.accuracy); bS[m.classification]++; }
    });

    return {
      whiteAccuracy: wA.length ? Math.round(wA.reduce((a, b) => a + b, 0) / wA.length * 10) / 10 : 0,
      blackAccuracy: bA.length ? Math.round(bA.reduce((a, b) => a + b, 0) / bA.length * 10) / 10 : 0,
      whiteStats: wS,
      blackStats: bS,
    };
  }, [moveAnalyses, moveHistory]);

  const currentViewIdx = viewingMoveIndex === null ? moveHistory.length - 1 : viewingMoveIndex;
  const done = !isAnalyzing;

  // Auto-scroll move list to viewed move
  useEffect(() => {
    if (!movesScrollRef.current) return;
    const el = movesScrollRef.current.querySelector(`[data-move="${currentViewIdx}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentViewIdx]);

  const whiteName = gameMode === 'local' ? 'White' : playerColor === 'w' ? 'You' : (gameMode === 'ai' ? currentPlayer?.name : opponentName || 'Opponent');
  const blackName = gameMode === 'local' ? 'Black' : playerColor === 'b' ? 'You' : (gameMode === 'ai' ? currentPlayer?.name : opponentName || 'Opponent');
  const isMultiplayer = gameMode?.includes('multiplayer');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header justify-between shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
          <span>Game Review</span>
        </div>
        <button onClick={onClose} className="btn-ghost p-1 rounded" title="Close analysis">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Analysis progress bar */}
      {isAnalyzing && (
        <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Analyzing with Stockfish...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
          </div>
        </div>
      )}

      {error && <div className="px-3 py-2 text-xs" style={{ color: 'var(--danger)', background: 'rgba(179,52,48,0.1)' }}>{error}</div>}

      {/* Accuracy scores */}
      <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex gap-2">
          <AccuracyCard name={whiteName} accuracy={whiteAccuracy} pieceIcon="\u2654" />
          <AccuracyCard name={blackName} accuracy={blackAccuracy} pieceIcon="\u265A" />
        </div>
      </div>

      {/* Move classification stats */}
      {done && (
        <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex gap-3">
            <StatsColumn stats={whiteStats} />
            <div className="w-px" style={{ background: 'var(--border-subtle)' }} />
            <StatsColumn stats={blackStats} />
          </div>
        </div>
      )}

      {/* Move list with classifications */}
      <div className="flex-1 overflow-y-auto p-2 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }} ref={movesScrollRef}>
        {moveHistory.length === 0 ? (
          <div className="text-center py-4" style={{ color: 'var(--text-dim)' }}>No moves to analyze</div>
        ) : (
          <div className="grid grid-cols-[28px_1fr_1fr] gap-x-2 gap-y-0.5 items-center px-1">
            {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
              const wIdx = i * 2;
              const bIdx = i * 2 + 1;
              return (
                <React.Fragment key={i}>
                  <span className="move-number">{i + 1}.</span>
                  <MoveCell san={moveHistory[wIdx]?.san} analysis={moveAnalyses[wIdx]} isActive={wIdx === currentViewIdx} onClick={() => goToMove(wIdx)} dataIdx={wIdx} />
                  {moveHistory[bIdx] ? (
                    <MoveCell san={moveHistory[bIdx]?.san} analysis={moveAnalyses[bIdx]} isActive={bIdx === currentViewIdx} onClick={() => goToMove(bIdx)} dataIdx={bIdx} />
                  ) : <span />}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation controls */}
      {moveHistory.length > 0 && (
        <div className="flex items-center justify-center gap-1 px-2 py-1.5 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {[
            { fn: goToStart, disabled: viewingMoveIndex === -1, icon: ChevronsLeft, tip: 'First move' },
            { fn: goBack, disabled: viewingMoveIndex === -1, icon: ChevronLeft, tip: 'Previous' },
            { fn: goForward, disabled: viewingMoveIndex === null, icon: ChevronRight, tip: 'Next' },
            { fn: goToEnd, disabled: viewingMoveIndex === null, icon: ChevronsRight, tip: 'Last move' },
          ].map((b, i) => (
            <button key={i} onClick={b.fn} disabled={b.disabled} className="btn btn-ghost btn-sm p-1.5" title={b.tip}>
              <b.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="px-3 py-2 flex gap-2 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {!isMultiplayer && (
          <button onClick={onNewGame} className="btn btn-primary flex-1 text-xs py-2">
            <RotateCcw className="w-3 h-3" /> Play Again
          </button>
        )}
        <button onClick={onBackToMenu} className="btn flex-1 text-xs py-2">
          <ArrowLeft className="w-3 h-3" /> Menu
        </button>
      </div>
    </div>
  );
}

// ======================== Sub-components ========================

function AccuracyCard({ name, accuracy, pieceIcon }) {
  return (
    <div className="flex-1 p-2 rounded" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2">
        <AccuracyRing value={accuracy} size={36} />
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-wider font-semibold truncate flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <span>{pieceIcon}</span> {name}
          </div>
          <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{accuracy}%</div>
        </div>
      </div>
    </div>
  );
}

function StatsColumn({ stats }) {
  return (
    <div className="flex-1 flex flex-col gap-0.5">
      {['best', 'inaccuracy', 'mistake', 'blunder'].map(cls => (
        <div key={cls} className="flex items-center gap-1.5 text-[10px]">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MOVE_CLASSES[cls].color }} />
          <span className="flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{MOVE_CLASSES[cls].label}</span>
          <span className="font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>{stats[cls] || 0}</span>
        </div>
      ))}
    </div>
  );
}

function MoveCell({ san, analysis, isActive, onClick, dataIdx }) {
  const cls = analysis ? MOVE_CLASSES[analysis.classification] : null;
  const showSymbol = cls?.symbol && ['blunder', 'mistake', 'inaccuracy', 'best'].includes(analysis?.classification);

  return (
    <span
      data-move={dataIdx}
      onClick={onClick}
      className="px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-0.5 text-xs"
      style={
        isActive && cls
          ? { backgroundColor: `${cls.color}22`, color: cls.color, boxShadow: `inset 0 0 0 1px ${cls.color}55` }
          : isActive
            ? { backgroundColor: 'var(--accent-muted)', color: 'var(--accent-hover)', boxShadow: 'inset 0 0 0 1px rgba(184,134,11,0.3)' }
            : cls && ['blunder', 'mistake'].includes(analysis?.classification)
              ? { color: cls.color }
              : { color: 'var(--text-primary)' }
      }
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = ''; }}
    >
      {showSymbol && <span className="text-[8px] font-bold" style={{ color: cls.color }}>{cls.symbol}</span>}
      <span>{san}</span>
    </span>
  );
}

function AccuracyRing({ value, size = 40 }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const offset = c - (v / 100) * c;
  const color = v >= 80 ? '#96bc4b' : v >= 50 ? '#f7c631' : '#ca3431';

  return (
    <svg width={size} height={size} className="transform -rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}
