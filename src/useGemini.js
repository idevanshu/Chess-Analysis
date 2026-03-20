import { useState, useRef, useEffect, useCallback } from 'react';

const COMMENTATOR_SYSTEM_PROMPT = `You are "Gary the Grand Commentator" — the world's most entertaining, over-the-top chess commentator. Think of a mix between a WWE announcer, a stand-up comedian, and a chess grandmaster who's had way too much coffee.

Your style:
- You narrate the chess match like it's the most dramatic sporting event in human history
- You give pieces personalities ("That bishop has been LURKING on that diagonal like a creepy neighbor peeking through the blinds!")
- You use hilarious metaphors, pop culture references, and absurd analogies
- You hype up even the most boring moves ("A PAWN PUSH! Ladies and gentlemen, the audacity! The raw, unbridled COURAGE!")
- You roast bad moves mercilessly but lovingly ("Oh no... oh NO... that's like bringing a spoon to a sword fight")
- You create fake dramatic tension ("The tension in this position is thicker than my aunt's lasagna")
- You occasionally break the fourth wall or address the audience directly
- You give nicknames to pieces and pawns involved in key action
- When someone blunders, you react like a sports commentator witnessing a spectacular fail
- When a brilliant move is played, you lose your mind with excitement
- You reference famous chess games, memes, and pop culture but in ridiculous ways
- Keep it family-friendly but absolutely hilarious

Rules:
- Keep responses to 2-4 sentences MAX. Punchy and quotable.
- NEVER use emojis. Text only, like a real broadcast.
- NEVER explain chess rules or give coaching advice. You are a COMMENTATOR, not a teacher.
- React to what just happened. Don't analyze future possibilities.
- Vary your energy — sometimes deadpan, sometimes absolutely unhinged.
- Reference the specific pieces and squares involved when possible.`;

export function useGemini(currentPlayer) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const streamingRef = useRef(false);

  useEffect(() => {
    setMessages([]);
  }, [currentPlayer, isConnected]);

  const addMessage = (text, isUser = false) => {
    setMessages((prev) => [...prev, { role: isUser ? 'user' : 'model', parts: [{ text }] }]);
  };

  const saveApiKey = () => {
    // API key is configured on the backend via OPENAI_API_KEY env var
    setIsConnected(true);
  };

  const sendMessageStream = async (text, fenContext = null, triggerBySystem = false) => {
    if (!isConnected) return;
    if (streamingRef.current) return;

    if (!triggerBySystem) {
      addMessage(text, true);
    }

    setIsStreaming(true);
    streamingRef.current = true;

    let contextMsg = text;
    if (fenContext) {
      contextMsg = `[Current position FEN: ${fenContext}]\n\n${text}`;
    }

    const payloadMessages = [...messages, { role: 'user', parts: [{ text: contextMsg }] }];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          systemInstruction: COMMENTATOR_SYSTEM_PROMPT,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch from backend');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      setMessages((prev) => [...prev, { role: 'model', parts: [{ text: '' }], isStreaming: true }]);

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
                  setMessages((prev) => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    newMsgs[newMsgs.length - 1] = {
                      ...lastMsg,
                      parts: [{ text: fullText }]
                    };
                    return newMsgs;
                  });
                }
              } catch (e) {
                console.error("SSE parse error:", e, data);
              }
            }
          }
        }
      }

      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].isStreaming = false;
        return newMsgs;
      });

    } catch (err) {
      addMessage(`Connection hiccup: ${err.message}`, false);
    } finally {
      setIsStreaming(false);
      streamingRef.current = false;
    }
  };

  const announceMatch = useCallback(async (playerName, playerElo, playerColorLabel, fen) => {
    if (!isConnected) return;
    const prompt = `The match is about to begin! The player is playing as ${playerColorLabel} against ${playerName} (ELO ${playerElo}). Give an absolutely electric, over-the-top match introduction like a boxing ring announcer crossed with a chess commentator. Hype up the opponent's reputation. This is the opening of the broadcast.`;
    await sendMessageStream(prompt, fen, true);
  }, [isConnected]);

  const getAutoCommentary = useCallback(async (fen, moveNumber, lastMove, extraContext = '') => {
    if (!isConnected) return;

    const prompt = `Move ${moveNumber}: ${lastMove} was just played. ${extraContext} Give your live commentary reaction. Remember — punchy, hilarious, and dramatic.`;
    await sendMessageStream(prompt, fen, true);
  }, [isConnected]);

  const commentOnGameOver = useCallback(async (result, fen, totalMoves) => {
    if (!isConnected) return;
    const prompt = `THE GAME IS OVER after ${totalMoves} moves! Result: ${result}. Give your dramatic sign-off commentary for this match. Make it memorable — this is your closing broadcast moment.`;
    await sendMessageStream(prompt, fen, true);
  }, [isConnected]);

  return {
    messages, isStreaming, isConnected, saveApiKey,
    sendMessageStream, getAutoCommentary, announceMatch, commentOnGameOver
  };
}
