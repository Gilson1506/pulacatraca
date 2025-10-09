import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  DollarSign, 
  HeadphonesIcon, 
  BarChart3,
  Settings,
  Shield,
  Ticket,
  TrendingUp,
  ChevronRight,
  MessageCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  isOpen: boolean;
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface BadgeCounts {
  users: number;
  events: number;
  tickets: number;
  financial: number;
  support: number;
  chat: number;
}

export default function Sidebar({ isOpen, currentPage, onNavigate }: SidebarProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({
    users: 0,
    events: 0,
    tickets: 0,
    financial: 0,
    support: 0,
    chat: 0
  });

  useEffect(() => {
    fetchBadgeCounts();
  }, []);

  const fetchBadgeCounts = async () => {
    try {
      setIsLoading(true);

      // Buscar usuários pendentes (se a coluna status existir)
      let pendingUsers = 0;
      try {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        pendingUsers = count || 0;
      } catch {
        console.log('Coluna status não existe em profiles, usando 0');
      }

      // Buscar eventos pendentes
      let pendingEvents = 0;
      try {
        const { count } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        pendingEvents = count || 0;
      } catch (error) {
        console.log('Erro ao buscar eventos pendentes:', error);
      }

      // Buscar tickets não utilizados (se a coluna used existir)
      let unusedTickets = 0;
      try {
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('used', false);
        unusedTickets = count || 0;
      } catch {
        console.log('Coluna used não existe em tickets, usando 0');
      }

      // Buscar transações pendentes
      let pendingTransactions = 0;
      try {
        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        pendingTransactions = count || 0;
      } catch (error) {
        console.log('Erro ao buscar transações pendentes:', error);
      }

      // Buscar tickets de suporte abertos
      let openSupport = 0;
      try {
        const { count } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');
        openSupport = count || 0;
      } catch (error) {
        console.log('Erro ao buscar tickets de suporte:', error);
      }

      // Buscar mensagens não lidas (se a tabela messages existir)
      let unreadMessages = 0;
      try {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('read', false);
        unreadMessages = count || 0;
      } catch {
        console.log('Tabela messages não existe, usando 0');
      }

      setBadgeCounts({
        users: pendingUsers,
        events: pendingEvents,
        tickets: unusedTickets,
        financial: pendingTransactions,
        support: openSupport,
        chat: unreadMessages
      });
    } catch (error) {
      console.error('Erro ao buscar contagens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    { 
      id: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    { 
      id: '/usuarios',
      label: 'Usuários',
      icon: Users,
      badge: badgeCounts.users || null,
      description: 'Gerenciar usuários e permissões'
    },
    { 
      id: '/eventos',
      label: 'Eventos',
      icon: Calendar,
      badge: badgeCounts.events || null,
      description: 'Moderação e aprovação de eventos'
    },
    { 
      id: '/ingressos',
      label: 'Ingressos',
      icon: Ticket,
      badge: badgeCounts.tickets || null,
      description: 'Gestão de ingressos e vendas'
    },
    { 
      id: '/transferencias',
      label: 'Transferências',
      icon: Ticket,
      badge: null,
      description: 'Transferências de ingressos entre usuários'
    },
    { 
      id: '/financeiro',
      label: 'Financeiro',
      icon: DollarSign,
      badge: badgeCounts.financial || null,
      description: 'Relatórios e transações financeiras'
    },
    { 
      id: '/suporte',
      label: 'Suporte',
      icon: HeadphonesIcon,
      badge: badgeCounts.support || null,
      description: 'Central de atendimento'
    },
    { 
      id: '/chat',
      label: 'Chat',
      icon: MessageCircle,
      badge: badgeCounts.chat || null,
      description: 'Chat em tempo real'
    },
    { 
      id: '/analytics',
      label: 'Relatórios',
      icon: BarChart3,
      badge: null,
      description: 'Análise de dados e métricas'
    },
    { 
      id: '/tendencias',
      label: 'Tendências',
      icon: TrendingUp,
      badge: null,
      description: 'Análise de tendências'
    }
  ];

  const adminItems = [
    { 
      id: '/seguranca',
      label: 'Segurança',
      icon: Shield,
      badge: null,
      description: 'Configurações de segurança'
    },
    { 
      id: '/configuracoes',
      label: 'Configurações',
      icon: Settings,
      badge: null,
      description: 'Configurações do sistema'
    }
  ];

  if (isLoading) {
    return (
      <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </aside>
    );
  }

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => {}}
        />
      )}
      
      <aside className={`
        fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-0 lg:w-16'}
        lg:relative lg:top-0 lg:h-screen lg:z-0
      `}>
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          <div className="p-4">
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left
                    transition-all duration-300 ease-in-out group relative
                    ${currentPage === item.id 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                  title={item.description}
                >
                  <item.icon className={`
                    w-5 h-5 flex-shrink-0
                    transition-colors duration-300
                    ${currentPage === item.id ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white'}
                  `} />
                  
                  <span className={`font-medium ${!isOpen && 'lg:hidden'}`}>
                    {item.label}
                  </span>
                  
                  {item.badge && (
                    <span className={`
                      ml-auto text-xs px-2 py-1 rounded-full font-semibold
                      ${currentPage === item.id
                        ? 'bg-white/20 text-white'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-200'
                      }
                    `}>
                      {item.badge}
                    </span>
                  )}
                  
                  {currentPage === item.id && (
                    <ChevronRight className="w-4 h-4 ml-auto text-white animate-pulse" />
                  )}
                </button>
              ))}
              
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <p className={`text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-3 ${!isOpen && 'lg:hidden'}`}>
                  Administração
                </p>
                {adminItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left
                      transition-all duration-200 group
                      ${currentPage === item.id 
                        ? 'bg-blue-500 text-white shadow-sm' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                    title={item.description}
                  >
                    <item.icon className={`
                      w-5 h-5 flex-shrink-0
                      ${currentPage === item.id ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white'}
                    `} />
                    <span className={`font-medium ${!isOpen && 'lg:hidden'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}