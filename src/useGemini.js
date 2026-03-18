import { useState, useRef, useEffect } from 'react';

export function useGemini(currentPlayer) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Hardcoded check: If it's saved in local storage, use that.
  // The server.js automatically uses process.env.GEMINI_API_KEY
  // We just need to assume it's connected if we are relying on the .env file.
  const checkIsConnected = () => {
    return true; // Hardcoded to always be connected since backend has env
  };

  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    setMessages([]);
    if (currentPlayer && isConnected) {
      addMessage(`I am ${currentPlayer.name}. ${currentPlayer.catchphrase} Ready to play? Make your first move!`, false);
    }
  }, [currentPlayer, isConnected]);

  const addMessage = (text, isUser = false) => {
    setMessages((prev) => [...prev, { role: isUser ? 'user' : 'model', parts: [{ text }] }]);
  };

  const saveApiKey = (key) => {
    localStorage.setItem('gemini_api_key', key);
    setIsConnected(true);
  };

  const sendMessageStream = async (text, fenContext = null, triggerBySystem = false) => {
    if (!isConnected) return;
    if (isStreaming) return;

    if (!triggerBySystem) {
      addMessage(text, true);
    }

    setIsStreaming(true);

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
          systemInstruction: currentPlayer?.systemPrompt || 'You are a helpful chess coach.',
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch from backend');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      
      // Add empty stream message
      setMessages((prev) => [...prev, { role: 'model', parts: [{ text: '' }], isStreaming: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                // Update last message
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].parts[0].text = fullText;
                  return newMsgs;
                });
              }
            } catch (e) {}
          }
        }
      }

      // Finalize stream message
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].isStreaming = false;
        return newMsgs;
      });

    } catch (err) {
      addMessage(`⚠️ Error: ${err.message}`, false);
    } finally {
      setIsStreaming(false);
    }
  };

  const getAutoCommentary = async (fen, moveNumber, lastMove) => {
    if (!isConnected || !currentPlayer) return;
    
    // Send background prompt for commentary
    const prompt = `After ${lastMove} (move ${moveNumber}), react briefly as ${currentPlayer.name}.`;
    await sendMessageStream(prompt, fen, true);
  };

  return {
    messages, isStreaming, isConnected, saveApiKey,
    sendMessageStream, getAutoCommentary
  };
}
