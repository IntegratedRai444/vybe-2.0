import React, { useState, useEffect } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onFind: (query: string, options: SearchOptions) => void;
  onReplace: (find: string, replace: string, options: SearchOptions) => void;
  onReplaceAll: (find: string, replace: string, options: SearchOptions) => void;
};

type SearchOptions = {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
};

export const SearchModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  onFind, 
  onReplace, 
  onReplaceAll 
}) => {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    regex: false
  });

  useEffect(() => {
    if (!isOpen) {
      setFindText("");
      setReplaceText("");
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onFind(findText, options);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-16 right-4 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">
          {showReplace ? "Find & Replace" : "Find"}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowReplace(!showReplace)}
            className="text-xs text-gray-400 hover:text-white"
          >
            {showReplace ? "🔍" : "🔄"}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Find"
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />

        {showReplace && (
          <input
            type="text"
            placeholder="Replace"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-700 text-white px-2 py-1 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}

        <div className="flex items-center space-x-3 text-xs">
          <label className="flex items-center text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={options.caseSensitive}
              onChange={(e) => setOptions(prev => ({ ...prev, caseSensitive: e.target.checked }))}
              className="mr-1"
            />
            Aa
          </label>
          <label className="flex items-center text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={options.wholeWord}
              onChange={(e) => setOptions(prev => ({ ...prev, wholeWord: e.target.checked }))}
              className="mr-1"
            />
            Ab
          </label>
          <label className="flex items-center text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={options.regex}
              onChange={(e) => setOptions(prev => ({ ...prev, regex: e.target.checked }))}
              className="mr-1"
            />
            .*
          </label>
        </div>

        <div className="flex space-x-2 pt-2">
          <button
            onClick={() => onFind(findText, options)}
            disabled={!findText}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs"
          >
            Find
          </button>
          
          {showReplace && (
            <>
              <button
                onClick={() => onReplace(findText, replaceText, options)}
                disabled={!findText}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs"
              >
                Replace
              </button>
              <button
                onClick={() => onReplaceAll(findText, replaceText, options)}
                disabled={!findText}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs"
              >
                All
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};