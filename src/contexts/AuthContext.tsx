import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isOrganizer?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<string>;
  loginWithGoogle: () => Promise<string>;
  loginWithApple: () => Promise<string>;
  register: (name: string, email: string, password: string) => Promise<string>;
  logout: () => void;
  loading: boolean;
  getDashboardRoute: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular verificação de token ao carregar
    const token = localStorage.getItem('token');
    if (token) {
      // Simular usuário logado
      setUser({
        id: '1',
        name: 'João Silva',
        email: 'joao@example.com',
        avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
      });
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<string> => {
    setLoading(true);
    // Login de teste para organizador
    if (email === 'organizador@teste.com' && password === '123456') {
      const mockUser: User = {
        id: 'org-1',
        name: 'Organizador Teste',
        email: email,
        avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
        isOrganizer: true
      };
      setUser(mockUser);
      localStorage.setItem('token', 'mock-token-org');
      setLoading(false);
      return '/organizer-dashboard';
    }
    // Simular login
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser: User = {
      id: '1',
      name: 'João Silva',
      email: email,
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
    };
    
    setUser(mockUser);
    localStorage.setItem('token', 'mock-token');
    setLoading(false);
    return '/profile';
  };

  const loginWithGoogle = async (): Promise<string> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser: User = {
      id: '1',
      name: 'João Silva',
      email: 'joao@gmail.com',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
    };
    
    setUser(mockUser);
    localStorage.setItem('token', 'mock-token');
    setLoading(false);
    return '/profile';
  };

  const loginWithApple = async (): Promise<string> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser: User = {
      id: '1',
      name: 'João Silva',
      email: 'joao@icloud.com',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
    };
    
    setUser(mockUser);
    localStorage.setItem('token', 'mock-token');
    setLoading(false);
    return '/profile';
  };

  const register = async (name: string, email: string, password: string): Promise<string> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser: User = {
      id: '1',
      name: name,
      email: email,
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
    };
    
    setUser(mockUser);
    localStorage.setItem('token', 'mock-token');
    setLoading(false);
    return '/profile';
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  const getDashboardRoute = () => {
    if (!user) return '/';
    return user.isOrganizer ? '/organizer-dashboard' : '/profile';
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    loginWithApple,
    register,
    logout,
    loading,
    getDashboardRoute
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};