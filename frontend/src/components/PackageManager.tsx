import React, { useState, useEffect } from 'react';

type Props = {
  projectRoot: string;
};

export const PackageManager: React.FC<Props> = ({ projectRoot }) => {
  const [packages, setPackages] = useState<any>({});
  const [newPackage, setNewPackage] = useState('');
  const [manager, setManager] = useState<'npm' | 'pip'>('npm');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPackages();
  }, [projectRoot]);

  const loadPackages = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/packages?root=${encodeURIComponent(projectRoot)}`);
      const data = await response.json();
      setPackages(data);
    } catch (error) {
      console.error('Failed to load packages:', error);
    }
  };

  const installPackage = async () => {
    if (!newPackage.trim()) return;
    
    setLoading(true);
    try {
      await fetch('http://127.0.0.1:8000/packages/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: projectRoot,
          package: newPackage,
          manager
        })
      });
      
      setNewPackage('');
      await loadPackages();
    } catch (error) {
      alert('Failed to install package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      <div className="p-3 border-b border-gray-700">
        <h3 className="text-sm font-medium mb-3">Package Manager</h3>
        
        <div className="flex space-x-2 mb-3">
          <select
            value={manager}
            onChange={(e) => setManager(e.target.value as 'npm' | 'pip')}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
          >
            <option value="npm">npm</option>
            <option value="pip">pip</option>
          </select>
          
          <input
            type="text"
            value={newPackage}
            onChange={(e) => setNewPackage(e.target.value)}
            placeholder="Package name..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
            onKeyPress={(e) => e.key === 'Enter' && installPackage()}
          />
          
          <button
            onClick={installPackage}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-1 rounded text-xs"
          >
            {loading ? '...' : 'Install'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {packages.npm && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-400 mb-2">NPM Dependencies</h4>
            {Object.entries(packages.npm.dependencies || {}).map(([name, version]) => (
              <div key={name} className="flex justify-between items-center py-1 text-xs">
                <span>{name}</span>
                <span className="text-gray-400">{version as string}</span>
              </div>
            ))}
          </div>
        )}

        {packages.pip && (
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">Python Packages</h4>
            {Object.entries(packages.pip).map(([name, version]) => (
              <div key={name} className="flex justify-between items-center py-1 text-xs">
                <span>{name}</span>
                <span className="text-gray-400">{version as string}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};