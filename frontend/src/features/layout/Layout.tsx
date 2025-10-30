import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../../components/sidebar/Sidebar';
import { TopBar } from '../../features/topbar/TopBar';
import { AIPanel } from '../../components/ai/AIPanel';
import { AIProvider } from '../../components/ai/AIProvider';
import { ModelSelector } from '../../components/ai/ModelSelector';

export const Layout: React.FC = () => {
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  return (
    <AIProvider>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar 
            rightContent={
              <div className="flex items-center space-x-4">
                <ModelSelector className="w-48" />
                <button
                  onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                  className={`p-2 rounded-full ${isAIPanelOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
                  aria-label="Toggle AI Panel"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10a1 1 0 01-1.64 0l-7-10A1 1 0 014 7h4V2a1 1 0 01.7-.954l2-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            }
          />
          <div className="flex-1 flex overflow-hidden">
            <main className={`${isAIPanelOpen ? 'w-2/3' : 'w-full'} overflow-x-hidden overflow-y-auto bg-gray-50 p-4 transition-all duration-300`}>
              <div className="container mx-auto px-4 py-4">
                <Outlet />
              </div>
            </main>
            
            {isAIPanelOpen && (
              <div className="w-1/3 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
                <AIPanel 
                  initialView="chat"
                  onClose={() => setIsAIPanelOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </AIProvider>
  );
};
