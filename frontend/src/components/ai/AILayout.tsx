import React from 'react';
import { Outlet } from 'react-router-dom';
import { AIProvider } from './AIProvider';

export const AILayout: React.FC = () => {
  return (
    <AIProvider>
      <div className="flex h-screen bg-gray-100">
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </AIProvider>
  );
};
