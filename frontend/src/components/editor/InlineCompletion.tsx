import React, { useEffect, useState } from "react";

type Props = {
  code: string;
  cursorPosition: number;
  filePath: string;
  onAccept: (completion: string) => void;
};

export const InlineCompletion: React.FC<Props> = ({
  code,
  cursorPosition,
  filePath,
  onAccept,
}) => {
  const [completion, setCompletion] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (code.length > 10) {
        fetchCompletion();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [code, cursorPosition]);

  const fetchCompletion = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          cursor_pos: cursorPosition,
          file_path: filePath,
        }),
      });

      const data = await response.json();
      setCompletion(data.completion || "");
    } catch (error) {
      setCompletion("");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Tab" && completion) {
      e.preventDefault();
      onAccept(completion);
      setCompletion("");
    } else if (e.key === "Escape") {
      setCompletion("");
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [completion]);

  if (!completion || loading) return null;

  return (
    <div className="absolute bg-gray-700 text-gray-300 px-2 py-1 rounded text-sm border border-gray-600 z-50">
      <div className="flex items-center space-x-2">
        <span className="truncate max-w-xs">{completion.slice(0, 50)}...</span>
        <span className="text-xs text-gray-500">Tab to accept</span>
      </div>
    </div>
  );
};

// Exports
export { InlineCompletion };
