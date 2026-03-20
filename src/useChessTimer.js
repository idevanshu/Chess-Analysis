import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Chess timer hook — manages countdown clocks for both players.
 * @param {object} timeControl - { initialTime: seconds, increment: seconds } or null for unlimited
 * @param {string} activeTurn - 'w' or 'b' — whose clock is running
 * @param {boolean} gameStarted - true once first move is made
 * @param {boolean} gameOver - true when game ends
 * @returns {{ whiteTime, blackTime, isTimedOut, timedOutColor, resetTimers, formatTime }}
 */
export function useChessTimer(timeControl, activeTurn, gameStarted, gameOver) {
  const [whiteTime, setWhiteTime] = useState(timeControl?.initialTime ?? 0);
  const [blackTime, setBlackTime] = useState(timeControl?.initialTime ?? 0);
  const [timedOutColor, setTimedOutColor] = useState(null);
  const intervalRef = useRef(null);
  const lastTickRef = useRef(null);

  // Reset when time control changes
  useEffect(() => {
    if (timeControl) {
      setWhiteTime(timeControl.initialTime);
      setBlackTime(timeControl.initialTime);
      setTimedOutColor(null);
    }
  }, [timeControl?.initialTime, timeControl?.increment]);

  // Apply increment after a move (when activeTurn changes and game is ongoing)
  const prevTurnRef = useRef(activeTurn);
  useEffect(() => {
    if (!timeControl || !gameStarted || gameOver || timedOutColor) return;
    if (prevTurnRef.current !== activeTurn && timeControl.increment > 0) {
      // The player who just moved (prevTurn) gets the increment
      const justMoved = prevTurnRef.current;
      if (justMoved === 'w') {
        setWhiteTime(t => t + timeControl.increment);
      } else {
        setBlackTime(t => t + timeControl.increment);
      }
    }
    prevTurnRef.current = activeTurn;
  }, [activeTurn, gameStarted, gameOver, timeControl, timedOutColor]);

  // Run the countdown
  useEffect(() => {
    if (!timeControl || !gameStarted || gameOver || timedOutColor) {
      clearInterval(intervalRef.current);
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      if (activeTurn === 'w') {
        setWhiteTime(prev => {
          const next = prev - delta;
          if (next <= 0) {
            setTimedOutColor('w');
            clearInterval(intervalRef.current);
            return 0;
          }
          return next;
        });
      } else {
        setBlackTime(prev => {
          const next = prev - delta;
          if (next <= 0) {
            setTimedOutColor('b');
            clearInterval(intervalRef.current);
            return 0;
          }
          return next;
        });
      }
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, [timeControl, activeTurn, gameStarted, gameOver, timedOutColor]);

  const resetTimers = useCallback(() => {
    clearInterval(intervalRef.current);
    lastTickRef.current = null;
    if (timeControl) {
      setWhiteTime(timeControl.initialTime);
      setBlackTime(timeControl.initialTime);
    }
    setTimedOutColor(null);
  }, [timeControl]);

  // Add time back when undoing a move (external call)
  const addTime = useCallback((color, seconds) => {
    if (color === 'w') setWhiteTime(t => t + seconds);
    else setBlackTime(t => t + seconds);
  }, []);

  return {
    whiteTime,
    blackTime,
    isTimedOut: !!timedOutColor,
    timedOutColor,
    resetTimers,
    addTime,
  };
}

/** Format seconds into mm:ss or h:mm:ss */
export function formatTime(totalSeconds) {
  if (totalSeconds == null || totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((totalSeconds % 1) * 10);

  if (totalSeconds < 10) {
    // Show tenths when under 10 seconds
    return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
  }
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
