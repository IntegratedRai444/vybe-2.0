import React, { useState } from 'react';

type Props = {
  projectRoot: string;
};

export const FormatSettings: React.FC<Props> = ({ projectRoot }) => {
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState<string[]>([]);

  const setupFormatters = async () => {
    setInstalling(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/format/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root: projectRoot })
      });
      
      const data = await response.json();
      setInstalled(data.installed || []);
    } catch (error) {
      alert('Failed to setup formatters');
    } finally {
      setInstalling(false);
    }
  };

  const formatters = [
    { name: 'Prettier', ext: '.js, .ts, .jsx, .tsx, .json, .css, .html', desc: 'JavaScript/TypeScript formatter' },
    { name: 'Black', ext: '.py', desc: 'Python code formatter' },
    { name: 'gofmt', ext: '.go', desc: 'Go code formatter' },
    { name: 'rustfmt', ext: '.rs', desc: 'Rust code formatter' }
  ];

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200 p-3">
      <h3 className="text-sm font-medium mb-3">Code Formatting</h3>
      
      <button
        onClick={setupFormatters}
        disabled={installing}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded text-sm font-medium mb-4"
      >
        {installing ? 'Installing...' : 'Setup Formatters'}
      </button>

      <div className="space-y-3">
        {formatters.map((formatter) => (
          <div key={formatter.name} className="bg-gray-800 p-3 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">{formatter.name}</span>
              {installed.includes(formatter.name.toLowerCase()) && (
                <span className="text-green-400 text-xs">✓ Installed</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-1">{formatter.desc}</p>
            <p className="text-xs text-gray-500">Files: {formatter.ext}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-400">
        <p className="mb-2">Usage:</p>
        <ul className="space-y-1">
          <li>• Click ✨ Format button in menu</li>
          <li>• Ctrl+Shift+F (coming soon)</li>
          <li>• Auto-format on save (coming soon)</li>
        </ul>
      </div>
    </div>
  );
};