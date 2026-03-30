import { useState, useEffect, useRef, useCallback } from 'react';

export function useChessTimer(timeControl, activeTurn, gameStarted, gameOver) {
  const [whiteTime, setWhiteTime] = useState(timeControl?.initialTime ?? 0);
  const [blackTime, setBlackTime] = useState(timeControl?.initialTime ?? 0);
  const [timedOutColor, setTimedOutColor] = useState(null);
  const intervalRef = useRef(null);
  const lastTickRef = useRef(null);

  useEffect(() => {
    if (timeControl) {
      setWhiteTime(timeControl.initialTime);
      setBlackTime(timeControl.initialTime);
      setTimedOutColor(null);
    }
  }, [timeControl?.initialTime, timeControl?.increment]);

  const prevTurnRef = useRef(activeTurn);
  useEffect(() => {
    if (!timeControl || !gameStarted || gameOver || timedOutColor) return;
    if (prevTurnRef.current !== activeTurn && timeControl.increment > 0) {
      // Increment goes to the player who just moved
      const justMoved = prevTurnRef.current;
      if (justMoved === 'w') {
        setWhiteTime(t => t + timeControl.increment);
      } else {
        setBlackTime(t => t + timeControl.increment);
      }
    }
    prevTurnRef.current = activeTurn;
  }, [activeTurn, gameStarted, gameOver, timeControl, timedOutColor]);

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

  const addTime = useCallback((color, seconds) => {
    if (color === 'w') setWhiteTime(t => t + seconds);
    else setBlackTime(t => t + seconds);
  }, []);

  const syncTime = useCallback((wTime, bTime) => {
    if (wTime !== null && wTime !== undefined) setWhiteTime(wTime);
    if (bTime !== null && bTime !== undefined) setBlackTime(bTime);
  }, []);

  return {
    whiteTime,
    blackTime,
    isTimedOut: !!timedOutColor,
    timedOutColor,
    resetTimers,
    addTime,
    syncTime,
  };
}

export function formatTime(totalSeconds) {
  if (totalSeconds == null || totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((totalSeconds % 1) * 10);

  // Show tenths when under 10s for precision
  if (totalSeconds < 10) {
    return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
  }
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
