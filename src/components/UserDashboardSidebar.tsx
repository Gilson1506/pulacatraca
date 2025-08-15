import React from 'react';
import { QrCode, BarChart3, User, MessageCircle, LogOut, XCircle, ArrowLeft } from 'lucide-react';

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  tooltip: string;
  route?: string;
  showStatus?: boolean;
}

interface UserDashboardSidebarProps {
  activeMenu: string;
  onMenuSelect: (key: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isVerified: boolean;
}

const menuItems: MenuItem[] = [
  { key: 'home', label: 'Voltar para o site', icon: <ArrowLeft className="h-5 w-5" />, tooltip: 'Voltar para o site', route: '/' },
  { key: 'tickets', label: 'Meus ingressos', icon: <QrCode className="h-5 w-5" />, tooltip: 'Meus ingressos', route: '/profile/tickets' },
  { key: 'orders', label: 'Meus pedidos', icon: <BarChart3 className="h-5 w-5" />, tooltip: 'Meus pedidos', route: '/profile/orders' },
  { key: 'info', label: 'Meus dados', icon: <User className="h-5 w-5" />, tooltip: 'Meus dados', route: '/profile/info', showStatus: true },
  { key: 'support', label: 'Atendimento', icon: <MessageCircle className="h-5 w-5 animate-bounce" />, tooltip: 'Atendimento', route: '/profile/support' },
  { key: 'logout', label: 'Sair', icon: <LogOut className="h-5 w-5" />, tooltip: 'Sair' },
];

const UserDashboardSidebar: React.FC<UserDashboardSidebarProps> = ({ activeMenu, onMenuSelect, isOpen, onClose, isVerified }) => {
  return (
    <>
      {/* Overlay para mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} md:hidden`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside
        className={`fixed top-0 left-0 h-full w-72 max-w-full bg-white dark:bg-gray-900 shadow-lg z-50 transform transition-transform duration-300 md:static md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:block`}
        style={{ maxWidth: '90vw' }}
        aria-label="Menu lateral"
      >
        <div className="flex items-center justify-between px-4 py-3 md:hidden">
          <span className="font-bold text-lg text-gray-900 dark:text-white">Menu</span>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Fechar menu">
            <XCircle className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onMenuSelect(item.key)}
              className={`group flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-left relative ${activeMenu === item.key ? 'bg-pink-600 text-white' : 'hover:bg-pink-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
              tabIndex={0}
              aria-label={item.tooltip}
            >
              <span className="relative">
                {item.icon}
                {/* Tooltip */}
                <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.tooltip}
                </span>
              </span>
              <span className="font-medium text-sm flex items-center gap-1">
                {item.label}
                {item.showStatus && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{isVerified ? 'Verificado' : 'Não verificado'}</span>
                )}
              </span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default UserDashboardSidebar; 