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
      // Wait for the engine to confirm it's ready before declaring ready
      if (msg === 'readyok' && !isReady) {
        isReady = true;

        // Flush any messages that arrived while we were initializing
        pendingMessages.forEach(m => stockfish.postMessage(m));
        pendingMessages = [];

        self.postMessage({ type: 'ready' });
        return;
      }

      self.postMessage({ type: 'output', data: msg });
    });

    // Start UCI handshake
    stockfish.postMessage('uci');
    stockfish.postMessage('isready');
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
