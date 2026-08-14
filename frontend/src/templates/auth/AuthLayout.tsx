import React from 'react';
import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface AuthLayoutProps {
  children?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children || <Outlet />}
        </div>
        <ToastContainer position="top-right" autoClose={5000} />
      </div>
    </ThemeProvider>
  );
};

export default AuthLayout;
