// src/components/ModelSelector.tsx
import React from "react";

type Props = {
  value: string | null;
  onChange: (v: string | null) => void;
};

export const ModelSelector: React.FC<Props> = ({ value, onChange }) => {
  const options = [
    { label: "Auto (by file type)", value: "" },
    { label: "CodeLlama 7B", value: "codellama:7b-instruct" },
    { label: "Llama‑3", value: "llama3:latest" },
    { label: "Llama‑2", value: "llama2:latest" },
  ];
  return (
    <select
      className="bg-gray-800 text-gray-200 rounded px-2 py-1"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
};
