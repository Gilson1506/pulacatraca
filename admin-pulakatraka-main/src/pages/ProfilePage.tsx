import React, { useState, useEffect } from 'react';
import { Shield, Bell, Lock, Eye, EyeOff, Save, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './ProfilePage.css'; // Os estilos serão movidos para este arquivo

interface Activity {
  id: string;
  user_id: string;
  description: string;
  created_at: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_activities')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && data) {
          setActivities(data);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [user?.id]);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'agora mesmo';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `há ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `há ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `há ${diffInDays}d`;
  };

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Perfil do {user.role === 'admin' ? 'Administrador' : 'Usuário'}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie suas informações pessoais, segurança e preferências.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna da Esquerda: Perfil e Segurança */}
        <div className="lg:col-span-2 space-y-8">
          {/* Card de Informações do Perfil */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-6">
              <img 
                src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || '')}&background=random`} 
                alt={user.name} 
                className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-100 dark:ring-blue-900" 
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{user.name}</h2>
                <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                <span className="mt-2 inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded-full">
                  {user.role === 'admin' ? 'Administrador' : user.role === 'organizer' ? 'Organizador' : 'Usuário'}
                </span>
              </div>
              <button className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Editar Perfil
              </button>
            </div>
          </div>

          {/* Card de Segurança */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center space-x-2">
              <Shield className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              <span>Segurança e Senha</span>
            </h3>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha Antiga</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input 
                    type={showOldPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                    autoComplete="current-password"
                  />
                  <button 
                    onClick={() => setShowOldPassword(!showOldPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input 
                    type={showNewPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                    autoComplete="new-password"
                  />
                  <button 
                    onClick={() => setShowNewPassword(!showNewPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-semibold">
                <Save className="w-4 h-4" />
                <span>Atualizar Senha</span>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Notificações e Atividade */}
        <div className="space-y-8">
          {/* Card de Notificações */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center space-x-2">
              <Bell className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              <span>Notificações</span>
            </h3>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Novos eventos</span>
                <input type="checkbox" className="toggle-checkbox" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Atualizações de pedidos</span>
                <input type="checkbox" className="toggle-checkbox" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Newsletter</span>
                <input type="checkbox" className="toggle-checkbox" />
              </div>
            </div>
          </div>

          {/* Card de Atividade Recente */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center space-x-2 p-6">
              <Clock className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              <span>Atividade Recente</span>
            </h3>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <li className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Carregando atividades...
                </li>
              ) : activities.length === 0 ? (
                <li className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Nenhuma atividade recente
                </li>
              ) : (
                activities.map(activity => (
                  <li key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{activity.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatRelativeTime(activity.created_at)}</p>
                  </li>
                ))
              )}
            </ul>
            {activities.length > 0 && (
              <div className="p-4 text-center">
                <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline">
                  Ver todo o log de atividades
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 