import React from 'react';

interface UserDashboardHeaderProps {
  name: string;
  isVerified: boolean;
  onToggleDarkMode?: () => void;
  darkMode?: boolean;
}

function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const UserDashboardHeader: React.FC<UserDashboardHeaderProps> = ({ name, isVerified, onToggleDarkMode, darkMode }) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-pink-100 shadow-sm sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-pink-600 flex items-center justify-center text-white text-xl font-bold uppercase">
          {getInitials(name)}
        </div>
        <div>
          <div className="text-sm text-gray-500">Olá,</div>
          <div className="font-semibold text-gray-900 leading-tight">{name}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{isVerified ? 'Verificado' : 'Não verificado'}</span>
          </div>
        </div>
      </div>
      <button
        onClick={onToggleDarkMode}
        className="ml-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        aria-label="Alternar modo escuro"
      >
        {/* Ícone de dark mode (sol/lua) */}
        {darkMode ? (
          <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 5.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        ) : (
          <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" /></svg>
        )}
      </button>
    </header>
  );
};

export default UserDashboardHeader; 