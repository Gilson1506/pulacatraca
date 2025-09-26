import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar, BarChart3, CreditCard, PlusCircle, AlertCircle, DollarSign, Users, Edit3, Share2, X, Download, Clock, CheckCircle, XCircle, Trash2, Send, Menu, Camera
} from 'lucide-react';
import EventFormModal from '../components/EventFormModal';
// QrScanner removido - conflitava com html5-qrcode
import { supabase } from '../lib/supabase';
import LoadingButton from '../components/LoadingButton';
import ProfessionalLoader from '../components/ProfessionalLoader';
import { useNavigate } from 'react-router-dom';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Interfaces
interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  location: string;
  description: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  ticketsSold: number;
  totalTickets: number;
  revenue: number;
  category: string;
  price: number;
  image?: string;
  ticketTypes?: any[];
}

interface Sale {
  id: string;
  eventId: string;
  eventName: string;
  eventImage?: string | null;
  buyerName: string;
  buyerEmail: string;
  userName: string; // ✅ PESSOA QUE USA O INGRESSO
  userEmail: string;
  ticketType: string;
  ticketCode: string; // ✅ CÓDIGO DO INGRESSO
  quantity: number;
  amount: number;
  date: string;
  status: 'pendente' | 'confirmado' | 'cancelado' | 'usado';
  paymentMethod: string;
  isUsed: boolean; // ✅ STATUS DE USO
  usedAt: string | null; // ✅ DATA/HORA DE USO
}

interface BankAccount {
  id: string;
  bank: string;
  agency: string;
  account: string;
  type: 'corrente' | 'poupanca';
  isDefault: boolean;
}

interface Withdrawal {
  id: string;
  amount: number;
  requestDate: string;
  processedDate?: string;
  status: 'pendente' | 'processando' | 'concluido' | 'rejeitado';
  bankAccount: string;
  bank_account_id: string; // ✅ ID da conta bancária
  notes?: string; // ✅ Observações
  // ✅ Novas funcionalidades de saque automático
  auto_withdrawal_enabled?: boolean;
  auto_trigger_type?: 'manual' | 'sales_amount' | 'sales_count' | 'time_interval';
  sales_amount_trigger?: number;
  sales_count_trigger?: number;
  time_interval_days?: number;
  withdrawal_limit?: number;
  last_auto_execution?: string;
  next_scheduled_execution?: string;
}

interface CheckIn {
  id: string;
  eventId: string;
  participantName: string;
  ticketType: string;
  checkInTime: string;
  status: 'ok' | 'duplicado' | 'invalido';
}



