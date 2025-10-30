import React, { useState, useCallback, Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FiMenu, FiX, FiSettings, FiUser, FiLogOut } from 'react-icons/fi';

// Lazy load components with proper default imports
const CommandPalette = React.lazy(() => import('../CommandPalette').then(m => ({ default: m.CommandPalette })));
const FileExplorer = React.lazy(() => import('../file-explorer').then(m => ({ default: m.FileExplorer })));
const Search = React.lazy(() => import('../search').then(m => ({ default: m.Search })));

const MainLayout: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(prev => !prev);
  }, []);

  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <React.Suspense fallback={null}>
        {/* Command Palette */}
        <CommandPalette 
          isOpen={isCommandPaletteOpen} 
          onClose={() => setIsCommandPaletteOpen(false)} 
        />
      </React.Suspense>
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
          <h1 className="text-xl font-semibold">Vybe IDE</h1>
        </div>
        
        <div className="flex-1 max-w-2xl px-4">
          <React.Suspense fallback={null}>
            <Search onSelectResult={() => {}} />
          </React.Suspense>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleCommandPalette}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Open command palette"
          >
            <kbd className="px-2 py-1 text-xs border rounded-md">⌘K</kbd>
          </button>
          
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Settings"
          >
            <FiSettings size={20} />
          </button>
          
          <div className="relative group">
            <button 
              className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="User menu"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                {user?.email?.[0]?.toUpperCase() || <FiUser />}
              </div>
            </button>
            
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 hidden group-hover:block">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
              >
                <FiLogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {isSidebarOpen && (
          <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <Suspense fallback={<div className="p-4">Loading file explorer...</div>}>
              <FileExplorer />
            </Suspense>
          </aside>
        )}
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
      
      {/* Footer */}
      <footer className="h-8 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 px-3 flex items-center justify-between">
        <div>© {new Date().getFullYear()} Vybe IDE</div>
        <div>v{process.env.REACT_APP_VERSION || '1.0.0'}</div>
      </footer>
    </div>
  );
};

export default MainLayout;
