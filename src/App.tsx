import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SearchProvider } from './contexts/SearchContext';
import AppRoutes from './AppRoutes';
import LiveChat from './components/LiveChat';

function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <AppRoutes />
        <LiveChat />
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;