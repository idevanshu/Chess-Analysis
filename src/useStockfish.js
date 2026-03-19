import { useState, useEffect, useRef, useCallback } from 'react';

export function useStockfish() {
  const workerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const callbackRef = useRef(null);

  useEffect(() => {
    const worker = new Worker('/js/stockfish-worker.js');

    worker.onmessage = (e) => {
      const msg = e.data;

      if (msg.type === 'ready') {
        setIsReady(true);
        return;
      }

      if (msg.type === 'output' && typeof msg.data === 'string') {
        const line = msg.data;

        // Parse bestmove response
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          const bestMove = parts[1];
          if (bestMove && callbackRef.current) {
            const cb = callbackRef.current;
            callbackRef.current = null;
            cb(bestMove);
          }
        }
      }
    };

    worker.onerror = (err) => {
      console.error('Stockfish worker error:', err);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
      setIsReady(false);
    };
  }, []);

  const getBestMove = useCallback((fen, depth = 15, skillLevel = 20) => {
    return new Promise((resolve) => {
      if (!workerRef.current || !isReady) {
        resolve(null);
        return;
      }

      callbackRef.current = resolve;

      const worker = workerRef.current;
      // Set skill level (0-20, maps to Stockfish's internal Skill Level option)
      worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${depth}`);
    });
  }, [isReady]);

  return { isReady, getBestMove };
}
