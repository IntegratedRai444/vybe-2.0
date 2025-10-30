import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './AppWrapper';
import EnhancedErrorBoundary from './components/EnhancedErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EnhancedErrorBoundary>
      <AppWrapper />
    </EnhancedErrorBoundary>
  </React.StrictMode>,
);