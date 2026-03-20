import { useState, useEffect, useRef, useCallback } from 'react';

export function useStockfish() {
  const workerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const callbackRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Stockfish 18 WASM runs directly as a Web Worker — no wrapper needed
    const worker = new Worker('/js/stockfish-18-lite-single.js');

    worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : '';

      // Engine is ready once UCI handshake completes
      if (line === 'uciok') {
        worker.postMessage('isready');
        return;
      }

      if (line === 'readyok' && !isReady) {
        setIsReady(true);
        return;
      }

      if (line.startsWith('bestmove')) {
        // Clear the safety timeout
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
          // Engine returned no move — resolve null so fallback kicks in
          const cb = callbackRef.current;
          callbackRef.current = null;
          cb(null);
        }
      }
    };

    worker.onerror = (err) => {
      console.error('Stockfish worker error:', err);
    };

    workerRef.current = worker;

    // Start UCI handshake
    worker.postMessage('uci');

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      worker.postMessage('quit');
      worker.terminate();
      workerRef.current = null;
      setIsReady(false);
    };
  }, []);

  /**
   * Get best move from Stockfish with ELO-based strength.
   * @param {string} fen - Board position
   * @param {number} elo - Target ELO strength (1350–2850)
   * @param {number} depth - Max search depth
   * @param {number} moveTimeMs - Think time in milliseconds
   */
  const getBestMove = useCallback((fen, { elo = 2000, depth = 20, moveTimeMs = 2000 } = {}) => {
    return new Promise((resolve) => {
      if (!workerRef.current || !isReady) {
        resolve(null);
        return;
      }

      // If there's a pending request, cancel it
      if (callbackRef.current) {
        callbackRef.current(null);
      }

      callbackRef.current = resolve;

      const worker = workerRef.current;

      // Reset engine state for clean search
      worker.postMessage('stop');
      worker.postMessage('ucinewgame');

      // ELO-based strength limiting (Stockfish UCI_LimitStrength)
      // Clamp to Stockfish's supported range (1320–3190)
      const clampedElo = Math.max(1320, Math.min(3190, elo));
      worker.postMessage('setoption name UCI_LimitStrength value true');
      worker.postMessage(`setoption name UCI_Elo value ${clampedElo}`);

      // Also set Skill Level for additional difficulty control (0-20)
      // Map ELO range to skill: 1320->0, 3190->20
      const skill = Math.max(0, Math.min(20, Math.round(((clampedElo - 1320) / (3190 - 1320)) * 20)));
      worker.postMessage(`setoption name Skill Level value ${skill}`);

      // Make sure engine is ready after option changes
      worker.postMessage('isready');

      // Set position and search
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${depth} movetime ${moveTimeMs}`);

      // Safety timeout: if Stockfish doesn't respond in 15 seconds, resolve null
      timeoutRef.current = setTimeout(() => {
        if (callbackRef.current) {
          console.warn('Stockfish timeout — using fallback');
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
