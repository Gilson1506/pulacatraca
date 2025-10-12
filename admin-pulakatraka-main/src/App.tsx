import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/Common/LoadingSpinner';
import LoginForm from './components/Auth/LoginForm';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import EventsPage from './pages/EventsPage';
import TicketsPage from './pages/TicketsPage';
import TicketTransfersPage from './pages/TicketTransfersPage';
import FinancialPage from './pages/FinancialPage';
import SupportPage from './pages/SupportPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TrendsPage from './pages/TrendsPage';
import SecurityPage from './pages/SecurityPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import Layout from './components/Layout';
import AdminLoginPage from './pages/admin/LoginPage';
import AdminDashboard from './pages/admin/DashboardPage';

const AppRoutes = () => {
  const { isAuthenticated, loading, login, user } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Rotas do admin
  const adminRoutes = [
    { path: "/admin/dashboard", Component: AdminDashboard },
  ];

  // Rotas privadas regulares
  const privateRoutes = [
    { path: "/", Component: DashboardPage },
    { path: "/usuarios", Component: UsersPage },
    { path: "/eventos", Component: EventsPage },
    { path: "/ingressos", Component: TicketsPage },
    { path: "/transferencias", Component: TicketTransfersPage },
    { path: "/financeiro", Component: FinancialPage },
    { path: "/suporte", Component: SupportPage },
    
    { path: "/analytics", Component: AnalyticsPage },
    { path: "/tendencias", Component: TrendsPage },
    { path: "/seguranca", Component: SecurityPage },
    { path: "/configuracoes", Component: SettingsPage },
    { path: "/perfil", Component: ProfilePage },
  ];

  const isAdmin = user?.role === 'admin';

  return (
    <Routes>
      {/* Rota de Login */}
      <Route 
        path="/login" 
        element={!isAuthenticated ? <LoginForm onLogin={login} isLoading={loading} /> : <Navigate to="/" />} 
      />

      {/* Rotas do Admin */}
      <Route 
        path="/admin" 
        element={!isAuthenticated ? <AdminLoginPage /> : <Navigate to="/admin/dashboard" />} 
      />

      {/* Rotas Protegidas do Admin */}
      {adminRoutes.map(({ path, Component }) => (
        <Route
          key={path}
          path={path}
          element={
            isAuthenticated && isAdmin ? (
              <Component />
            ) : (
              <Navigate to="/admin" />
            )
          }
        />
      ))}
      
      {/* Rotas Privadas */}
      {privateRoutes.map(({ path, Component }) => (
        <Route 
          key={path}
          path={path}
          element={
            isAuthenticated ? (
              <Layout>
                <Component />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      ))}
      
      {/* Rota de fallback */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}