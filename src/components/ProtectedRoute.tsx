import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProfessionalLoader from './ProfessionalLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'organizer' | 'admin';
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  redirectTo = '/login' 
}) => {
  const { user, loading } = useAuth();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return <ProfessionalLoader />;
  }

  // Se não há usuário logado, redirecionar para login
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Se há role específico requerido, verificar
  if (requiredRole && user.role !== requiredRole) {
    // Redirecionar baseado no role do usuário
    if (user.role === 'organizer' || user.role === 'admin') {
      return <Navigate to="/organizer-dashboard" replace />;
    }
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
