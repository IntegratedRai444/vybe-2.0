import React, { useState, useEffect } from "react";

type Symbol = {
  name: string;
  kind: string;
  line: number;
  column: number;
  children?: Symbol[];
};

type Props = {
  filePath: string;
  onSymbolClick: (line: number, column: number) => void;
};

export const OutlineView: React.FC<Props> = ({ filePath, onSymbolClick }) => {
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (filePath) {
      loadSymbols();
    }
  }, [filePath]);

  const loadSymbols = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/symbols?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      setSymbols(data.symbols || []);
    } catch (error) {
      console.error("Failed to load symbols:", error);
      setSymbols([]);
    } finally {
      setLoading(false);
    }
  };

  const getSymbolIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case "class": return "🏛️";
      case "function": case "method": return "⚡";
      case "variable": case "field": return "📦";
      case "interface": return "🔗";
      case "enum": return "📋";
      case "namespace": case "module": return "📁";
      case "property": return "🔧";
      case "constructor": return "🏗️";
      default: return "📄";
    }
  };

  const toggleExpanded = (symbolName: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(symbolName)) {
      newExpanded.delete(symbolName);
    } else {
      newExpanded.add(symbolName);
    }
    setExpandedItems(newExpanded);
  };

  const renderSymbol = (symbol: Symbol, depth: number = 0) => {
    const hasChildren = symbol.children && symbol.children.length > 0;
    const isExpanded = expandedItems.has(symbol.name);
    const paddingLeft = depth * 16;

    return (
      <div key={`${symbol.name}-${symbol.line}`}>
        <div
          className="flex items-center py-1 px-2 hover:bg-gray-700 cursor-pointer text-sm"
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(symbol.name);
            } else {
              onSymbolClick(symbol.line, symbol.column);
            }
          }}
        >
          {hasChildren && (
            <span className="mr-1 text-gray-400 text-xs">
              {isExpanded ? "▼" : "▶"}
            </span>
          )}
          <span className="mr-2">{getSymbolIcon(symbol.kind)}</span>
          <span className="text-gray-200 truncate">{symbol.name}</span>
          <span className="ml-auto text-xs text-gray-500">{symbol.kind}</span>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {symbol.children!.map((child) => renderSymbol(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      <div className="p-2 border-b border-gray-700">
        <h3 className="text-xs font-medium text-gray-400 uppercase">Outline</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
        ) : symbols.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">No symbols found</div>
        ) : (
          symbols.map((symbol) => renderSymbol(symbol))
        )}
      </div>
    </div>
  );
};