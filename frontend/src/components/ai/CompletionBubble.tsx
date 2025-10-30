// src/components/CompletionBubble.tsx
import React from "react";

type Props = {
  text: string;
  onAccept: () => void;
  onReject: () => void;
};

export const CompletionBubble: React.FC<Props> = ({
  text,
  onAccept,
  onReject,
}) => {
  return (
    <div className="absolute bottom-2 left-2 bg-gray-800 text-green-400 p-2 rounded shadow-md z-20 max-w-md">
      <pre className="whitespace-pre-wrap">{text}</pre>
      <div className="mt-1 flex justify-end space-x-2">
        <button
          className="bg-green-600 hover:bg-green-500 text-sm px-2 py-1 rounded"
          onClick={onAccept}
        >
          Tab – Insert
        </button>
        <button
          className="bg-gray-600 hover:bg-gray-500 text-sm px-2 py-1 rounded"
          onClick={onReject}
        >
          Esc – Dismiss
        </button>
      </div>
    </div>
  );
};
