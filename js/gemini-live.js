// Google Gemini Live API Integration
// Uses Gemini 2.5 Flash for streaming chess commentary and coaching

class GeminiLive {
  constructor() {
    this.apiKey = null;
    this.model = 'gemini-2.5-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.chatHistory = [];
    this.currentPlayer = null;
    this.onStream = null;
    this.onComplete = null;
    this.onError = null;
    this.isStreaming = false;
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  setPlayer(player) {
    this.currentPlayer = player;
    this.chatHistory = []; // Reset on player change
  }

  async sendMessage(userMessage, contextFen = null, lastMove = null) {
    if (!this.apiKey) {
      this.onError?.('No API key set. Please enter your Gemini API key.');
      return;
    }
    if (this.isStreaming) return;

    this.isStreaming = true;

    const systemInstruction = this.currentPlayer
      ? this.currentPlayer.systemPrompt
      : 'You are a helpful chess coach. Give concise, insightful chess advice in 2-3 sentences.';

    // Build context
    let contextMsg = userMessage;
    if (contextFen) {
      contextMsg = `[Current position FEN: ${contextFen}]${lastMove ? ` [Last move: ${lastMove}]` : ''}\n\n${userMessage}`;
    }

    this.chatHistory.push({ role: 'user', parts: [{ text: contextMsg }] });

    const requestBody = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: this.chatHistory,
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 256,
        topP: 0.95,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      ]
    };

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                fullText += text;
                this.onStream?.(text, fullText);
              }
            } catch (_) {}
          }
        }
      }

      // Add assistant response to history
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
    if (!this.apiKey || !this.currentPlayer) return;
    
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
