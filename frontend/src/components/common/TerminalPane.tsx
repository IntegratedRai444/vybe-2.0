// src/components/TerminalPane.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Terminal, ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";

interface TerminalPaneProps {
  sessionId?: string;
  cwd: string;
  shell?: string;
  theme?: ITheme;
  onTitleChange?: (title: string) => void;
  onExit?: (exitCode?: number) => void;
  onData?: (data: string) => void;
  className?: string;
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  sessionId,
  cwd,
  shell,
  theme,
  onTitleChange,
  onExit,
  onData,
  className = "",
}) => {
  const termRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const searchAddon = useRef<SearchAddon | null>(null);
  const webglAddon = useRef<WebglAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [, setTerminalTitle] = useState("Terminal");
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize terminal
  const initTerminal = useCallback(() => {
    if (!termRef.current) return;

    // Clean up previous terminal instance if it exists
    if (termInstance.current) {
      termInstance.current.dispose();
    }

    // Create new terminal instance
    // Create a default theme that matches ITheme interface
    const defaultTheme = {
      background: "#1e1e1e",
      foreground: "#d4d4d4",
      cursor: "#ffffff",
      cursorAccent: "#000000",
      // Note: 'selection' is not part of ITheme in @xterm/xterm
    };

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'Fira Code, Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: theme || defaultTheme,
      allowTransparency: true,
      allowProposedApi: true,
      windowsMode: navigator.platform.startsWith("Win"),
    });

    // Setup addons
    fitAddon.current = new FitAddon();
    searchAddon.current = new SearchAddon();

    term.loadAddon(fitAddon.current);
    term.loadAddon(searchAddon.current);
    term.loadAddon(new WebLinksAddon());
    term.loadAddon(new Unicode11Addon());
    term.unicode.activeVersion = "11";

    // Try to enable WebGL renderer
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => {
        console.warn("WebGL context lost, falling back to canvas renderer");
        webgl.dispose();
      });
      term.loadAddon(webgl);
      webglAddon.current = webgl;
    } catch (e) {
      console.warn("WebGL not supported, falling back to canvas renderer");
    }

    // Open terminal in the DOM
    term.open(termRef.current);
    fitAddon.current.fit();
    termInstance.current = term;

    // Handle terminal resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon.current) {
        try {
          fitAddon.current.fit();

          // Notify backend of new size
          if (
            wsRef.current?.readyState === WebSocket.OPEN &&
            termInstance.current
          ) {
            const dims = fitAddon.current.proposeDimensions();
            if (dims) {
              wsRef.current.send(
                JSON.stringify({
                  type: "resize",
                  cols: dims.cols,
                  rows: dims.rows,
                }),
              );
            }
          }
        } catch (e) {
          console.error("Error resizing terminal:", e);
        }
      }
    });

    if (termRef.current) {
      resizeObserver.observe(termRef.current);
    }

    // Cleanup function
    return () => {
      resizeObserver.disconnect();
      if (webglAddon.current) {
        webglAddon.current.dispose();
      }
      term.dispose();
    };
  }, [theme]);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Get WebSocket URL from environment or use default
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_URL 
      ? new URL(import.meta.env.VITE_WS_URL).host
      : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/terminal`;
    
    console.log(`Connecting to terminal WebSocket at: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Terminal WebSocket connected");
      reconnectAttempts.current = 0;
      setIsConnected(true);

      // Clear any reconnect timeout
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }

      // Initialize terminal session
      const defaultShell = shell || (navigator.platform.startsWith("Win") ? "powershell.exe" : "/bin/bash");
      ws.send(
        JSON.stringify({
          type: "create",
          cwd,
          shell: defaultShell,
          name: `Terminal-${Date.now()}`,
          theme: "default-dark",
          ...(sessionId && { terminalId: sessionId }),
        })
      );
    };

    ws.onmessage = (event) => {
      if (!termInstance.current) return;

      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "output":
            termInstance.current.write(message.data);
            break;

          case "title":
            setTerminalTitle(message.title);
            if (onTitleChange) onTitleChange(message.title);
            break;

          case "exit":
            if (onExit) onExit(message.exitCode);
            break;

          case "error":
            console.error("Terminal error:", message.message);
            termInstance.current.writeln(
              `\r\n\x1b[31m❌ ${message.message}\x1b[0m`,
            );
            break;

          case "terminal_updated":
            // Handle terminal updates (e.g., theme changes)
            if (message.updates.theme && termInstance.current) {
              termInstance.current.options.theme = message.updates.theme;
            }
            break;
        }
      } catch (e) {
        console.error("Error processing WebSocket message:", e);
      }
    };

    ws.onerror = (error: Event) => {
      console.error("Terminal WebSocket error:", error);
      // Close the connection to trigger reconnection
      ws.close();
    };

    ws.onclose = (event) => {
      console.log("Terminal WebSocket closed:", event.code, event.reason);
      setIsConnected(false);

      if (termInstance.current) {
        termInstance.current.writeln(
          "\r\n\x1b[33m⚡️ Terminal connection closed\x1b[0m",
        );
      }

      // Attempt to reconnect if not explicitly closed
      if (
        event.code !== 1000 &&
        reconnectAttempts.current < maxReconnectAttempts
      ) {
        reconnectAttempts.current += 1;
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current),
          30000,
        );

        if (termInstance.current) {
          termInstance.current.writeln(
            `\r\n\x1b[33m↻ Reconnecting in ${delay / 1000}s... (${
              reconnectAttempts.current
            }/${maxReconnectAttempts})\x1b[0m`,
          );
        }

        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      }
    };

    // Cleanup function
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Component unmounting");
      }

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [cwd, onExit, onTitleChange, sessionId, shell]);

  // Handle terminal input
  useEffect(() => {
    if (!termInstance.current) return;

    const term = termInstance.current;

    const onData = (data: string) => {
      if (onData) {
        onData(data);
      }

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "input",
            data,
          }),
        );
      }
    };

    term.onData(onData);

    return () => {
      // No need to explicitly remove the data listener as it will be cleaned up by dispose()
      term.dispose();
    };
  }, [onData]);

  // Initialize terminal and WebSocket
  useEffect(() => {
    const cleanupTerminal = initTerminal();
    const cleanupWebSocket = connectWebSocket();

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current) {
        try {
          fitAddon.current.fit();
        } catch (e) {
          console.error("Error resizing terminal:", e);
        }
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("resize", handleResize);

      if (cleanupTerminal) {
        cleanupTerminal();
      }

      if (cleanupWebSocket) {
        cleanupWebSocket();
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [initTerminal, connectWebSocket]);

  // Reconnect if disconnected
  useEffect(() => {
    if (!isConnected && reconnectAttempts.current < maxReconnectAttempts) {
      const timer = setTimeout(() => {
        connectWebSocket();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isConnected, connectWebSocket]);

  // Handle theme changes
  useEffect(() => {
    if (termInstance.current && theme) {
      termInstance.current.options.theme = theme;
    }
  }, [theme]);

  return (
    <div
      className={`terminal-pane h-full w-full bg-black overflow-hidden ${className}`}
      style={{
        backgroundColor: theme?.background || "#1e1e1e",
        color: theme?.foreground || "#d4d4d4",
      }}
      ref={termRef}
    />
  );
};

// Exports
export { TerminalPane };
