import { useState, useEffect, useRef, useCallback } from 'react';

export function useStockfish() {
  const workerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const callbackRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const worker = new Worker('/js/stockfish-18-lite-single.js');

    worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : '';

      if (line === 'uciok') {
        worker.postMessage('isready');
        return;
      }

      if (line === 'readyok' && !isReady) {
        setIsReady(true);
        return;
      }

      if (line.startsWith('bestmove')) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        const parts = line.split(' ');
        const bestMove = parts[1];
        if (bestMove && bestMove !== '(none)' && callbackRef.current) {
          const cb = callbackRef.current;
          callbackRef.current = null;
          cb(bestMove);
        } else if (callbackRef.current) {
          // No valid move returned; resolve null for fallback
          const cb = callbackRef.current;
          callbackRef.current = null;
          cb(null);
        }
      }
    };

    worker.onerror = () => {};

    workerRef.current = worker;
    worker.postMessage('uci');

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      worker.postMessage('quit');
      worker.terminate();
      workerRef.current = null;
      setIsReady(false);
    };
  }, []);

  const getBestMove = useCallback((fen, { elo = 2000, depth = 20, moveTimeMs = 2000 } = {}) => {
    return new Promise((resolve) => {
      if (!workerRef.current || !isReady) {
        resolve(null);
        return;
      }

      if (callbackRef.current) {
        callbackRef.current(null);
      }

      callbackRef.current = resolve;

      const worker = workerRef.current;

      worker.postMessage('stop');
      worker.postMessage('ucinewgame');

      // Clamp to Stockfish's supported ELO range
      const clampedElo = Math.max(1320, Math.min(3190, elo));
      worker.postMessage('setoption name UCI_LimitStrength value true');
      worker.postMessage(`setoption name UCI_Elo value ${clampedElo}`);

      // Map ELO to Skill Level 0-20
      const skill = Math.max(0, Math.min(20, Math.round(((clampedElo - 1320) / (3190 - 1320)) * 20)));
      worker.postMessage(`setoption name Skill Level value ${skill}`);

      worker.postMessage('isready');

      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${depth} movetime ${moveTimeMs}`);

      timeoutRef.current = setTimeout(() => {
        if (callbackRef.current) {
          const cb = callbackRef.current;
          callbackRef.current = null;
          worker.postMessage('stop');
          cb(null);
        }
      }, 15000);
    });
  }, [isReady]);

  return { isReady, getBestMove };
}
