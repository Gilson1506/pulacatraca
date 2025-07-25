import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SearchProvider } from './contexts/SearchContext';
import AppRoutes from './AppRoutes';
import LiveChat from './components/LiveChat';

function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <Router>
          <AppRoutes />
          <LiveChat />
        </Router>
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;