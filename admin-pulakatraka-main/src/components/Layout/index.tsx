import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Começa expandido
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Ajusta o sidebar baseado no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024); // 1024px é o breakpoint lg do Tailwind
    };

    // Define o estado inicial
    handleResize();

    // Adiciona o listener para redimensionamento
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    // Fecha o sidebar apenas em telas móveis
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      <Sidebar 
        isOpen={sidebarOpen}
        onNavigate={handleNavigate}
        currentPage={location.pathname}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          user={user}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onLogout={logout}
          onNavigate={handleNavigate}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 