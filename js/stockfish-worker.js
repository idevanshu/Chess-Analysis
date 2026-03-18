// Stockfish Web Worker
// Loads stockfish.js from CDN and communicates via UCI protocol

let stockfish = null;
let isReady = false;
let pendingMessages = [];

function initStockfish() {
  try {
    importScripts('https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js');
    stockfish = Stockfish();
    
    stockfish.addMessageListener(function(msg) {
      self.postMessage({ type: 'output', data: msg });
    });

    stockfish.postMessage('uci');
    stockfish.postMessage('isready');
    isReady = true;
    
    // Flush pending
    pendingMessages.forEach(m => stockfish.postMessage(m));
    pendingMessages = [];
    
    self.postMessage({ type: 'ready' });
  } catch(e) {
    self.postMessage({ type: 'error', data: e.message });
  }
}

self.onmessage = function(e) {
  const msg = e.data;
  if (msg === 'init') {
    initStockfish();
    return;
  }
  if (isReady && stockfish) {
    stockfish.postMessage(msg);
  } else {
    pendingMessages.push(msg);
  }
};

initStockfish();
