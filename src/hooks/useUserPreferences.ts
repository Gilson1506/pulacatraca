import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserPreferences {
  rememberLogin: boolean;
  preferredPaymentMethod: 'credit' | 'debit' | 'pix' | null;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
  language: 'pt' | 'en' | 'es';
  eventFilters: {
    categories: string[];
    priceRange: { min: number; max: number };
    location: string[];
  };
  lastEventSearches: string[];
  favoriteEventTypes: string[];
  autoFillInfo: {
    enabled: boolean;
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
  };
}

const defaultPreferences: UserPreferences = {
  rememberLogin: false,
  preferredPaymentMethod: null,
  notifications: {
    email: true,
    sms: false,
    push: true,
  },
  theme: 'light',
  language: 'pt',
  eventFilters: {
    categories: [],
    priceRange: { min: 0, max: 1000 },
    location: [],
  },
  lastEventSearches: [],
  favoriteEventTypes: [],
  autoFillInfo: {
    enabled: false,
  },
};

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Chave para localStorage baseada no usuário
  const getStorageKey = (userId?: string) => {
    return userId ? `user_preferences_${userId}` : 'guest_preferences';
  };

  // Carregar preferências do usuário
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const storageKey = getStorageKey(user?.id);
      
      // Tentar carregar do localStorage primeiro (mais rápido)
      const localPrefs = localStorage.getItem(storageKey);
      if (localPrefs) {
        try {
          const parsedPrefs = JSON.parse(localPrefs);
          setPreferences({ ...defaultPreferences, ...parsedPrefs });
        } catch (error) {
          console.error('Erro ao parsear preferências locais:', error);
        }
      }

      // Se usuário logado, tentar carregar do banco
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('preferences')
            .eq('user_id', user.id)
            .single();

          if (data && !error) {
            const serverPrefs = { ...defaultPreferences, ...data.preferences };
            setPreferences(serverPrefs);
            // Sincronizar com localStorage
            localStorage.setItem(storageKey, JSON.stringify(serverPrefs));
          }
        } catch (error) {
          console.warn('Tabela user_preferences não existe ou erro ao carregar:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    } finally {
      setLoading(false);
    }
  };

  // Salvar preferências
  const savePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      setPreferences(updatedPreferences);

      const storageKey = getStorageKey(user?.id);
      
      // Salvar no localStorage imediatamente
      localStorage.setItem(storageKey, JSON.stringify(updatedPreferences));

      // Se usuário logado, salvar no banco
      if (user) {
        try {
          const { error } = await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              preferences: updatedPreferences,
              updated_at: new Date().toISOString()
            });

          if (error) {
            console.warn('Erro ao salvar preferências no banco:', error);
          }
        } catch (error) {
          console.warn('Tabela user_preferences não existe:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  };

  // Funções específicas para diferentes tipos de preferências
  const updateNotificationPrefs = (notifications: Partial<UserPreferences['notifications']>) => {
    savePreferences({
      notifications: { ...preferences.notifications, ...notifications }
    });
  };

  const updateEventFilters = (filters: Partial<UserPreferences['eventFilters']>) => {
    savePreferences({
      eventFilters: { ...preferences.eventFilters, ...filters }
    });
  };

  const addToSearchHistory = (searchTerm: string) => {
    const updatedSearches = [
      searchTerm,
      ...preferences.lastEventSearches.filter(s => s !== searchTerm)
    ].slice(0, 10); // Manter apenas os últimos 10

    savePreferences({
      lastEventSearches: updatedSearches
    });
  };

  const addToFavoriteTypes = (eventType: string) => {
    if (!preferences.favoriteEventTypes.includes(eventType)) {
      savePreferences({
        favoriteEventTypes: [...preferences.favoriteEventTypes, eventType]
      });
    }
  };

  const updateAutoFillInfo = (info: Partial<UserPreferences['autoFillInfo']>) => {
    savePreferences({
      autoFillInfo: { ...preferences.autoFillInfo, ...info }
    });
  };

  const setPreferredPayment = (method: UserPreferences['preferredPaymentMethod']) => {
    savePreferences({ preferredPaymentMethod: method });
  };

  const toggleRememberLogin = () => {
    savePreferences({ rememberLogin: !preferences.rememberLogin });
  };

  const setTheme = (theme: UserPreferences['theme']) => {
    savePreferences({ theme });
    // Aplicar tema imediatamente
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Auto - usar preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const setLanguage = (language: UserPreferences['language']) => {
    savePreferences({ language });
    // Aplicar idioma
    document.documentElement.lang = language;
  };

  // Reset todas as preferências
  const resetPreferences = async () => {
    try {
      setPreferences(defaultPreferences);
      
      const storageKey = getStorageKey(user?.id);
      localStorage.removeItem(storageKey);

      if (user) {
        try {
          await supabase
            .from('user_preferences')
            .delete()
            .eq('user_id', user.id);
        } catch (error) {
          console.warn('Erro ao deletar preferências do banco:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao resetar preferências:', error);
    }
  };

  // Exportar preferências para backup
  const exportPreferences = () => {
    const exportData = {
      preferences,
      exported_at: new Date().toISOString(),
      user_id: user?.id
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulacatraca_preferences_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Importar preferências de backup
  const importPreferences = (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.preferences) {
            savePreferences(data.preferences);
            resolve(data.preferences);
          } else {
            reject(new Error('Arquivo de preferências inválido'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  };

  return {
    preferences,
    loading,
    savePreferences,
    updateNotificationPrefs,
    updateEventFilters,
    addToSearchHistory,
    addToFavoriteTypes,
    updateAutoFillInfo,
    setPreferredPayment,
    toggleRememberLogin,
    setTheme,
    setLanguage,
    resetPreferences,
    exportPreferences,
    importPreferences,
    loadPreferences
  };
};