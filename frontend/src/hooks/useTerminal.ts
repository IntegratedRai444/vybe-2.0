import { useState, useRef, useEffect, useCallback } from "react";

interface TerminalCommand {
  id: string;
  command: string;
  output: string;
  timestamp: Date;
  status: "running" | "success" | "error";
}

interface TerminalOptions {
  onCommandStart?: (command: string) => void;
  onCommandEnd?: (command: TerminalCommand) => void;
  onData?: (data: string) => void;
  onError?: (error: Error) => void;
  cwd?: string;
  shell?: string;
  autoFocus?: boolean;
  scrollToBottom?: boolean;
}

const useTerminal = (options: TerminalOptions = {}) => {
  const {
    onCommandStart,
    onCommandEnd,
    onData,
    onError,
    cwd = process.cwd(),
    shell = process.env.SHELL || "bash",
    autoFocus = true,
    scrollToBottom = true,
  } = options;

  const [commands, setCommands] = useState<TerminalCommand[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentCommand, setCurrentCommand] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/terminal`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Terminal WebSocket connected");
      setWs(socket);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "output") {
        onData?.(data.data);

        setCommands((prev) => {
          const newCommands = [...prev];
          const lastCommand = newCommands[newCommands.length - 1];

          if (lastCommand && lastCommand.status === "running") {
            lastCommand.output += data.data;
            return [...newCommands];
          }

          return prev;
        });
      } else if (data.type === "exit") {
        setCommands((prev) => {
          const newCommands = [...prev];
          const lastCommand = newCommands[newCommands.length - 1];

          if (lastCommand) {
            lastCommand.status = data.code === 0 ? "success" : "error";
            onCommandEnd?.(lastCommand);
          }

          return [...newCommands];
        });

        setIsProcessing(false);
      }
    };

    socket.onerror = (error) => {
      console.error("Terminal WebSocket error:", error);
      onError?.(new Error("Terminal connection error"));
    };

    socket.onclose = () => {
      console.log("Terminal WebSocket disconnected");
      setWs(null);
    };

    return () => {
      socket.close();
    };
  }, [onCommandEnd, onData, onError]);

  // Auto-focus input when terminal is clicked
  const focusInput = useCallback(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Scroll to bottom when new output is added
  useEffect(() => {
    if (scrollToBottom && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commands, scrollToBottom]);

  // Execute a command
  const executeCommand = useCallback(
    async (command: string) => {
      if (!command.trim() || !ws || isProcessing) return;

      const commandId = Date.now().toString();
      const newCommand: TerminalCommand = {
        id: commandId,
        command,
        output: "",
        timestamp: new Date(),
        status: "running",
      };

      setCommands((prev) => [...prev, newCommand]);
      setHistory((prev) => [...prev, command]);
      setHistoryIndex(-1);
      setCurrentCommand("");
      setIsProcessing(true);
      onCommandStart?.(command);

      try {
        ws.send(
          JSON.stringify({
            type: "command",
            command,
            cwd,
            shell,
          }),
        );
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to execute command");
        onError?.(error);
        setIsProcessing(false);

        setCommands((prev) => {
          const newCommands = [...prev];
          const lastCommand = newCommands[newCommands.length - 1];

          if (lastCommand && lastCommand.id === commandId) {
            lastCommand.status = "error";
            lastCommand.output = error.message;
            onCommandEnd?.(lastCommand);
          }

          return [...newCommands];
        });
      }
    },
    [ws, isProcessing, cwd, shell, onCommandStart, onCommandEnd, onError],
  );

  // Handle keyboard navigation in command history
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (history.length === 0) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const newIndex =
          historyIndex < history.length - 1
            ? historyIndex + 1
            : history.length - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(history[history.length - 1 - newIndex] || "");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
        setHistoryIndex(newIndex);
        setCurrentCommand(
          newIndex >= 0 ? history[history.length - 1 - newIndex] : "",
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        executeCommand(currentCommand);
      }
    },
    [history, historyIndex, currentCommand, executeCommand],
  );

  // Clear the terminal
  const clear = useCallback(() => {
    setCommands([]);
  }, []);

  // Write data to the terminal
  const write = useCallback((data: string) => {
    setCommands((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        command: "",
        output: data,
        timestamp: new Date(),
        status: "success",
      },
    ]);
  }, []);

  // Write an error to the terminal
  const writeError = useCallback(
    (error: string | Error) => {
      const errorMessage = typeof error === "string" ? error : error.message;
      write(`\x1b[31m${errorMessage}\x1b[0m`);
    },
    [write],
  );

  return {
    // Refs
    terminalRef,
    inputRef,

    // State
    commands,
    currentCommand,
    setCurrentCommand,
    isProcessing,
    isConnected: ws !== null,

    // Actions
    executeCommand,
    clear,
    write,
    writeError,
    focusInput,
    handleKeyDown,
  };
};

export default useTerminal;
