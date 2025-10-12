import React, { useState } from 'react';
import { Menu, Bell, Settings, User, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import NotificationsModal from '../Dashboard/NotificationsModal';

interface HeaderProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  } | null;
  onMenuToggle: () => void;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function Header({ user, onMenuToggle, onLogout, onNavigate }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  if (!user) return null;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
        
        <div className="flex items-center space-x-3">
          <img 
            src="/logo-com-qr.png"
            alt="PULACATRACA" 
            className="h-20 w-auto"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {theme === 'light' ? (
            <Moon className="w-6 h-6 text-gray-600" />
          ) : (
            <Sun className="w-6 h-6 text-yellow-400" />
          )}
        </button>

        <button 
          onClick={() => setIsNotificationsOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
        >
          <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            1
          </span>
        </button>

        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200 dark:border-gray-700">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
          </div>
          
          <div className="relative group">
            <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </button>

            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200">
              <div className="py-2">
                <button 
                  onClick={() => onNavigate('/perfil')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm dark:text-gray-200">Perfil</span>
                </button>
                <button 
                  onClick={() => onNavigate('/configuracoes')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm dark:text-gray-200">Configurações</span>
                </button>
                <hr className="my-1 dark:border-gray-700" />
                <button 
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NotificationsModal 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        userId={user.id}
      />
    </header>
  );
}