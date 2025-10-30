import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { 
  FiSend, 
  FiCopy, 
  FiEdit2, 
  FiTrash2, 
  FiMoreVertical, 
  FiAlertCircle, 
  FiClock, 
  FiLoader,
  FiX,
  FiZap
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'prism-react-renderer';
import { vsDark } from 'prism-react-renderer/themes';

// Local imports
import { cn } from '../../lib/utils';
import { useTheme } from '../theme/ThemeProvider';

// Mock theme since we can't find the original
const useThemeMock = () => ({
  theme: {
    colors: {
      border: '#e5e7eb',
      surface: '#ffffff',
      primary: '#3b82f6',
      text: '#111827',
      muted: '#6b7280'
    }
  }
});

// Use the mock theme if the original is not available
const useThemeFallback = useTheme || useThemeMock;

// Mock ReactMarkdown and SyntaxHighlighter to prevent errors
const ReactMarkdownFallback = ({ children }: { children: string }) => (
  <div className="prose dark:prose-invert max-w-none">{children}</div>
);

const SyntaxHighlighterFallback = ({
  children,
  language,
  style,
  ...props
}: {
  children: string;
  language: string;
  style: React.CSSProperties;
  [key: string]: any;
}) => (
  <pre className={`language-${language} bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto`}>
    <code>{children}</code>
  </pre>
);

// Use the mock components if the original is not available
const ReactMarkdownComponent = ReactMarkdown || ReactMarkdownFallback;
const SyntaxHighlighterComponent = SyntaxHighlighter || SyntaxHighlighterFallback;

// Simple ErrorBoundary component
class ErrorBoundary extends React.Component<{ fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error in AIChatPanel:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Type for code component props
interface CodeBlockProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  isEdited?: boolean;
  isError?: boolean;
  provider?: string;
  model?: string;
}

interface AIChatPanelProps {
  messages?: AIMessage[];
  onSendMessage?: (message: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

// Create a mock useAI hook since we can't find the original
const useAIMock = () => ({
  messages: [] as AIMessage[],
  sendMessage: async (message: string) => { 
    console.log('Sending message:', message);
    return { success: true }; 
  },
  isLoading: false,
  error: null,
});

// Use the mock hook - replace with real hook when available
const useAI = useAIMock;

const AIChatPanel: React.FC<AIChatPanelProps> = ({
  messages: externalMessages = [],
  onSendMessage: externalOnSendMessage,
  isLoading: externalIsLoading = false,
  error: externalError = null,
  className = ''
}) => {
  // Use external state if provided, otherwise use internal state
  const {
    messages: aiMessages = [],
    sendMessage: aiSendMessage,
    isLoading: aiIsLoading = false,
    error: aiError = null
  } = useAI();

  const messages = externalMessages.length ? externalMessages : aiMessages;
  const isLoading = externalIsLoading || aiIsLoading;
  const error = externalError || aiError;
  
  const handleSendMessage = useCallback(async (content: string) => {
    if (externalOnSendMessage) {
      return externalOnSendMessage(content);
    }
    return aiSendMessage(content);
  }, [externalOnSendMessage, aiSendMessage]);
  const { theme } = useTheme?.() || { theme: { colors: { border: '#e5e7eb', surface: '#ffffff' } } };
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const message = input.trim();
    if (!message || isLoading) return;

    setIsTyping(true);
    try {
      await handleSendMessage(message);
      setInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsTyping(false);
    }
  }, [input, isLoading, handleSendMessage]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Copy text to clipboard
  const copyToClipboard = useCallback((text: string, messageId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Render error state if there's an error
  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg">
        <div className="flex items-center">
          <FiAlertCircle className="mr-2" />
          <span>Error: {error}</span>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-blue-500 hover:underline"
        >
          Reload Chat
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary 
      fallback={
        <div className="p-4 text-red-500 bg-red-50 rounded-lg">
          <p>Something went wrong with the chat. Please try again.</p>
        </div>
      }
    >
      <div className={cn("flex flex-col h-full", className)}>
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollBehavior: 'smooth' }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FiZap className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm">Type a message to begin chatting with the AI</p>
          </div>
        ) : (
          messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 relative group ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-100 dark:bg-gray-700 rounded-bl-none'
              }`}
            >
              {/* Message content with markdown rendering */}
              {editingId === message.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    rows={4}
                    autoFocus
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      code({node, inline, className, children, ...props}: CodeBlockProps) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <div className="relative">
                            <div className="absolute right-2 top-2 flex space-x-1">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                }}
                                className="p-1 text-xs text-gray-400 hover:text-white bg-gray-800 rounded"
                                title="Copy code"
                              >
                                <FiCopy size={14} />
                              </button>
                            </div>
                            <SyntaxHighlighter
                              style={vsDark}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}

              {/* Message metadata and actions */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-1">
                  {message.isEdited && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (edited)
                    </span>
                  )}
                  {message.provider && message.model && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {message.provider} • {message.model}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="relative" ref={message.role === 'user' ? menuRef : null}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenuId(showMenuId === message.id ? null : message.id);
                      }}
                      className="opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity p-1"
                    >
                      <FiMoreVertical size={14} />
                    </button>
                    
                    {showMenuId === message.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => copyToClipboard(message.content, message.id)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                        >
                          <FiCopy size={14} />
                          <span>{copiedId === message.id ? 'Copied!' : 'Copy'}</span>
                        </button>
                        {message.role === 'user' && (
                          <>
                            <button
                              onClick={() => startEditing(message)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <FiEdit2 size={14} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => deleteMessage(message.id)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <FiTrash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {(isLoading || isTyping) && (
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 w-fit">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {isTyping ? 'AI is typing...' : 'Sending...'}
            </span>
          </div>
        )}

        {/* Rate limit warning */}
        {rateLimit.isLimited && (
          <div className="p-3 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            Sending messages too quickly. Please wait a moment before sending another message.
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div 
        className="p-3 border-t transition-colors" 
        style={{ 
          borderColor: theme?.colors?.border || '#e5e7eb', 
          backgroundColor: theme?.colors?.surface || '#ffffff',
          opacity: isLoading ? 0.7 : 1,
          pointerEvents: isLoading ? 'none' : 'auto'
        }}
      >
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={rateLimit.isLimited ? 
                'Please wait before sending another message...' : 
                'Ask me anything about your code...'}
              className={`w-full p-3 pr-10 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                rateLimit.isLimited ? 'cursor-not-allowed' : ''
              }`}
              style={{
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text,
                minHeight: '44px',
                maxHeight: '200px',
                opacity: rateLimit.isLimited ? 0.7 : 1,
              }}
              rows={1}
              disabled={isLoading || rateLimit.isLimited}
            />
            {input && (
              <button
                onClick={() => setInput('')}
                className="absolute right-12 top-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FiX size={18} />
              </button>
            )}
          </div>
          <button
            type="button"
            className={cn(
              "p-2 rounded-md transition-colors flex items-center justify-center",
              !input.trim() || isLoading
                ? "text-gray-400 cursor-not-allowed"
                : "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            )}
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            {isLoading ? (
              <FiLoader className="w-5 h-5 animate-spin" />
            ) : (
              <FiSend className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};