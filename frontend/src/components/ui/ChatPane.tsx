// src/components/ChatPane.tsx
import React, { useState, useEffect, useRef } from "react";
import { ModelSelector } from "./ModelSelector";

type Props = {
  currentFile: string; // relative path – used for routing
};

export const ChatPane: React.FC<Props> = ({ currentFile }) => {
  const [messages, setMessages] = useState<Array<{ role: string; content: string; timestamp?: number }>>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load persisted chat history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("vybe_chat_history");
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse chat history:", e);
      }
    }
  }, []);

  const persist = (newMsgs: any) => {
    setMessages(newMsgs);
    localStorage.setItem("vybe_chat_history", JSON.stringify(newMsgs));
  };

  const send = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = { 
      role: "user", 
      content: input.trim(),
      timestamp: Date.now()
    };
    
    const newMsgs = [...messages, userMessage];
    persist(newMsgs);
    setInput("");
    setIsLoading(true);

    try {
      const prompt = newMsgs.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");

      const body = {
        prompt,
        file_path: currentFile,
        model,
        top_k: 5,
      };
      
      const resp = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }

      const data = await resp.json();
      const assistantMsg = { 
        role: "assistant", 
        content: data.answer,
        timestamp: Date.now()
      };
      
      persist([...newMsgs, assistantMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please check your connection and try again.",
        timestamp: Date.now()
      };
      persist([...newMsgs, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem("vybe_chat_history");
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const formatMessage = (content: string) => {
    // Simple code block detection and formatting
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index)
        });
      }
      
      // Add code block
      parts.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex)
      });
    }
    
    return parts.length > 0 ? parts : [{ type: 'text', content }];
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-slate-400">
            {currentFile ? `Context: ${currentFile.split('/').pop()}` : 'No file selected'}
          </span>
        </div>
        <button
          onClick={clearChat}
          className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-md transition-all duration-150"
          title="Clear chat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">AI Assistant Ready</h3>
            <p className="text-sm text-slate-400 mb-4 max-w-xs">
              Ask questions about your code, request explanations, or get help with development tasks.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button 
                onClick={() => setInput("Explain this file")}
                className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 text-xs rounded-lg transition-all duration-150"
              >
                Explain this file
              </button>
              <button 
                onClick={() => setInput("Find potential bugs")}
                className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 text-xs rounded-lg transition-all duration-150"
              >
                Find bugs
              </button>
              <button 
                onClick={() => setInput("Suggest improvements")}
                className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 text-xs rounded-lg transition-all duration-150"
              >
                Improve code
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
              )}
              
              <div className={`group max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  msg.role === "assistant"
                    ? "bg-slate-800/50 text-slate-100"
                    : "bg-blue-600 text-white ml-auto"
                }`}>
                  {formatMessage(msg.content).map((part, partIndex) => (
                    <div key={partIndex}>
                      {part.type === 'code' ? (
                        <div className="my-2">
                          <div className="flex items-center justify-between bg-slate-900/50 px-3 py-1 rounded-t-lg border-b border-slate-700/50">
                            <span className="text-xs text-slate-400 font-medium">{part.language}</span>
                            <button
                              onClick={() => copyMessage(part.content)}
                              className="text-slate-500 hover:text-slate-300 transition-colors duration-150"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                          <pre className="bg-slate-900/50 p-3 rounded-b-lg overflow-x-auto text-sm">
                            <code className="text-slate-200">{part.content}</code>
                          </pre>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {part.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Message Actions */}
                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={() => copyMessage(msg.content)}
                    className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded transition-all duration-150"
                    title="Copy message"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  {msg.timestamp && (
                    <span className="text-xs text-slate-500 ml-2">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
              
              {msg.role === "user" && (
                <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          ))
        )}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="bg-slate-800/50 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800/60 p-4">
        <div className="flex items-end gap-3">
          <ModelSelector value={model} onChange={setModel} />
          
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="w-full bg-slate-800/50 text-slate-100 rounded-xl px-4 py-3 pr-12 resize-none border border-slate-700/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-150 placeholder:text-slate-400"
              rows={1}
              placeholder="Ask anything about your code... (⌘+Enter to send)"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize textarea
                const textarea = e.target;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
              }}
              onKeyDown={onKeyDown}
              disabled={isLoading}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            
            <button
              onClick={send}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-150 disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
          <span>AI can make mistakes. Verify important information.</span>
          <span>⌘+Enter to send</span>
        </div>
      </div>
    </div>
  );
};