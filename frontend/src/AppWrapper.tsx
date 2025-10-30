import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AIProvider } from './components/ai/AIProvider';
import App from './App';

const AppWrapper: React.FC = () => {
  return (
    <AIProvider>
      <Router>
        <App />
      </Router>
    </AIProvider>
  );
};

export default AppWrapper;
