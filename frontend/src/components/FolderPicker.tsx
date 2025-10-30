import React, { useState } from 'react';

interface FolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (path: string) => void;
  selectedFolderName?: string;
}

export const FolderPicker: React.FC<FolderPickerProps> = ({ isOpen, onClose, onSelectFolder }) => {
  const [selectedPath, setSelectedPath] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Clear error when path changes
  React.useEffect(() => {
    if (selectedPath) {
      setError('');
    }
  }, [selectedPath]);

  const handleBrowseFolder = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Create file input for folder selection
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.multiple = true;
      input.style.display = 'none';

      document.body.appendChild(input);

      input.onchange = (event) => {
        const files = (event.target as HTMLInputElement).files;
        if (!files || files.length === 0) {
          document.body.removeChild(input);
          setIsLoading(false);
          return;
        }

        const firstFile = files[0];
        const pathParts = firstFile.webkitRelativePath.split('/');
        const folderName = pathParts[0];
        
        // Set the folder path
        setSelectedPath(`./${folderName}`);
        document.body.removeChild(input);
        setIsLoading(false);
      };

      input.oncancel = () => {
        document.body.removeChild(input);
        setIsLoading(false);
      };

      input.click();
    } catch (err) {
      console.error('Error opening folder picker:', err);
      setError('Failed to open folder picker');
      setIsLoading(false);
    }
  };

  const handleManualPath = () => {
    const path = selectedPath.trim();
    
    if (!path) {
      setError('Please enter a folder path');
      return;
    }
    
    // Validate that it's not a placeholder message
    if (path.includes('Please enter the full path')) {
      setError('Please enter the actual folder path, not the placeholder text');
      return;
    }
    
    // Normalize path separators for cross-platform compatibility
    const normalizedPath = path.replace(/\\/g, '/');
    onSelectFolder(normalizedPath);
    onClose();
  };

  const handleQuickPath = (path: string) => {
    setSelectedPath(path);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl w-[32rem] max-w-[90vw] shadow-2xl border border-slate-700/50">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">
                Specify Folder Path
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Enter the exact path to the folder you want to open
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-all duration-150"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Browse Button */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Browse for Folder</label>
            <button
              onClick={handleBrowseFolder}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl transition-all duration-150 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Opening Folder Picker...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 1v6m8-6v6" />
                  </svg>
                  Browse Folders
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-xs text-slate-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          {/* Manual Path Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Enter Folder Path</label>
            <div className="mb-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <p className="text-xs text-slate-400 mb-2">Examples of valid paths:</p>
              <div className="space-y-1 text-xs text-slate-300 font-mono">
                <div>• <span className="text-green-400">.</span> (current directory)</div>
                <div>• <span className="text-green-400">./my-project</span> (relative path)</div>
                <div>• <span className="text-green-400">C:/Users/YourName/Documents/MyProject</span> (Windows)</div>
                <div>• <span className="text-green-400">/home/username/projects/myproject</span> (Linux/Mac)</div>
              </div>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                placeholder="Enter folder path (e.g., ./my-project or C:/Users/YourName/Documents/MyProject)"
                className={`w-full bg-slate-700/50 text-slate-100 rounded-lg px-4 py-3 border ${error ? 'border-red-500' : 'border-slate-600/50'} focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-150 placeholder:text-slate-400`}
              />
              {error && (
                <div className="text-red-400 text-sm mt-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Quick Path Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleQuickPath('.')}
                  className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs rounded-lg transition-all duration-150"
                >
                  Current Directory
                </button>
                <button
                  onClick={() => handleQuickPath('./projects')}
                  className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs rounded-lg transition-all duration-150"
                >
                  ./projects
                </button>
                <button
                  onClick={() => handleQuickPath('../')}
                  className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs rounded-lg transition-all duration-150"
                >
                  Parent Directory
                </button>
                <button
                  onClick={() => handleQuickPath('C:/Users')}
                  className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs rounded-lg transition-all duration-150"
                >
                  C:/Users
                </button>
                <button
                  onClick={() => handleQuickPath('C:/Projects')}
                  className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs rounded-lg transition-all duration-150"
                >
                  C:/Projects
                </button>
                <button
                  onClick={() => handleQuickPath('D:/')}
                  className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs rounded-lg transition-all duration-150"
                >
                  D:/
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleManualPath}
            disabled={!selectedPath.trim() || selectedPath.includes('Please enter the full path') || !!error}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-150 font-medium"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2z" />
              </svg>
              Open Project
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};