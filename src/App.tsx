import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './AppRoutes';
import LiveChat from './components/LiveChat';

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <LiveChat />
      </Router>
    </AuthProvider>
  );
}

export default App;