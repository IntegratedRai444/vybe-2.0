import React, { useState } from 'react';

type Props = {
  projectRoot: string;
};

export const DeployPanel: React.FC<Props> = ({ projectRoot }) => {
  const [platform, setPlatform] = useState<'vercel' | 'netlify'>('vercel');
  const [deploying, setDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState('');

  const deploy = async () => {
    setDeploying(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root: projectRoot,
          platform
        })
      });
      
      const data = await response.json();
      if (data.status === 'deployed') {
        setDeployUrl(data.url);
      } else {
        alert(`Deploy failed: ${data.message}`);
      }
    } catch (error) {
      alert('Deploy failed');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200 p-3">
      <h3 className="text-sm font-medium mb-3">Deploy Project</h3>
      
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Platform</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as 'vercel' | 'netlify')}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
        >
          <option value="vercel">Vercel</option>
          <option value="netlify">Netlify</option>
        </select>
      </div>

      <button
        onClick={deploy}
        disabled={deploying}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded text-sm font-medium mb-3"
      >
        {deploying ? 'Deploying...' : `Deploy to ${platform}`}
      </button>

      {deployUrl && (
        <div className="bg-gray-800 p-3 rounded">
          <p className="text-xs text-gray-400 mb-1">Deployed to:</p>
          <a 
            href={deployUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm break-all"
          >
            {deployUrl}
          </a>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        <p className="mb-2">Requirements:</p>
        <ul className="space-y-1">
          <li>• Build script in package.json</li>
          <li>• Output directory (dist/build)</li>
          <li>• {platform} CLI installed</li>
        </ul>
      </div>
    </div>
  );
};