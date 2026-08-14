import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";

export const MainLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

// Default export for backward compatibility
export const MainLayout = MainLayout;

// Named exports
export { MainLayout };
export default MainLayout;
