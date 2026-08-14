import React, { useState } from "react";

type Snippet = {
  id: string;
  name: string;
  language: string;
  code: string;
  description: string;
};

const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: "1",
    name: "React Component",
    language: "tsx",
    code: `import React from "react";

type Props = {
  // Add props here
};

export const ComponentName: React.FC<Props> = ({}) => {
  return (
    <div>
      {/* Component content */}
    </div>
  );
};`,
    description: "Basic React functional component template",
  },
  {
    id: "2",
    name: "Python Function",
    language: "python",
    code: `def function_name(param1: str, param2: int) -> str:
    """
    Function description

    Args:
        param1: Description of param1
        param2: Description of param2

    Returns:
        Description of return value
    """
    # Implementation here
    return "result"`,
    description: "Python function with type hints and docstring",
  },
  {
    id: "3",
    name: "FastAPI Endpoint",
    language: "python",
    code: `@app.post("/endpoint")
async def endpoint_name(request: RequestModel):
    """Endpoint description"""
    try:
        # Implementation here
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))`,
    description: "FastAPI endpoint template",
  },
];

type Props = {
  onInsert: (code: string) => void;
};

export const SnippetLibrary: React.FC<Props> = ({ onInsert }) => {
  const [snippets] = useState<Snippet[]>(DEFAULT_SNIPPETS);
  const [filter, setFilter] = useState("");

  const filtered = snippets.filter(
    (s) =>
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.language.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      <div className="p-3 border-b border-gray-700">
        <h3 className="text-sm font-medium mb-2">Code Snippets</h3>
        <input
          type="text"
          placeholder="Filter snippets..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-gray-800 text-gray-200 px-2 py-1 rounded text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map((snippet) => (
          <div
            key={snippet.id}
            className="p-3 border-b border-gray-800 hover:bg-gray-800 cursor-pointer"
            onClick={() => onInsert(snippet.code)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">{snippet.name}</span>
              <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                {snippet.language}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-2">{snippet.description}</p>
            <pre className="text-xs bg-gray-800 p-2 rounded overflow-hidden">
              <code className="text-gray-300">
                {snippet.code.split("\n").slice(0, 3).join("\n")}
                {snippet.code.split("\n").length > 3 && "\n..."}
              </code>
            </pre>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            No snippets found
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-700 text-xs text-gray-500">
        Click to insert snippet
      </div>
    </div>
  );
};

// Exports
export { SnippetLibrary };
