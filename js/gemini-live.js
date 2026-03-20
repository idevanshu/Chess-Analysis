// Live Commentary Integration (via OpenAI ChatGPT through backend)
// Routes through /api/chat which connects to OpenAI API

class GeminiLive {
  constructor() {
    this.chatHistory = [];
    this.currentPlayer = null;
    this.onStream = null;
    this.onComplete = null;
    this.onError = null;
    this.isStreaming = false;
  }

  setApiKey() {
    // API key is configured on the backend via OPENAI_API_KEY env var
  }

  setPlayer(player) {
    this.currentPlayer = player;
    this.chatHistory = [];
  }

  async sendMessage(userMessage, contextFen = null, lastMove = null) {
    if (this.isStreaming) return;

    this.isStreaming = true;

    const systemInstruction = this.currentPlayer
      ? this.currentPlayer.systemPrompt
      : 'You are a helpful chess coach. Give concise, insightful chess advice in 2-3 sentences.';

    let contextMsg = userMessage;
    if (contextFen) {
      contextMsg = `[Current position FEN: ${contextFen}]${lastMove ? ` [Last move: ${lastMove}]` : ''}\n\n${userMessage}`;
    }

    this.chatHistory.push({ role: 'user', parts: [{ text: contextMsg }] });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.chatHistory,
          systemInstruction: systemInstruction,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop();

        for (const block of blocks) {
          const lines = block.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullText += parsed.text;
                  this.onStream?.(parsed.text, fullText);
                }
              } catch (_) {}
            }
          }
        }
      }

      if (fullText) {
        this.chatHistory.push({ role: 'model', parts: [{ text: fullText }] });
      }
      this.onComplete?.(fullText);

    } catch (err) {
      this.onError?.(err.message);
    } finally {
      this.isStreaming = false;
    }
  }

  async getAutoCommentary(fen, lastMove, moveNumber, playerColor) {
    if (!this.currentPlayer) return;

    const prompts = [
      `After ${lastMove} (move ${moveNumber}), briefly comment on this position from your perspective as ${this.currentPlayer.name}.`,
      `The position after ${lastMove} - what do you notice? (1-2 sentences as ${this.currentPlayer.name})`,
      `Interesting! Move ${lastMove} was played. React briefly as ${this.currentPlayer.name}.`,
    ];

    const prompt = prompts[moveNumber % prompts.length];
    await this.sendMessage(prompt, fen, lastMove);
  }

  clearHistory() {
    this.chatHistory = [];
  }
}

window.GeminiLive = GeminiLive;
