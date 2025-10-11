// src/components/TerminalPane.tsx
import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

type Props = {
  cwd: string;          // working directory (absolute)
  command: string;      // command to run, e.g. "npm test"
};

export const TerminalPane: React.FC<Props> = ({ cwd, command }) => {
  const termRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "monospace",
      theme: { background: "#1e1e1e", foreground: "#d4d4d4" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(termRef.current!);
    fit.fit();

    const ws = new WebSocket("ws://127.0.0.1:8000/ws/terminal");
    wsRef.current = ws;

    ws.onopen = () => {
      // On Windows, default shell is cmd.exe; on POSIX, /bin/bash.
      // Allow passing command as program or shell line.
      ws.send(JSON.stringify({ cmd: command, cwd, shell: navigator.platform.startsWith('Win') ? 'cmd.exe' : '/bin/bash' }));
    };
    ws.onmessage = (ev) => term.write(ev.data);
    ws.onerror = () => term.writeln("\r\n❌ terminal error");
    ws.onclose = () => term.writeln("\r\n⚡️ command finished");

    // clean‑up
    return () => {
      ws.close();
      term.dispose();
    };
  }, [command, cwd]);

  return <div className="h-full bg-black" ref={termRef} />;
};
