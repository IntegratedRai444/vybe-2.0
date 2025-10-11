// src/components/ChatPane.tsx
import React, { useState, useEffect, useRef } from "react";
import { ModelSelector } from "./ModelSelector";

type Props = {
  currentFile: string; // relative path – used for routing
};

export const ChatPane: React.FC<Props> = ({ currentFile }) => {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load persisted chat history from IndexedDB (simple wrapper)
  useEffect(() => {
    const stored = localStorage.getItem("cursor_chat");
    if (stored) setMessages(JSON.parse(stored));
  }, []);

  const persist = (newMsgs: any) => {
    setMessages(newMsgs);
    localStorage.setItem("cursor_chat", JSON.stringify(newMsgs));
  };

  const send = async () => {
    if (!input.trim()) return;
    const newMsgs = [...messages, { role: "user", content: input }];
    persist(newMsgs);
    setInput("");

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
    }).then((r) => r.json());

    const assistantMsg = { role: "assistant", content: resp.answer };
    persist([...newMsgs, assistantMsg]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-gray-700 p-2">
      <div className="flex-1 overflow-y-auto mb-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-2 p-2 rounded ${ 
              msg.role === "assistant"
                ? "bg-gray-800 text-white"
                : "bg-gray-700 text-green-300"
            }`}
          >
            <pre className="whitespace-pre-wrap">{msg.content}</pre>
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2">
        <ModelSelector value={model} onChange={setModel} />
        <textarea
          ref={textareaRef}
          className="flex-1 p-2 bg-gray-900 text-gray-100 rounded"
          rows={2}
          placeholder="Ask anything about the file or project… (Ctrl+Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded"
          onClick={send}
        >
          Send
        </button>
      </div>
    </div>
  );
};