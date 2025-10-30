// frontend/src/components/ProjectSearch.tsx
import React, { useState } from 'react';
import * as api from '../utils/api';

interface SearchResult {
  file: string;
  line: number;
  column: number;
  text: string;
  match: string;
}

interface ProjectSearchProps {
  projectRoot: string;
  onFileSelect?: (filePath: string, line?: number) => void;
}

export const ProjectSearch: React.FC<ProjectSearchProps> = ({ projectRoot, onFileSelect }) => {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [options, setOptions] = useState({
    caseSensitive: false,
    wholeWord: false,
    regex: false
  });

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await api.searchInFiles(projectRoot, query, options);
      setResults(response.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReplace = async () => {
    if (!query.trim() || !replacement) return;
    
    setIsSearching(true);
    try {
      const response = await api.replaceInFiles(projectRoot, query, replacement, options);
      console.log(`Replaced ${response.total_replacements} occurrences in ${response.replaced_files.length} files`);
      // Refresh search results
      await handleSearch();
    } catch (error) {
      console.error('Replace error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (onFileSelect) {
      onFileSelect(result.file, result.line);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="space-y-3">
          {/* Search Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search in files..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white"
            >
              {isSearching ? '...' : 'Search'}
            </button>
          </div>

          {/* Replace Input */}
          {showReplace && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Replace with..."
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleReplace}
                disabled={isSearching || !replacement}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white"
              >
                Replace All
              </button>
            </div>
          )}

          {/* Options */}
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setShowReplace(!showReplace)}
              className="text-blue-400 hover:text-blue-300"
            >
              {showReplace ? 'Hide Replace' : 'Show Replace'}
            </button>
            
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={options.caseSensitive}
                onChange={(e) => setOptions({...options, caseSensitive: e.target.checked})}
                className="rounded"
              />
              Case Sensitive
            </label>
            
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={options.wholeWord}
                onChange={(e) => setOptions({...options, wholeWord: e.target.checked})}
                className="rounded"
              />
              Whole Word
            </label>
            
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={options.regex}
                onChange={(e) => setOptions({...options, regex: e.target.checked})}
                className="rounded"
              />
              Regex
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {results.length > 0 && (
          <div className="p-2 text-sm text-gray-400 border-b border-gray-700">
            {results.length} results in {new Set(results.map(r => r.file)).size} files
          </div>
        )}
        
        {results.map((result, index) => (
          <div
            key={index}
            onClick={() => handleResultClick(result)}
            className="p-3 border-b border-gray-800 hover:bg-gray-800 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="text-blue-400">{result.file}</span>
              <span className="text-gray-500">:{result.line}:{result.column}</span>
            </div>
            <div className="mt-1 text-sm text-gray-300 font-mono">
              {result.text}
            </div>
          </div>
        ))}
        
        {results.length === 0 && query && !isSearching && (
          <div className="p-4 text-center text-gray-500">
            No results found for "{query}"
          </div>
        )}
      </div>
    </div>
  );
};