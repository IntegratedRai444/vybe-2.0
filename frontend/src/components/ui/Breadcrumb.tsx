// frontend/src/components/Breadcrumb.tsx
import React from 'react';

interface BreadcrumbProps {
  filePath: string;
  projectRoot: string;
  onNavigate?: (path: string) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ filePath, projectRoot, onNavigate }) => {
  if (!filePath) return null;

  const relativePath = filePath.replace(projectRoot, '').replace(/^[\/\\]/, '');
  const parts = relativePath.split(/[\/\\]/);
  
  return (
    <div className="flex items-center text-sm text-gray-400 bg-gray-800 px-3 py-1 border-b border-gray-700">
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      </svg>
      
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <svg className="w-3 h-3 mx-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          <span 
            className={`hover:text-gray-200 cursor-pointer ${index === parts.length - 1 ? 'text-white font-medium' : ''}`}
            onClick={() => {
              if (onNavigate && index < parts.length - 1) {
                const pathToNavigate = parts.slice(0, index + 1).join('/');
                onNavigate(pathToNavigate);
              }
            }}
          >
            {part}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};