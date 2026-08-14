import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Lazy load page components
const EditorPage = lazy(() => import('@/pages/EditorPage'));
const AIPage = lazy(() => import('@/pages/AIPage'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Import HOC
import { withAuth } from './contexts/AuthContext';

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="w-8 h-8 animate-spin" />
  </div>
);

// Create protected page components
const ProtectedDashboard = withAuth(DashboardPage);
const ProtectedEditor = withAuth(EditorPage);
const ProtectedAI = withAuth(AIPage);
const ProtectedSettings = withAuth(SettingsPage);

// Main App Routes component
export const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedDashboard />} />
        
        <Route path="/editor" element={<ProtectedEditor />}>
          <Route path=":filePath" element={null} />
        </Route>
        
        <Route path="/ai" element={<ProtectedAI />} />
        
        <Route path="/settings" element={<ProtectedSettings />} />
        
        {/* 404 route - must be the last route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
