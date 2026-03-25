/**
 * Game API Utilities
 * Helper functions for game-related API calls
 */

/**
 * Add JWT token to all fetch requests for authenticated API calls
 * @param {string} token - JWT authentication token
 */
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

/**
 * Save completed game to the server
 * @param {string} token - JWT authentication token
 * @param {object} gameData - Game data to save
 * @returns {object} - Response from server
 */
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
