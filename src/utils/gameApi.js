// Utility to add JWT token to all fetch requests
export function enhanceRequestWithAuth(token) {
  const originalFetch = window.fetch;
  
  window.fetch = function(url, options = {}) {
    if (token && typeof url === 'string' && url.startsWith('/api')) {
      if (!options.headers) {
        options.headers = {};
      }
      options.headers.Authorization = `Bearer ${token}`;
    }
    return originalFetch.apply(this, arguments);
  };
}

// Function to track game after it ends
export async function trackGameEnd(token, gameData) {
  try {
    const response = await fetch('/api/games/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(gameData)
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving game:', error);
  }
}
