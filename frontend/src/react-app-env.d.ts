/// <reference types="react-scripts" />

// This file helps TypeScript understand module paths in your project
// It tells TypeScript that .tsx files can be imported without extensions
declare module "*.tsx" {
  const content: any;
  export default content;
}

// Add module declarations for your pages
declare module "./pages/Dashboard";
declare module "./pages/Editor";
declare module "./pages/Settings";
declare module "./pages/Login";
declare module "./pages/NotFound";