// Dashboard Overview Component
const DashboardOverview = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTicketsSold: 0,
    activeEvents: 0,
    pendingSales: 0
  });
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<number[]>([]);
  const [ticketsSeries, setTicketsSeries] = useState<number[]>([]);
  const [labelsSeries, setLabelsSeries] = useState<string[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Adicionar timeout para evitar travamento
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: Dados não carregaram em tempo hábil')), 15000)
      );

      const dataPromise = (async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
          throw new Error('Usuário não autenticado');
      }

        // Buscar eventos do organizador com dados completos (mesma lógica do EventPage)
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          start_date,
          end_date,
          location,
          image,
          subject,
          subcategory,
          category,
          classification,
          important_info,
          attractions,
          price,
          status,
          organizer_id,
          available_tickets,
          total_tickets,
          tags,
          location_type,
          location_name,
          location_city,
          location_state,
          location_street,
          location_number,
          location_neighborhood,
          location_cep,
          location_complement,
          location_search,
          ticket_type,
          contact_info,
          created_at,
          updated_at
        `)
        .eq('organizer_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

        const eventsData = events || [];
        const activeEventsCount = eventsData.filter(event => event.status === 'approved').length;
        
        // Buscar dados reais de transações e vendas
        const eventIds = eventsData.map(event => event.id);
        let totalTicketsSold = 0;
        let totalRevenue = 0;
        
        if (eventIds.length > 0) {
          // Buscar transações reais dos eventos do organizador
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('transactions')
            .select(`
              *,
              event:events!inner(organizer_id)
            `)
            .eq('event.organizer_id', user.id)
            .eq('status', 'completed');
          
          if (!transactionsError && transactionsData) {
            totalTicketsSold = transactionsData.length;
            totalRevenue = transactionsData.reduce((sum, transaction) => {
              return sum + (transaction.total_amount || 0);
            }, 0);
          }
          
          // Buscar também dados de ticket_users para informações detalhadas
          const { data: ticketUsersData, error: ticketUsersError } = await supabase
            .from('ticket_users')
            .select(`
              *,
              ticket:tickets!inner(event_id),
              event:events!inner(organizer_id)
            `)
            .eq('event.organizer_id', user.id)
            .in('ticket.event_id', eventIds);
          
          if (!ticketUsersError && ticketUsersData) {
            console.log('📊 Dados de usuários dos tickets:', ticketUsersData.length);
          }
        }
        
        // Criar dados para os gráficos baseados nos eventos
        const currentDate = new Date();
        const labels = [];
        const revenueData = [];
        const ticketsSeries = [];
        
        // Gerar dados dos últimos 6 meses
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          labels.push(monthKey);
          
          // Usar dados reais quando disponíveis
          const monthEvents = eventsData.filter(event => {
            const eventDate = new Date(event.start_date);
            return eventDate.getFullYear() === date.getFullYear() && 
                   eventDate.getMonth() === date.getMonth();
          });
          
          const monthRevenue = monthEvents.reduce((sum, event) => sum + (event.price || 0), 0);
          // Usar dados reais de tickets vendidos em vez de simulação
          const monthTickets = monthEvents.length > 0 ? Math.floor(totalTicketsSold / monthEvents.length) : 0;
          
          revenueData.push(monthRevenue);
          ticketsSeries.push(monthTickets);
        }

        setStats({ 
          totalRevenue: totalRevenue || revenueData.reduce((sum, rev) => sum + rev, 0), 
          totalTicketsSold: totalTicketsSold, 
          activeEvents: activeEventsCount, 
          pendingSales: eventsData.filter(event => event.status === 'pending').length 
        });
        setRecentEvents(eventsData.slice(0, 3));
        setLabelsSeries(labels);
        setRevenueSeries(revenueData);
        setTicketsSeries(ticketsSeries);

        return { events: eventsData };
      })();

      // Executar com timeout
      await Promise.race([dataPromise, timeoutPromise]);
      
    } catch (error) {
      console.error('❌ Erro ao buscar dados do dashboard:', error);
      
      // Definir dados padrão em caso de erro
      setStats({ totalRevenue: 0, totalTicketsSold: 0, activeEvents: 0, pendingSales: 0 });
      setRecentEvents([]);
      setLabelsSeries([]);
      setRevenueSeries([]);
      setTicketsSeries([]);
      
      // Configurar estado de erro
      setHasError(true);
      if (error instanceof Error) {
        if (error.message.includes('Timeout')) {
          setErrorMessage('Dados não carregaram em tempo hábil. Tente novamente.');
          console.warn('⚠️ Timeout no carregamento, usando dados padrão');
        } else if (error.message.includes('Usuário não autenticado')) {
          setErrorMessage('Usuário não autenticado. Faça login novamente.');
          console.warn('⚠️ Usuário não autenticado');
        } else {
          setErrorMessage('Erro ao carregar dados. Tente novamente mais tarde.');
        }
      } else {
        setErrorMessage('Erro inesperado. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] md:min-h-[600px]">
        <div className="text-center p-4">
          <ProfessionalLoader size="lg" className="mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">Carregando dados do dashboard...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
  return (
      <div className="flex items-center justify-center min-h-[400px] md:min-h-[600px]">
        <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-200 max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro no Carregamento</h3>
          <p className="text-gray-600 text-sm md:text-base mb-4">{errorMessage}</p>
          <button
            onClick={() => {
              setHasError(false);
              setErrorMessage('');
              fetchDashboardData();
            }}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm md:text-base"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h2>
      </div>

      {/* Charts - Responsive Grid */}
      {labelsSeries.length === 0 ? (
        <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum Dado Disponível</h3>
          <p className="text-gray-500 text-sm">Crie eventos e realize vendas para ver gráficos e estatísticas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {/* Receita por mês */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4 min-h-[280px] md:min-h-[320px]">
          <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2">Receita por mês</h3>
          <div className="w-full h-48 md:h-52">
          <Line
            data={{
              labels: labelsSeries,
              datasets: [
                {
                  label: 'Receita (R$)',
                  data: revenueSeries,
                  borderColor: 'rgb(236,72,153)',
                  backgroundColor: 'rgba(236,72,153,0.2)',
                  tension: 0.35,
                  fill: true
                }
              ]
            }}
            options={{
                plugins: { 
                  legend: { display: false },
                  tooltip: {
                    mode: 'index',
                    intersect: false
                  }
                },
                scales: { 
                  y: { 
                    ticks: { 
                      callback: (v: any) => `R$ ${v}`,
                      maxTicksLimit: 6
                    },
                    beginAtZero: true
                  },
                  x: {
                    ticks: {
                      maxTicksLimit: 6,
                      maxRotation: 45
                    }
                  }
                },
              responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  mode: 'nearest',
                  axis: 'x',
                  intersect: false
                }
              }}
            />
          </div>
        </div>

        {/* Vendas por mês */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4 min-h-[280px] md:min-h-[320px]">
          <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2">Vendas por mês</h3>
          <div className="w-full h-48 md:h-52">
          <Bar
            data={{
              labels: labelsSeries,
              datasets: [
                {
                  label: 'Ingressos',
                  data: ticketsSeries,
                    backgroundColor: 'rgba(59,130,246,0.6)',
                    borderColor: 'rgba(59,130,246,1)',
                    borderWidth: 1
                }
              ]
            }}
            options={{
                plugins: { 
                  legend: { display: false },
                  tooltip: {
                    mode: 'index',
                    intersect: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      maxTicksLimit: 6
                    }
                  },
                  x: {
                    ticks: {
                      maxTicksLimit: 6,
                      maxRotation: 45
                    }
                  }
                },
              responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  mode: 'nearest',
                  axis: 'x',
                  intersect: false
                }
              }}
            />
          </div>
        </div>

        {/* Resumo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4 min-h-[280px] md:min-h-[320px] md:col-span-2 xl:col-span-1">
          <h3 className="text-xs md:text-sm font-semibold text-gray-700 mb-2">Resumo</h3>
          <div className="w-full h-48 md:h-52">
          <Doughnut
            data={{
              labels: ['Aprovados', 'Pendentes', 'Outros'],
              datasets: [
                {
                  data: [stats.activeEvents, stats.pendingSales, Math.max(0, (recentEvents.length || 0) - stats.activeEvents)],
                    backgroundColor: ['#22c55e', '#f59e0b', '#9ca3af'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                  }
                ]
              }}
              options={{ 
                plugins: { 
                  legend: { 
                    position: 'bottom',
                    labels: {
                      padding: 15,
                      usePointStyle: true,
                      font: {
                        size: 11
                      }
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }, 
                maintainAspectRatio: false,
                responsive: true
              }}
            />
          </div>
          
          {/* Stats Grid - Responsive */}
          <div className="mt-3 md:mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs md:text-sm">
            <div className="p-2 bg-green-50 rounded-lg">
              <div className="text-green-700 font-semibold text-xs">Aprovados</div>
              <div className="text-green-700 font-bold">{stats.activeEvents}</div>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <div className="text-yellow-700 font-semibold text-xs">Pendentes</div>
              <div className="text-yellow-700 font-bold">{stats.pendingSales}</div>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg col-span-2 md:col-span-1">
              <div className="text-blue-700 font-semibold text-xs">Vendidos</div>
              <div className="text-blue-700 font-bold">{stats.totalTicketsSold}</div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Recent Events - Responsive */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Eventos Recentes</h3>
        </div>
        <div className="p-3 md:p-6">
          {recentEvents.length === 0 ? (
            <div className="text-center text-gray-500 py-6 md:py-8">
              <Calendar className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-gray-400" />
              <p className="text-sm md:text-base">Nenhum evento encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
              {recentEvents.map(event => (
                <div key={event.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-24 md:h-32 w-full bg-gray-100">
                    <img
                      src={(event as any).image || '/placeholder-event.jpg'}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjM2OEE3Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTYwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FdmVudG88L3RleHQ+Cjwvc3ZnPgo=';
                      }}
                    />
                  </div>
                  <div className="p-2 md:p-3">
                    <h4 className="font-semibold text-gray-900 truncate text-sm md:text-base">{event.title}</h4>
                    <p className="text-xs text-gray-600 truncate mt-1">
                      {new Date(event.start_date).toLocaleDateString('pt-BR')} • {event.location_name || event.location}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        event.status === 'approved' ? 'bg-green-100 text-green-800' :
                        event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        event.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status === 'approved' ? 'Aprovado' :
                         event.status === 'pending' ? 'Pendente' :
                         event.status === 'cancelled' ? 'Cancelado' :
                         event.status === 'rejected' ? 'Rejeitado' : 'Rascunho'}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <Share2 className="h-3 w-3 md:h-4 md:w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Events Component
const OrganizerEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('todos');
  const [search, setSearch] = useState('');
  const [showEventFormModal, setShowEventFormModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);

      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Erro ao obter usuário:', userError);
        setIsLoading(false);
        return;
      }

      // Buscar apenas eventos do organizador atual
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          *
        `)
        .eq('organizer_id', user.id) // ✅ APENAS EVENTOS DO ORGANIZADOR
        .order('created_at', { ascending: false });

      // Buscar contagem de tickets separadamente para evitar erro de relacionamentos múltiplos
      let ticketCounts: { [key: string]: number } = {};
      if (eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map(event => event.id);
        const { data: ticketsData } = await supabase
          .from('tickets')
          .select('event_id')
          .in('event_id', eventIds);
        
        // Contar tickets por evento
        ticketsData?.forEach(ticket => {
          ticketCounts[ticket.event_id] = (ticketCounts[ticket.event_id] || 0) + 1;
        });
      }

      if (error) throw error;

      const formattedEvents: Event[] = (eventsData as any[])?.map(event => {
        // Debug das imagens
        console.log(`🖼️ Evento ${event.title}:`, {
          image: event.image,
          banner_url: event.banner_url,
          hasImage: !!event.image,
          hasBanner: !!event.banner_url
        });

        return {
          id: event.id,
          title: event.title,
          start_date: event.start_date,
          end_date: event.end_date,
          location: event.location,
          description: event.description,
          status: event.status,
          ticketsSold: ticketCounts[event.id] || 0,
          totalTickets: event.total_tickets || 0,
          revenue: 0, // TODO: Implementar cálculo de receita separadamente
          category: event.category,
          price: event.price || 0,
          image: event.image || event.banner_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iNDAwIDMwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNGMzY4QTciLz4KPHRleHQgeD0iMjAwIiB5PSIxNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkV2ZW50bzwvdGV4dD4KPC9zdmc+Cg=='
        };
      });

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitEvent = async (eventData: Event) => {
    try {
      console.log('🎫 Dados do evento recebidos:', eventData);
      console.log('🎫 Tipos de ingressos:', eventData.ticketTypes);

      // VALIDAÇÃO RIGOROSA DOS CAMPOS OBRIGATÓRIOS
              if (!eventData.start_datetime) {
          throw new Error('Data e hora de início são obrigatórias');
        }

      if (!eventData.title || !eventData.title.trim()) {
        throw new Error('Título do evento é obrigatório');
      }

      if (!eventData.location || !eventData.location.trim()) {
        throw new Error('Local do evento é obrigatório');
      }

      if (!eventData.category || !eventData.category.trim()) {
        throw new Error('Categoria do evento é obrigatória');
      }

      if (selectedEvent) {
        // Edição - atualizar evento e tipos de ingressos diretamente
        const { error: eventError } = await supabase
          .from('events')
          .update({
            title: eventData.title || 'Evento sem título',
            description: eventData.description || 'Descrição não disponível',
            start_datetime: eventData.start_datetime,
            end_datetime: eventData.end_datetime,
            location: eventData.location || 'Local não informado',
            category: eventData.category || 'evento',
            image: eventData.image || null,
            price: eventData.price || 0,
            available_tickets: eventData.totalTickets || 0,
            total_tickets: eventData.totalTickets || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', eventData.id);

        if (eventError) {
          console.error('❌ Erro ao atualizar evento:', eventError);
          throw eventError;
        }

        // Remover tipos de ingressos existentes
        const { error: deleteError } = await supabase
          .from('event_ticket_types')
          .delete()
          .eq('event_id', eventData.id);

        if (deleteError) {
          console.warn('⚠️ Erro ao remover tipos de ingressos existentes:', deleteError);
        }

        // Criar novos tipos de ingressos
        if (eventData.ticketTypes && eventData.ticketTypes.length > 0) {
          for (const ticket of eventData.ticketTypes) {
            console.log('🎫 Atualizando tipo de ingresso:', ticket);
            
            const { data: ticketType, error: ticketError } = await supabase
              .from('event_ticket_types')
              .insert({
                event_id: eventData.id,
                title: ticket.name,
                name: ticket.name,
                description: ticket.description || '',
                area: ticket.area || 'Pista',
                price: ticket.price,
                price_masculine: ticket.price,
                price_feminine: ticket.price_feminine,
                quantity: ticket.quantity,
                available_quantity: ticket.quantity,
                min_quantity: ticket.min_quantity || 1,
                max_quantity: ticket.max_quantity || 5,
                has_half_price: ticket.has_half_price || false,
                sale_period_type: ticket.sale_period_type || 'date',
                availability: ticket.availability || 'public',
                service_fee_type: 'buyer',
                ticket_type: 'paid',
                status: 'active',
                sale_start_date: ticket.sale_start_date ? `${ticket.sale_start_date}T${ticket.sale_start_time || '00:00'}:00` : null,
                sale_end_date: ticket.sale_end_date ? `${ticket.sale_end_date}T${ticket.sale_end_time || '23:59'}:00` : null
              })
              .select()
              .single();

            if (ticketError) {
              console.error('❌ Erro ao criar tipo de ingresso:', ticketError);
              throw ticketError;
            }

            console.log('✅ Tipo de ingresso atualizado:', ticketType);
          }
        }
      } else {
        // Criação - usar função SQL avançada
        const { data: userData } = await supabase.auth.getUser();
        
        // DEBUG: Verificar dados antes de inserir
        console.log('🔍 DEBUG - Dados do evento:', {
          title: eventData.title,
          start_date: eventData.start_date,
          start_time: eventData.start_time,
          end_date: eventData.end_date,
          end_time: eventData.end_time,
          location: eventData.location,
          category: eventData.category,
          price: eventData.price
        });

        // Construir dados do evento com validação rigorosa
        const eventInsertData = {
          // Campos obrigatórios da tabela
          title: eventData.title || 'Evento sem título',
          description: eventData.description || 'Descrição não disponível',
          organizer_id: userData.user?.id || '',
          start_date: eventData.start_date,
          end_date: eventData.end_date,
          location: eventData.location || 'Local não informado',
          status: 'pending',
          price: eventData.price || 0,
          category: eventData.category || 'evento',
          
          // Campos opcionais com valores padrão
          image: eventData.image || null,
          available_tickets: eventData.totalTickets || 0,
          total_tickets: eventData.totalTickets || 0,
          
          // Campos adicionais da tabela
          subject: eventData.category || 'Evento',
          subcategory: eventData.category || 'evento',
          location_type: 'physical',
          location_name: eventData.location || 'Local não informado',
          location_city: 'Cidade não informada',
          location_state: 'Estado não informado',
          ticket_type: 'paid',
          classification: 'Livre',
          important_info: ['Chegue com antecedência'],
          attractions: ['Programação especial'],
          tags: [eventData.category || 'evento'],
          banner_metadata: '{}',
          banner_alt_text: eventData.title || 'Evento',
          max_tickets_per_user: 5,
          min_tickets_per_user: 1,
          sold_tickets: 0
        };

        // DEBUG: Verificar dados finais antes de inserir
        console.log('🔍 DEBUG - Dados finais para inserção:', eventInsertData);

        // Primeiro, criar o evento básico com TODOS os campos obrigatórios
        const { data: event, error: eventError } = await supabase
          .from('events')
          .insert(eventInsertData)
          .select()
          .single();

        if (eventError) {
          console.error('❌ Erro ao criar evento:', eventError);
          throw eventError;
        }

        console.log('✅ Evento criado:', event);

        // Depois, criar os tipos de ingressos diretamente na tabela
        if (eventData.ticketTypes && eventData.ticketTypes.length > 0) {
          for (const ticket of eventData.ticketTypes) {
            console.log('🎫 Criando tipo de ingresso:', ticket);
            
            // Inserir diretamente na tabela event_ticket_types
            const { data: ticketType, error: ticketError } = await supabase
              .from('event_ticket_types')
              .insert({
                event_id: event.id,
                title: ticket.name,
                name: ticket.name,
                description: ticket.description || '',
                area: ticket.area || 'Pista',
                price: ticket.price,
                price_masculine: ticket.price,
                price_feminine: ticket.price_feminine,
                quantity: ticket.quantity,
                available_quantity: ticket.quantity,
                min_quantity: ticket.min_quantity || 1,
                max_quantity: ticket.max_quantity || 5,
                has_half_price: ticket.has_half_price || false,
                sale_period_type: ticket.sale_period_type || 'date',
                availability: ticket.availability || 'public',
                service_fee_type: 'buyer',
                ticket_type: 'paid',
                status: 'active',
                sale_start_date: ticket.sale_start_date ? `${ticket.sale_start_date}T${ticket.sale_start_time || '00:00'}:00` : null,
                sale_end_date: ticket.sale_end_date ? `${ticket.sale_end_date}T${ticket.sale_end_time || '23:59'}:00` : null
              })
              .select()
              .single();

            if (ticketError) {
              console.error('❌ Erro ao criar tipo de ingresso:', ticketError);
              throw ticketError;
            }

            console.log('✅ Tipo de ingresso criado:', ticketType);

            // Se há lotes, criar na tabela ticket_batches (se existir)
            if (ticket.batches && ticket.batches.length > 0) {
              for (const batch of ticket.batches) {
                console.log('📦 Criando lote:', batch);
                
                const { error: batchError } = await supabase
                  .from('ticket_batches')
                  .insert({
                    ticket_type_id: ticketType.id,
                    batch_number: batch.batch_number,
                    batch_name: batch.batch_name || `Lote ${batch.batch_number}`,
                    price_masculine: batch.price_masculine,
                    price_feminine: batch.price_feminine,
                    quantity: batch.quantity,
                    available_quantity: batch.quantity,
                    sale_start_date: batch.sale_start_date ? `${batch.sale_start_date}T${batch.sale_start_time || '00:00'}:00` : null,
                    sale_end_date: batch.sale_end_date ? `${batch.sale_end_date}T${batch.sale_end_time || '23:59'}:00` : null,
                    status: 'active'
                  });

                if (batchError) {
                  console.warn('⚠️ Erro ao criar lote (tabela pode não existir):', batchError);
                }
              }
            }
          }
        }

        console.log('✅ Evento criado com sucesso. ID:', event.id);
      }

      await fetchEvents();
      setSelectedEvent(undefined);
      setShowEventFormModal(false);
      alert('Evento salvo com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao salvar evento:', error);
      alert('Erro ao salvar evento. Verifique os dados e tente novamente.');
    }
  };

  const filteredEvents = events.filter(event =>
    (filter === 'todos' || event.status === filter) &&
    event.title.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
              <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ProfessionalLoader size="lg" className="mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Meus Eventos</h2>
          <p className="text-gray-600">Gerencie todos os seus eventos em um só lugar</p>
        </div>
        <button 
          onClick={() => setShowEventFormModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
        >
          <PlusCircle className="h-5 w-5" />
          Novo Evento
        </button>
      </div>

      {/* Event Form Modal */}
      <EventFormModal
        isOpen={showEventFormModal}
        onClose={() => {
          setShowEventFormModal(false);
          setSelectedEvent(undefined);
        }}
        event={selectedEvent}
        onEventCreated={() => {
          fetchEvents();
          setShowEventFormModal(false);
          setSelectedEvent(undefined);
        }}
      />

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Buscar eventos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="todos">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Rejeitado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Lista de Eventos */}
      <div className="space-y-4">
        {filteredEvents.map((event) => (
          <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-shrink-0">
                <img
                  src={event.image || '/placeholder-event.jpg'}
                  alt={event.title}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(event.start_date).toLocaleDateString('pt-BR')} • {event.location}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.status === 'approved' ? 'bg-green-100 text-green-800' :
                        event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        event.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        event.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {event.status === 'approved' ? 'Aprovado' :
                         event.status === 'pending' ? 'Pendente' :
                         event.status === 'rejected' ? 'Rejeitado' :
                         event.status === 'cancelled' ? 'Cancelado' :
                         'Rascunho'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {event.total_tickets} ingressos
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventFormModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors text-sm font-medium"
                    >
                      <Edit3 className="h-4 w-4 inline mr-1" />
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este evento?')) {
                          // Implementar exclusão
                        }
                      }}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Sales Component
const OrganizerSales = () => {
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();
  const [organizerName] = useState('Organizador Exemplo'); // TODO: Integrar com backend para pegar nome real
  const [isExporting, setIsExporting] = useState(false);
  const [filter, setFilter] = useState<'todos' | 'pendente' | 'confirmado' | 'cancelado'>('todos');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sales, setSales] = useState<Sale[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  useEffect(() => {
    fetchSales();
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Erro ao obter usuário:', userError);
        return;
      }

      // Buscar apenas eventos do organizador atual
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id) // ✅ APENAS EVENTOS DO ORGANIZADOR
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedEvents: Event[] = (eventsData as any[])?.map(event => ({
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        end_date: event.end_date,
        location: event.location,
        description: event.description,
        status: event.status,
        ticketsSold: 0,
        totalTickets: event.total_tickets || 0,
        revenue: 0,
        category: event.category,
        price: event.price || 0, // ✅ INCLUIR PREÇO DO EVENTO
        image: event.image || event.banner_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjM2OEE3Ci8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTYwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FdmVudG88L3RleHQ+Cjwvc3ZnPgo='
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
    }
  };

  const fetchSales = async () => {
    try {
      console.log('🔄 Buscando vendas/ingressos...');
      
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ Erro ao obter usuário:', userError);
        return;
      }

      // Buscar transações com dados do evento
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          event:events!inner(
            id, title, organizer_id, price, image, start_date, location_name, location
          )
        `)
        .eq('event.organizer_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('❌ Erro ao buscar transações:', transactionsError);
        return;
      }

      // Buscar dados dos compradores
      let buyersData = {};
      if (transactionsData && transactionsData.length > 0) {
        const userIds = [...new Set(transactionsData.map(t => t.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', userIds);
          if (!profilesError && profiles) {
            buyersData = profiles.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {});
          }
        }
      }

      // Buscar dados dos usuários dos ingressos
      let ticketUsersData = {};
      if (transactionsData && transactionsData.length > 0) {
        const transactionIds = transactionsData.map(t => t.id);
        const { data: ticketUsers, error: ticketUsersError } = await supabase
          .from('ticket_users')
          .select(`
            *,
            ticket:tickets!inner(transaction_id)
          `)
          .in('ticket.transaction_id', transactionIds);
        if (!ticketUsersError && ticketUsers) {
          const ticketUserIds = [...new Set(ticketUsers.map(tu => tu.user_id).filter(Boolean))];
          let ticketUsersProfiles = {};
          if (ticketUserIds.length > 0) {
            const { data: ticketUserProfiles } = await supabase
              .from('profiles')
              .select('id, name, email')
              .in('id', ticketUserIds);
            if (ticketUserProfiles) {
              ticketUsersProfiles = ticketUserProfiles.reduce((acc, profile) => {
                acc[profile.id] = profile;
                return acc;
              }, {});
            }
          }
          ticketUsersData = ticketUsers.reduce((acc, tu) => {
            if (!acc[tu.ticket.transaction_id]) {
              acc[tu.ticket.transaction_id] = [];
            }
            acc[tu.ticket.transaction_id].push({
              ...tu,
              user: ticketUsersProfiles[tu.user_id] || null
            });
            return acc;
          }, {});
        }
      }

      const formattedSales: Sale[] = transactionsData?.map(transaction => {
        const event = transaction.event;
        const buyer = buyersData[transaction.user_id] || null;
        const ticketUsers = ticketUsersData[transaction.id] || [];
        const ticketUser = ticketUsers[0]?.user || buyer;
        
        return {
          id: transaction.id,
          eventId: event.id,
          eventName: event.title || 'Evento não encontrado',
          eventImage: event.image || null,
          buyerName: buyer?.name || 'Nome não informado',
          buyerEmail: buyer?.email || 'Email não informado',
          userName: ticketUser?.name || buyer?.name || 'Usuário não informado',
          userEmail: ticketUser?.email || buyer?.email || 'Email não informado',
          ticketType: 'Padrão',
          ticketCode: transaction.id.substring(0, 8).toUpperCase(),
          quantity: transaction.quantity || 1,
          amount: transaction.total_amount || transaction.amount || 0,
          date: new Date(transaction.created_at).toLocaleDateString('pt-BR'),
          status: transaction.status === 'completed' ? 'confirmado' : 
                  transaction.status === 'pending' ? 'pendente' : 
                  transaction.status === 'cancelled' ? 'cancelado' : 'pendente',
          paymentMethod: transaction.payment_method || 'Não informado',
          isUsed: false,
          usedAt: null
        };
      }) || [];

      setSales(formattedSales);
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar vendas:', error);
    }
  };

  // Filtrar vendas
  const filteredSales = useMemo(() => {
    return sales.filter((sale: Sale) => {
      const matchesFilter = filter === 'todos' || sale.status === filter;
      const matchesDate = !dateRange.start || !dateRange.end || 
        (sale.date >= dateRange.start && sale.date <= dateRange.end);
      return matchesFilter && matchesDate;
    });
  }, [sales, filter, dateRange]);

  // Calcular totais
  const totalRevenue = useMemo(() => 
    filteredSales.reduce((sum: number, sale: Sale) => sum + sale.amount, 0),
    [filteredSales]
  );
  const totalSales = useMemo(() => filteredSales.length, [filteredSales]);
  const pendingSales = useMemo(() => 
    filteredSales.filter((sale: Sale) => sale.status === 'pendente').length,
    [filteredSales]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Página de Vendas</h2>
          <p className="text-gray-600 mt-1">Gerencie suas vendas e acompanhe o desempenho</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExporting(true)}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
              <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vendas Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">{pendingSales}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            <option value="todos">Todas as Vendas</option>
            <option value="pendente">Pendentes</option>
            <option value="confirmado">Confirmadas</option>
            <option value="cancelado">Canceladas</option>
          </select>
          
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Data inicial"
          />
          
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Data final"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comprador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário do Ingresso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-lg object-cover"
                          src={sale.eventImage || '/placeholder-event.jpg'}
                          alt={sale.eventName}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {sale.eventName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {sale.ticketType} • {sale.ticketCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sale.buyerName}</div>
                    <div className="text-sm text-gray-500">{sale.buyerEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sale.userName}</div>
                    <div className="text-sm text-gray-500">{sale.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {sale.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.status === 'confirmado' ? 'bg-green-100 text-green-800' :
                      sale.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                      sale.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-pink-600 hover:text-pink-900">
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main OrganizerDashboardPage component
const OrganizerDashboardPage = () => {
  const [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fecha o menu ao navegar
  const handleSetActive = (v: string) => {
    setActive(v);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Botão de abrir menu no mobile */}
      <div className="md:hidden flex items-center justify-between p-2 bg-white shadow-sm sticky top-0 z-30">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-full bg-pink-100 text-pink-600">
          <Menu className="h-7 w-7" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">Painel do Organizador</h2>
      </div>
      
      {/* Sidebar como drawer no mobile, fixa no desktop */}
      <div>
        {/* Drawer overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setSidebarOpen(false)}></div>
        )}
        <aside className={`bg-white shadow-md rounded-lg p-2 md:p-4 w-64 md:w-64 mb-4 md:mb-0 md:sticky md:top-6 z-50 transition-transform duration-200 fixed md:static top-0 left-0 h-full md:h-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`} style={{maxWidth: '90vw'}}>
          <nav className="flex flex-col gap-2 w-full">
            <button onClick={() => handleSetActive('dashboard')} className={`w-full flex items-center gap-2 px-4 py-2 rounded ${active==='dashboard'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Dashboard</button>
            <button onClick={() => handleSetActive('events')} className={`w-full flex items-center gap-2 px-4 py-2 rounded ${active==='events'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Eventos</button>
            <button onClick={() => handleSetActive('sales')} className={`w-full flex items-center gap-2 px-4 py-2 rounded ${active==='sales'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Vendas</button>
            <button onClick={() => handleSetActive('finance')} className={`w-full flex items-center gap-2 px-4 py-2 rounded ${active==='finance'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Financeiro</button>
            <button onClick={() => handleSetActive('checkin')} className={`w-full flex items-center gap-2 px-4 py-2 rounded ${active==='checkin'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Check-in</button>
            <button onClick={() => handleSetActive('settings')} className={`w-full flex items-center gap-2 px-4 py-2 rounded ${active==='settings'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Configurações</button>
          </nav>
        </aside>
      </div>
      
      <main className="flex-1 p-2 sm:p-4 md:p-8 w-full">
        {active === 'dashboard' && <DashboardOverview />}
        {active === 'events' && <OrganizerEvents />}
        {active === 'sales' && <OrganizerSales />}
        {active === 'finance' && <div className="p-6"><h2 className="text-2xl font-bold text-gray-900">Financeiro</h2><p className="text-gray-600">Em desenvolvimento...</p></div>}
        {active === 'checkin' && <div className="p-6"><h2 className="text-2xl font-bold text-gray-900">Check-in</h2><p className="text-gray-600">Em desenvolvimento...</p></div>}
        {active === 'settings' && <div className="p-6"><h2 className="text-2xl font-bold text-gray-900">Configurações</h2><p className="text-gray-600">Em desenvolvimento...</p></div>}
      </main>
    </div>
  );
};

export default OrganizerDashboardPage;
