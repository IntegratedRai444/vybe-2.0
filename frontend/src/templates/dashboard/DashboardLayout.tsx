import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Temporary sidebar component - should be moved to components/layout
const Sidebar = ({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div
    className={`bg-gray-800 text-white ${
      isOpen ? "w-64" : "w-20"
    } transition-all duration-300`}
  >
    <div className="p-4">
      <button onClick={onToggle} className="text-white">
        {isOpen ? "◀" : "▶"}
      </button>
    </div>
    {/* Add sidebar content here */}
  </div>
);

// Temporary topbar component - should be moved to components/layout
const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => (
  <header className="bg-white shadow-sm">
    <div className="flex items-center h-16 px-4">
      <button
        onClick={onMenuClick}
        className="p-2 text-gray-600 hover:text-gray-900"
      >
        ☰
      </button>
      <div className="ml-auto">{/* Add user menu here */}</div>
    </div>
  </header>
);

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children || <Outlet />}
        </main>
      </div>

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default DashboardLayout;
