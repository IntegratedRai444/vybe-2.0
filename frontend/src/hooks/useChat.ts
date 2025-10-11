import { useState, useCallback } from 'react';
import * as api from '../utils/api';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export const useChat = (projectRoot: string, currentFile: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (prompt: string) => {
    if (!prompt) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    let fullContent = '';

    try {
      const stream = await api.sendChatMessage(prompt, projectRoot, currentFile);
      const reader = stream.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get stream reader');
      }

      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              fullContent += parsed.response;
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg
              ));
            }
          } catch (e) {
            console.error('Failed to parse stream line:', line, e);
          }
        }
      }
    } catch (error) {
      console.error('Chat API error:', error);
      const errorContent = error instanceof Error ? error.message : 'An unknown error occurred.';
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId ? { ...msg, content: `Error: ${errorContent}` } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [projectRoot, currentFile]);

  return { messages, isLoading, sendMessage };
};