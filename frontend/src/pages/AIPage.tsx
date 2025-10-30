import React, { useRef, useEffect } from 'react';
import { useAI, AIMessage } from '../components/ai/AIProvider';
import { FiSend, FiCopy, FiCheck, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// Helper to format message timestamps
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Helper to detect and extract code blocks from message content
const renderMessageContent = (content: string) => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index)
      });
    }

    // Add the code block
    const [_, language, code] = match;
    parts.push({
      type: 'code',
      language: language || 'text',
      content: code.trim()
    });

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex)
    });
  }

  return parts;
};

const AIPage: React.FC = () => {
  const { 
    messages, 
    sendMessage, 
    isLoading, 
    error, 
    provider, 
    model, 
    retryLastMessage,
    clearConversation
  } = useAI();
  
  const [input, setInput] = React.useState('');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    await sendMessage(input);
    setInput('');
    
    // Refocus input after sending
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderMessage = (message: AIMessage) => {
    const isUser = message.role === 'user';
    const messageContent = renderMessageContent(message.content);
    const messageTime = formatTime(message.timestamp);
    
    return (
      <div 
        key={message.id} 
        className={`group relative py-4 px-4 ${isUser ? 'bg-gray-800' : 'bg-gray-850'}`}
      >
        <div className="max-w-4xl mx-auto flex">
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 mt-0.5 ${isUser ? 'bg-blue-600' : 'bg-purple-600'}`}>
            {isUser ? (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          
          {/* Message content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center mb-1">
              <span className="font-medium text-sm text-gray-300">
                {isUser ? 'You' : 'AI Assistant'}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                {messageTime} • {message.provider || 'local'} • {message.model || 'default'}
              </span>
            </div>
            
            <div className="prose prose-invert max-w-none">
              {messageContent.map((part, index) => {
                if (part.type === 'code') {
                  return (
                    <div key={index} className="relative group">
                      <div className="absolute right-2 top-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyToClipboard(part.content, `${message.id}-${index}`)}
                          className="p-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                          title="Copy to clipboard"
                        >
                          {copiedId === `${message.id}-${index}` ? (
                            <FiCheck className="h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <FiCopy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        language={part.language}
                        style={vscDarkPlus}
                        customStyle={{
                          margin: '0.5em 0',
                          padding: '1em',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                        }}
                        showLineNumbers
                        wrapLines
                      >
                        {part.content}
                      </SyntaxHighlighter>
                    </div>
                  );
                }
                return (
                  <p key={index} className="whitespace-pre-wrap">
                    {part.content}
                  </p>
                );
              })}
            </div>
            
            {!isUser && message.role === 'assistant' && (
              <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                <button
                  onClick={() => copyToClipboard(message.content, message.id)}
                  className="flex items-center text-gray-400 hover:text-gray-200"
                  title="Copy to clipboard"
                >
                  {copiedId === message.id ? (
                    <>
                      <FiCheck className="h-3.5 w-3.5 mr-1 text-green-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <FiCopy className="h-3.5 w-3.5 mr-1" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">How can I help you today?</h3>
            <p className="max-w-md">
              Ask me anything about your code, and I'll do my best to assist you. I can help with debugging, 
              explaining concepts, generating code, and more.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
              <button
                onClick={() => setInput('Explain this code:')}
                className="p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 text-left"
              >
                <h4 className="font-medium text-white mb-1">Explain code</h4>
                <p className="text-sm text-gray-400">Get detailed explanations for any code snippet</p>
              </button>
              <button
                onClick={() => setInput('Help me debug this issue:')}
                className="p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 text-left"
              >
                <h4 className="font-medium text-white mb-1">Debug an issue</h4>
                <p className="text-sm text-gray-400">Get help identifying and fixing bugs</p>
              </button>
              <button
                onClick={() => setInput('Generate a function that:')}
                className="p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 text-left"
              >
                <h4 className="font-medium text-white mb-1">Generate code</h4>
                <p className="text-sm text-gray-400">Create new code based on your requirements</p>
              </button>
              <button
                onClick={() => setInput('Optimize this code:')}
                className="p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700 text-left"
              >
                <h4 className="font-medium text-white mb-1">Optimize code</h4>
                <p className="text-sm text-gray-400">Improve performance and readability</p>
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="py-4 px-6 bg-gray-850">
                <div className="max-w-4xl mx-auto flex items-center space-x-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-200"></div>
                  <span className="ml-2">AI is thinking...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Input area */}
      <div className="border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '200px' }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`absolute right-2 bottom-2 p-1.5 rounded-md ${
                input.trim() && !isLoading
                  ? 'text-blue-400 hover:bg-blue-900/50'
                  : 'text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <FiRefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <FiSend className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-gray-800 rounded text-gray-400">
                {provider} • {model}
              </span>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearConversation}
                  className="text-gray-500 hover:text-gray-300"
                  title="New chat"
                >
                  <FiRefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {messages.length > 0 && `${messages.length} messages`}
            </div>
          </div>
        </form>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-900/50 text-red-100 text-sm p-3 flex items-center justify-between">
          <div className="flex items-center">
            <FiAlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={retryLastMessage}
            className="text-xs bg-red-800 hover:bg-red-700 px-2 py-1 rounded"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default AIPage;
