import { useRef, useCallback } from 'react';

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function noiseBuffer(ctx, sec) {
  const len = ctx.sampleRate * sec;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function woodClick(ctx, vol = 0.4) {
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.05);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1200;
  bp.Q.value = 1.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  src.connect(bp).connect(g).connect(ctx.destination);
  src.start(t);
  src.stop(t + 0.06);
}

function captureThud(ctx) {
  const t = ctx.currentTime;
  const s1 = ctx.createBufferSource();
  s1.buffer = noiseBuffer(ctx, 0.08);
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass'; f1.frequency.value = 600; f1.Q.value = 2;
  const g1 = ctx.createGain();
  g1.gain.setValueAtTime(0.5, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  s1.connect(f1).connect(g1).connect(ctx.destination);
  s1.start(t); s1.stop(t + 0.1);
  const s2 = ctx.createBufferSource();
  s2.buffer = noiseBuffer(ctx, 0.04);
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass'; f2.frequency.value = 1800; f2.Q.value = 3;
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.3, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  s2.connect(f2).connect(g2).connect(ctx.destination);
  s2.start(t); s2.stop(t + 0.05);
}

function checkTone(ctx) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(880, t);
  o.frequency.setValueAtTime(660, t + 0.08);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + 0.15);
}

function gameEndChord(ctx) {
  const t = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach(f => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.8);
  });
}

function promoteTone(ctx) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(440, t);
  o.frequency.exponentialRampToValueAtTime(880, t + 0.15);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + 0.25);
}

export function useChessSound() {
  const enabledRef = useRef(true);

  const playSound = useCallback((move) => {
    if (!enabledRef.current) return;
    try {
      const ctx = getCtx();
      if (!move) { woodClick(ctx); return; }
      if (move === 'gameEnd') { gameEndChord(ctx); return; }

      if (move.san?.includes('#')) {
        gameEndChord(ctx);
      } else if (move.san?.includes('+')) {
        woodClick(ctx, 0.3);
        setTimeout(() => checkTone(ctx), 60);
      } else if (move.san === 'O-O' || move.san === 'O-O-O') {
        woodClick(ctx, 0.35);
        setTimeout(() => woodClick(ctx, 0.45), 80);
      } else if (move.promotion) {
        promoteTone(ctx);
      } else if (move.captured) {
        captureThud(ctx);
      } else {
        woodClick(ctx);
      }
    } catch (e) { /* audio unavailable */ }
  }, []);

  return { playSound, enabledRef };
}
