import * as React from "react";
import { useRef, useEffect, useState, useCallback } from "react";
import { FiSend, FiCopy, FiAlertCircle, FiX } from "react-icons/fi";
import { cn } from "../../lib/utils/cn";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import type { Components } from "react-markdown";

// Type for react-markdown components
interface MarkdownComponents extends Components {
  code?: React.ElementType;
  pre?: React.ElementType;
  // Add other component overrides as needed
}

// Types
export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
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
  theme?: {
    colors?: {
      background?: string;
      border?: string;
      text?: string;
      surface?: string;
    };
  };
}

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error in AIChatPanel:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <FiAlertCircle className="w-5 h-5" />
            <span>Something went wrong. Please try again.</span>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({
  messages: externalMessages = [],
  onSendMessage: externalSendMessage,
  isLoading: externalIsLoading = false,
  error: externalError = null,
  className = "",
}) => {
  const [messages, setMessages] = useState<AIMessage[]>(externalMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rateLimit] = useState({ isLimited: false });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Update messages when externalMessages changes
  useEffect(() => {
    setMessages(externalMessages);
  }, [externalMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle clicks outside to close any open menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Handle menu closing if needed
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !externalSendMessage) return;

      const userMessage: AIMessage = {
        id: Date.now().toString(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsTyping(true);

      try {
        await externalSendMessage(content.trim());
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content:
              "Sorry, there was an error sending your message. Please try again.",
            timestamp: new Date(),
            isError: true,
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [externalSendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (input.trim()) {
          handleSendMessage(input);
        }
      }
    },
    [input, handleSendMessage],
  );

  const handleCopyMessage = useCallback(
    (content: string, messageId: string) => {
      navigator.clipboard.writeText(content).catch((err) => {
        console.error("Failed to copy text: ", err);
      });
      setCopiedId(messageId);
      const timer = setTimeout(() => setCopiedId(null), 2000);
      return () => clearTimeout(timer);
    },
    [],
  );

  return (
    <ErrorBoundary>
      <div
        className={cn(
          "flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl overflow-hidden",
          className,
        )}
      >
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex group",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-3xl rounded-lg px-4 py-2 relative",
                  message.role === "user"
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none",
                )}
              >
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      code({
                        node,
                        inline,
                        className,
                        children,
                        ...props
                      }: {
                        node?: any;
                        inline?: boolean;
                        className?: string;
                        children?: React.ReactNode;
                        [key: string]: any;
                      }) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <CodeBlock className={className}>
                            {String(children).replace(/\n$/, "")}
                          </CodeBlock>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Message metadata */}
                <div className="flex items-center justify-end mt-1 space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  {message.isEdited && <span>(edited)</span>}
                  {message.provider && message.model && (
                    <span>
                      {message.provider} • {message.model}
                    </span>
                  )}
                  <button
                    onClick={() =>
                      handleCopyMessage(message.content, message.id)
                    }
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy message"
                  >
                    <FiCopy className="w-3.5 h-3.5" />
                    {copiedId === message.id && (
                      <span className="absolute -top-6 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                        Copied!
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {externalError && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mx-4 mb-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertCircle
                  className="h-5 w-5 text-red-500"
                  aria-hidden="true"
                />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {externalError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) {
                handleSendMessage(input);
              }
            }}
          >
            <div className="flex items-end space-x-2">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="w-full p-3 pr-10 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  style={{
                    backgroundColor: "white",
                    borderColor: "gray",
                    color: "black",
                    minHeight: "44px",
                    maxHeight: "200px",
                  }}
                  rows={1}
                  disabled={externalIsLoading || rateLimit.isLimited}
                />
                {input && (
                  <button
                    onClick={() => setInput("")}
                    className="absolute right-12 top-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <FiX size={18} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={
                  externalIsLoading || !input.trim() || rateLimit.isLimited
                }
                className={cn(
                  "p-2 rounded-md transition-colors",
                  externalIsLoading || !input.trim() || rateLimit.isLimited
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30",
                )}
                aria-label="Send message"
              >
                {externalIsLoading || isTyping ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiSend className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Typing indicator */}
        {(externalIsLoading || isTyping) && (
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 w-fit m-4">
            <div
              className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {isTyping ? "AI is thinking..." : "Sending..."}
            </span>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

const CodeBlock: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  const match = /language-(\w+)/.exec(className);

  return match ? (
    <div className="my-2 rounded-md overflow-hidden">
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
          lineHeight: "1.5",
        }}
        codeTagProps={{
          style: {
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          },
        }}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  );
};

// This is the correct export with error boundary
const AIChatPanelWithErrorBoundary: React.FC<AIChatPanelProps> = (props) => (
  <ErrorBoundary>
    <AIChatPanel {...props} />
  </ErrorBoundary>
);

// Default export for backward compatibility
export const AIChatPanel = AIChatPanelWithErrorBoundary;

// Named exports
export { AIChatPanel };
export default AIChatPanel;
