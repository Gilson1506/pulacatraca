import React, { useState, useEffect } from 'react';
import { Clock, User, Calendar, DollarSign, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Activity {
  id: string;
  user_id: string;
  action: string;
  description: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: {
    name: string;
    email: string;
  };
}

const activityConfig = {
  user: {
    icon: User,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20'
  },
  event: {
    icon: Calendar,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20'
  },
  payment: {
    icon: DollarSign,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20'
  },
  alert: {
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20'
  },
  dashboard: {
    icon: Clock,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20'
  }
};

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('activities')
          .select(`
            *,
            user:profiles(name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.log('⚠️ Erro ao buscar atividades:', error);
          // Definir array vazio em caso de erro
          setActivities([]);
          return;
        }
        setActivities(data || []);
      } catch (error) {
        console.error('❌ Erro ao buscar atividades:', error);
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'agora mesmo';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  const getActivityConfig = (entityType: string) => {
    // Mapear entity_type para os tipos do activityConfig
    const typeMapping: Record<string, keyof typeof activityConfig> = {
      'user': 'user',
      'event': 'event',
      'payment': 'payment',
      'alert': 'alert',
      'dashboard': 'dashboard'
    };
    
    const configType = typeMapping[entityType] || 'user';
    return activityConfig[configType];
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Atividades Recentes</h3>
        <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </div>
      
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Nenhuma atividade recente
          </div>
        ) : (
          activities.map((activity) => {
            const config = getActivityConfig(activity.entity_type);
            const Icon = config.icon;
            
            return (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className={`${config.bg} p-2 rounded-lg flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatRelativeTime(activity.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {activities.length > 0 && (
        <button 
          onClick={() => {/* Implementar visualização completa */}} 
          className="w-full mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          Ver todas as atividades
        </button>
      )}
    </div>
  );
}