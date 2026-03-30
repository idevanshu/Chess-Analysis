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
  }
}
