import React from 'react';
import { SearchOptions } from './types';

type SearchPanelProps = {
  searchOptions: SearchOptions;
  onSearchOptionsChange: (options: Partial<SearchOptions>) => void;
  onSearch: () => void;
  onClose: () => void;
  isSearching: boolean;
};

export const SearchPanel: React.FC<SearchPanelProps> = ({
  searchOptions,
  onSearchOptionsChange,
  onSearch,
  onClose,
  isSearching,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    onSearchOptionsChange({
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  return (
    <div className="p-4 border-b border-gray-700 bg-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Advanced Search</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
          aria-label="Close search panel"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Search Query</label>
          <div className="flex space-x-2">
            <input
              type="text"
              name="query"
              value={searchOptions.query}
              onChange={handleInputChange}
              className="flex-1 bg-gray-700 text-white rounded px-3 py-1 text-sm"
              placeholder="Enter search term..."
            />
            <button
              onClick={onSearch}
              disabled={isSearching}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                name="caseSensitive"
                checked={searchOptions.caseSensitive}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span>Case Sensitive</span>
            </label>

            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                name="wholeWord"
                checked={searchOptions.wholeWord}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span>Whole Word</span>
            </label>

            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                name="regex"
                checked={searchOptions.regex}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span>Regex</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
