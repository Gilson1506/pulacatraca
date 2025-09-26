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
  location_name?: string;
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

        // Buscar eventos do organizador com dados completos
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id, title, description, start_date, end_date, location, image, subject, subcategory, category,
          classification, important_info, attractions, price, status, organizer_id, available_tickets,
          total_tickets, tags, location_type, location_name, location_city, location_state, location_street,
          location_number, location_neighborhood, location_cep, location_complement, location_search,
          ticket_type, contact_info, created_at, updated_at
        `)
        .eq('organizer_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

        const eventsData = events || [];
        const activeEventsCount = eventsData.filter(event => event.status === 'approved').length;
        
        // Buscar dados reais de transações para calcular vendas e receita
        const eventIds = eventsData.map(event => event.id);
        let totalTicketsSold = 0;
        let totalRevenue = 0;
        
        if (eventIds.length > 0) {
          // Buscar transações dos eventos do organizador
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('transactions')
            .select(`
              id, event_id, user_id, amount, status, created_at
            `)
            .in('event_id', eventIds)
            .eq('status', 'completed');
          
          if (!transactionsError && transactionsData) {
            totalTicketsSold = transactionsData.length; // Cada transação representa 1 ingresso vendido
            totalRevenue = transactionsData.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
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
        setRecentEvents(eventsData.slice(0, 3).map(event => ({
          ...event,
          ticketsSold: 0,
          totalTickets: event.total_tickets || 0,
          revenue: 0
        })));
        setLabelsSeries(labels);
        setRevenueSeries(revenueData);
        setTicketsSeries(ticketsSeries);

        return { events: eventsData };
      })();

      // Executar com timeout
      await Promise.race([dataPromise, timeoutPromise]);
      
    } catch (error: any) {
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
                      {event.start_date ? new Date(event.start_date).toLocaleDateString('pt-BR') : 'Data não informada'} • {event.location_name || event.location || 'Local não informado'}
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

      // Buscar eventos do organizador com dados completos
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id, title, description, start_date, end_date, location, image, subject, subcategory, category,
          classification, important_info, attractions, price, status, organizer_id, available_tickets,
          total_tickets, tags, location_type, location_name, location_city, location_state, location_street,
          location_number, location_neighborhood, location_cep, location_complement, location_search,
          ticket_type, contact_info, created_at, updated_at
        `)
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });

      // Buscar dados de vendas e receita para cada evento
      let ticketCounts: { [key: string]: number } = {};
      let eventRevenues: { [key: string]: number } = {};
      
      if (eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map(event => event.id);
        
        // Buscar tickets vendidos
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select('event_id, status, transaction_id')
          .in('event_id', eventIds);
        
        console.log('🎫 Tickets encontrados:', ticketsData?.length || 0);
        console.log('🎫 Tickets com transaction_id:', ticketsData?.filter(t => t.transaction_id).length || 0);
        if (ticketsError) {
          console.error('❌ Erro ao buscar tickets:', ticketsError);
        }
        
        // Buscar transações para calcular receita real
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('event_id, amount, status')
          .in('event_id', eventIds);
        
        
        console.log('🔍 Buscando transações para eventos:', eventIds);
        console.log('📊 Transações encontradas (todas):', transactionsData?.length || 0);
        console.log('📊 Transações completadas:', transactionsData?.filter(t => t.status === 'completed').length || 0);
        console.log('📊 Transações válidas (completed + pending):', transactionsData?.length || 0);
        console.log('📊 Transações por status:', transactionsData?.reduce((acc: any, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {}) || {});
        if (transactionsError) {
          console.error('❌ Erro ao buscar transações:', transactionsError);
        }
        
        
        // Debug: Buscar todas as transações para verificar se existem
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('event_id, amount, status')
          .limit(10);
        console.log('🔍 Todas as transações (primeiras 10):', allTransactions);
        
        // Contar tickets vendidos por evento
        ticketsData?.forEach(ticket => {
          if (ticket.status === 'active' || ticket.status === 'used') {
          ticketCounts[ticket.event_id] = (ticketCounts[ticket.event_id] || 0) + 1;
          }
        });
        
        // Calcular receita real por evento
        transactionsData?.forEach(transaction => {
          const revenue = transaction.amount || 0;
          eventRevenues[transaction.event_id] = (eventRevenues[transaction.event_id] || 0) + revenue;
        });
        
        // Debug: Log das receitas calculadas
        console.log('💰 Receitas calculadas por evento:', eventRevenues);
        console.log('🎫 Tickets vendidos por evento:', ticketCounts);
        console.log('📊 Transações encontradas:', transactionsData?.length || 0);
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

        const eventRevenue = eventRevenues[event.id] || 0;
        const eventTicketsSold = ticketCounts[event.id] || 0;
        
        // Debug: Log da receita do evento específico
        console.log(`💰 Evento ${event.title}: Receita = R$ ${eventRevenue}, Tickets = ${eventTicketsSold}`);

        return {
          id: event.id,
          title: event.title,
          start_date: event.start_date,
          end_date: event.end_date,
          location: event.location,
          description: event.description,
          status: event.status,
          ticketsSold: eventTicketsSold,
          totalTickets: event.total_tickets || 0,
          revenue: eventRevenue,
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

  const handleSubmitEvent = async (eventData: any) => {
    try {
      console.log('🎫 Dados do evento recebidos:', eventData);
      console.log('🎫 Tipos de ingressos:', eventData.ticketTypes);

      // VALIDAÇÃO RIGOROSA DOS CAMPOS OBRIGATÓRIOS
              if (!eventData.start_date) {
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
            start_date: eventData.start_date,
            end_date: eventData.end_date,
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
                price_feminine: ticket.price_feminine || ticket.price * 0.9,
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
                price_feminine: ticket.price_feminine || ticket.price * 0.9,
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
        onEventCreated={async () => {
            await fetchEvents();
            setSelectedEvent(undefined);
            setShowEventFormModal(false);
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
        </div>
        
                <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="draft">Rascunho</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Rejeitado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Events Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {filteredEvents.map(event => (
          <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-video bg-gradient-to-br from-pink-500 to-purple-600 relative">
              {event.image && event.image !== 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjM2OEE3Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTYwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FdmVudG88L3RleHQ+Cjwvc3ZnPgo=' ? (
                <img 
                  src={event.image} 
                  alt={event.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    console.log(`❌ Erro ao carregar imagem para ${event.title}:`, event.image);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log(`✅ Imagem carregada para ${event.title}:`, event.image);
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-4xl mb-2">🎭</div>
                    <div className="text-sm font-medium">Sem Imagem</div>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="font-semibold text-lg line-clamp-1">{event.title}</h3>
                <p className="text-sm opacity-90">
                  {event.start_date ? new Date(event.start_date).toLocaleDateString('pt-BR') : 'Data não informada'} • 
                  {event.start_date ? new Date(event.start_date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : 'Horário não informado'}
                </p>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="line-clamp-1">{event.location_name || event.location || 'Local não informado'}</span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-600">Vendidos: </span>
                    <span className="font-semibold">{event.ticketsSold}/{event.totalTickets}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Preço: </span>
                    <span className="font-semibold text-blue-600">
                      {event.price === 0 ? 'Gratuito' : `R$ ${event.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(event.ticketsSold / event.totalTickets) * 100}%` }}
                ></div>
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
                <button className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <Share2 className="h-4 w-4" />
                </button>
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
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  
  // Estados removidos - agora o comprador define o usuário

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

      // Buscar eventos do organizador com dados completos
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id, title, description, start_date, end_date, location, image, subject, subcategory, category,
          classification, important_info, attractions, price, status, organizer_id, available_tickets,
          total_tickets, tags, location_type, location_name, location_city, location_state, location_street,
          location_number, location_neighborhood, location_cep, location_complement, location_search,
          ticket_type, contact_info, created_at, updated_at
        `)
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar dados de vendas e receita para cada evento
      let ticketCounts: { [key: string]: number } = {};
      let eventRevenues: { [key: string]: number } = {};
      
      if (eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map(event => event.id);
        
        // Buscar tickets vendidos
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select('event_id, status, transaction_id')
          .in('event_id', eventIds);
        
        console.log('🎫 Tickets encontrados:', ticketsData?.length || 0);
        console.log('🎫 Tickets com transaction_id:', ticketsData?.filter(t => t.transaction_id).length || 0);
        if (ticketsError) {
          console.error('❌ Erro ao buscar tickets:', ticketsError);
        }
        
        // Buscar transações para calcular receita real
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('event_id, amount, status')
          .in('event_id', eventIds);
        
        
        console.log('🔍 Buscando transações para eventos:', eventIds);
        console.log('📊 Transações encontradas (todas):', transactionsData?.length || 0);
        console.log('📊 Transações completadas:', transactionsData?.filter(t => t.status === 'completed').length || 0);
        console.log('📊 Transações válidas (completed + pending):', transactionsData?.length || 0);
        console.log('📊 Transações por status:', transactionsData?.reduce((acc: any, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {}) || {});
        if (transactionsError) {
          console.error('❌ Erro ao buscar transações:', transactionsError);
        }
        
        
        // Debug: Buscar todas as transações para verificar se existem
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('event_id, amount, status')
          .limit(10);
        console.log('🔍 Todas as transações (primeiras 10):', allTransactions);
        
        // Contar tickets vendidos por evento
        ticketsData?.forEach(ticket => {
          if (ticket.status === 'active' || ticket.status === 'used') {
            ticketCounts[ticket.event_id] = (ticketCounts[ticket.event_id] || 0) + 1;
          }
        });
        
        // Calcular receita real por evento
        transactionsData?.forEach(transaction => {
          const revenue = transaction.amount || 0;
          eventRevenues[transaction.event_id] = (eventRevenues[transaction.event_id] || 0) + revenue;
        });
      }

      const formattedEvents: Event[] = (eventsData as any[])?.map(event => ({
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        end_date: event.end_date,
        location: event.location,
        location_name: event.location_name,
        description: event.description,
        status: event.status,
        ticketsSold: ticketCounts[event.id] || 0,
        totalTickets: event.total_tickets || 0,
        revenue: eventRevenues[event.id] || 0,
        category: event.category,
        price: event.price || 0,
        image: event.image || event.banner_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjM2OEE3Ci8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTYwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FdmVudG88L3RleHQ+Cjwvc3ZnPgo='
      })) || [];

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
    }
  };

  const fetchSales = async () => {
    try {
      setIsLoadingSales(true);
      console.log('🔄 Buscando vendas/ingressos...');
      
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ Erro ao obter usuário:', userError);
        return;
      }

      // ✅ USAR A MESMA LÓGICA DO DASHBOARD: buscar eventos primeiro, depois tickets
      console.log('🔍 Buscando eventos do organizador:', user.id);
      
      // 1. Buscar eventos do organizador (mesmo que dashboard)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });

      if (eventsError) {
        console.error('❌ Erro ao buscar eventos:', eventsError);
        return await fetchTransactionsOnly(user.id);
      }

      console.log('✅ Eventos do organizador encontrados:', eventsData?.length || 0);

      if (!eventsData || eventsData.length === 0) {
        console.log('⚠️ Nenhum evento encontrado para o organizador');
        setSales([]);
        return;
      }

      // 2. Buscar tickets dos eventos do organizador (mesmo que dashboard)
      const eventIds = eventsData.map(event => event.id);
      console.log('🔍 Buscando tickets para eventos:', eventIds);
      
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false });

      if (ticketsError) {
        console.error('❌ Erro ao buscar tickets:', ticketsError);
        return await fetchTransactionsOnly(user.id);
      }

      console.log('✅ Tickets encontrados para eventos do organizador:', ticketsData?.length || 0);

      // 3. Buscar dados dos usuários separadamente para evitar problemas de FK
      const userIds = [...new Set([
        ...ticketsData?.map(t => t.buyer_id).filter(Boolean) || [],
        ...ticketsData?.map(t => t.user_id).filter(Boolean) || []
      ])];

      let usersData: any = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);
        
        usersData = profiles?.reduce((acc: any, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {}) || {};
      }

      // 4. Formatar dados das vendas (mesmo que dashboard)
      const formattedSales: Sale[] = ticketsData?.map(ticket => {
        const buyer = usersData[ticket.buyer_id] || {};
        const ticketUser = usersData[ticket.user_id] || buyer;
        const event = eventsData.find(e => e.id === ticket.event_id) || {};
        
        return {
          id: ticket.id,
          eventId: ticket.event_id,
          eventName: event.title || 'Evento não encontrado',
          eventImage: event.image || event.banner_url || null,
          buyerName: buyer.name || 'Nome não informado',
          buyerEmail: buyer.email || 'Email não informado',
          userName: ticketUser.name || 'Usuário não informado',
          userEmail: ticketUser.email || 'Email não informado',
          ticketType: ticket.ticket_type || 'Padrão',
          ticketCode: ticket.code || 'N/A',
          quantity: 1,
          amount: event.price || 0,
          date: new Date(ticket.created_at).toLocaleDateString('pt-BR'),
          status: ticket.status === 'active' ? 'confirmado' : ticket.status === 'used' ? 'usado' : ticket.status === 'cancelled' ? 'cancelado' : 'pendente',
          paymentMethod: 'Não informado',
          isUsed: ticket.status === 'used',
          usedAt: ticket.used_at ? new Date(ticket.used_at).toLocaleString('pt-BR') : null
        };
      }) || [];

      setSales(formattedSales);
    } catch (error: any) {
      console.error('❌ Erro inesperado ao buscar vendas:', error);
    } finally {
      setIsLoadingSales(false);
    }
  };

  // Fallback para buscar apenas transações se tabela tickets não existir
  const fetchTransactionsOnly = async (userId: string) => {
    try {
      console.log('🔄 Fallback: Buscando apenas transações...');
      
      // Buscar transações sem relacionamentos complexos
      const { data: salesData, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrar apenas transações dos eventos do organizador
      const organizerTransactions = salesData?.filter(sale => {
        // Aqui você pode implementar a lógica para filtrar por organizer_id
        // Por enquanto, retorna todas as transações
        return true;
      }) || [];

      const formattedSales: Sale[] = organizerTransactions?.map(sale => ({
        id: sale.id,
        eventId: sale.event_id || 'N/A',
        eventName: 'Evento não encontrado', // Será preenchido depois
        eventImage: null,
        buyerName: 'Comprador não informado',
        buyerEmail: 'Email não informado',
        userName: 'Usuário não informado',
        userEmail: 'Email não informado',
        ticketType: 'Padrão',
        ticketCode: 'N/A', // Não disponível em transações
        quantity: 1,
        amount: sale.amount || 0,
        date: new Date(sale.created_at).toLocaleDateString('pt-BR'),
        status: sale.status === 'completed' ? 'confirmado' : sale.status === 'pending' ? 'pendente' : 'cancelado',
        paymentMethod: sale.payment_method || 'Não informado',
        isUsed: false,
        usedAt: null
      })) || [];

      setSales(formattedSales);
    } catch (error) {
      console.error('❌ Erro no fallback de transações:', error);
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

  const updateTicketStatus = async (ticketId: string, newStatus: 'confirmado' | 'cancelado') => {
    try {
      const dbStatus = newStatus === 'confirmado' ? 'active' : 'cancelled';
      
      // Atualizar status do ingresso
      const { error } = await supabase
        .from('tickets')
        .update({ status: dbStatus })
        .eq('id', ticketId);

      if (error) throw error;

      // Atualizar estado local
      setSales(prev => prev.map(sale => 
        sale.id === ticketId ? { ...sale, status: newStatus } : sale
      ));

      // Recarregar dados
      await fetchSales();
      
      console.log(`✅ Ingresso ${newStatus} com sucesso!`);
    } catch (error) {
      console.error('Erro ao atualizar status do ingresso:', error);
      alert('Erro ao atualizar status do ingresso');
    }
  };

  // Funções de atribuição removidas - agora o comprador define o usuário

  // Função para exportar relatório de vendas em PDF
  const handleExportSalesReport = async () => {
    try {
      // Importar jsPDF
      const { jsPDF } = await import('jspdf');
      // Importar autoTable
      const autoTable = await import('jspdf-autotable');

      // Criar novo documento
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Configurações básicas do documento
      const margin = 20;
      const pageWidth = doc.internal.pageSize.width;
      
      // Título simples
      doc.setFontSize(20);
      doc.setTextColor(236, 72, 153);
      doc.text('PULAKATRACA', margin, 30);
      
      // Configurações do documento
      doc.setFont('helvetica');
      doc.setFontSize(16);
      doc.setTextColor(40);
      
      // Posição inicial do conteúdo
      const contentStartY = 50;

      // Título e informações básicas
      doc.setFontSize(16);
      doc.setTextColor(40);
      doc.text('Relatório de Vendas', margin, contentStartY);
      doc.setFontSize(12);
      doc.text(`Organizador: ${organizerName}`, margin, contentStartY + 10);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, margin, contentStartY + 20);

      // Detalhes do Evento
      let currentY = contentStartY + 30;
      
      doc.setFontSize(12);
      doc.text(`Evento: ${selectedEvent?.title || 'Todos os Eventos'}`, margin, currentY);
      
      if (selectedEvent) {
        currentY += 10;
        doc.text(`Data: ${new Date(selectedEvent.start_date).toLocaleDateString('pt-BR')}`, margin, currentY);
        currentY += 10;
        doc.text(`Local: ${selectedEvent.location}`, margin, currentY);
        currentY += 10;
        doc.text(`Categoria: ${selectedEvent.category}`, margin, currentY);
      }

      // Linha divisória
      currentY += 10;
      doc.line(margin, currentY, pageWidth - margin, currentY);

      // Resumo das Vendas
      currentY += 10;
      doc.setFontSize(14);
      doc.setTextColor(236, 72, 153);
      doc.text('Resumo das Vendas', margin, currentY);
      
      doc.setTextColor(40);
      doc.setFontSize(11);
      currentY += 10;
      doc.text(`Total de Vendas: ${totalSales}`, margin, currentY);
      currentY += 10;
      doc.text(`Receita Total: R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin, currentY);
      currentY += 10;
      doc.text(`Vendas Pendentes: ${pendingSales}`, margin, currentY);

      // Linha divisória
      currentY += 10;
      doc.line(margin, currentY, pageWidth - margin, currentY);

      // Filtros Aplicados
      currentY += 10;
      doc.setFontSize(14);
      doc.setTextColor(236, 72, 153);
      doc.text('Filtros Aplicados', margin, currentY);
      
      doc.setTextColor(40);
      doc.setFontSize(11);
      currentY += 10;
      doc.text(`Status: ${filter === 'todos' ? 'Todos' : filter.charAt(0).toUpperCase() + filter.slice(1)}`, margin, currentY);
      
      if (dateRange.start && dateRange.end) {
        currentY += 10;
        doc.text(`Período: ${new Date(dateRange.start).toLocaleDateString('pt-BR')} a ${new Date(dateRange.end).toLocaleDateString('pt-BR')}`, margin, currentY);
      }

      // Resumo simples
      currentY += 20;
      doc.text(`Total de Vendas: ${totalSales}`, margin, currentY);
      currentY += 10;
      doc.text(`Receita Total: R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin, currentY);
      currentY += 10;
      doc.text(`Vendas Pendentes: ${pendingSales}`, margin, currentY);
      
      // Tabela de vendas básica
      currentY += 20;
      const headers = [
        ['Evento', 'Comprador', 'Valor', 'Status']
      ];

      const data = filteredSales.map(sale => [
        sale.eventName.substring(0, 30),
        sale.buyerName.substring(0, 30),
        `R$ ${sale.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        sale.status.charAt(0).toUpperCase() + sale.status.slice(1)
      ]);

      // Tabela simples
      autoTable.default(doc, {
        startY: currentY + 4,
        head: headers,
        body: data,
        theme: 'striped',
        styles: { 
          fontSize: 10,
          cellPadding: 4,
          font: 'helvetica'
        },
        headStyles: { 
          fillColor: [236, 72, 153],
          textColor: 255,
          fontSize: 10
        },
        margin: { left: margin, right: margin }
      });

      // Rodapé
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Salvar o PDF
      doc.save(`relatorio_vendas_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      if (error instanceof Error) {
        alert(`Erro ao gerar o relatório: ${error.message}`);
      } else {
        alert('Erro ao gerar o relatório. Por favor, tente novamente.');
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Controle de Vendas</h2>
          <p className="text-gray-600">Gerencie todas as vendas dos seus eventos</p>
        </div>
        <button 
          onClick={async () => {
            setIsExporting(true);
            try {
              await handleExportSalesReport();
            } catch (error) {
              console.error('Erro ao gerar PDF:', error);
              alert('Erro ao gerar o relatório. Por favor, tente novamente.');
            } finally {
              setIsExporting(false);
            }
          }}
          disabled={isExporting}
          className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${isExporting ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <span>Gerando...</span>
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              <span>Exportar Relatório</span>
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Vendas</p>
              <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold text-green-600">R$ {totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Vendas Pendentes</p>
              <p className="text-2xl font-bold text-orange-600">
                {filteredSales.filter(sale => sale.status === 'pendente').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          <select
            value={selectedEvent?.id || ''}
            onChange={(e) => {
              const event = events.find(event => event.id === e.target.value);
              setSelectedEvent(event);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="">Todos os Eventos</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendentes</option>
            <option value="confirmado">Confirmados</option>
            <option value="cancelado">Cancelados</option>
          </select>
          
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Sales Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comprador</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingSales ? (
                // Loader enquanto carrega
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`loading-${index}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg mr-3"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                        <div className="h-3 bg-gray-200 rounded w-36"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </td>
                  </tr>
                ))
              ) : filteredSales.length === 0 ? (
                // Mensagem quando não há vendas
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <Calendar className="h-12 w-12 text-gray-300" />
                      <p className="text-lg font-medium">Nenhuma venda encontrada</p>
                      <p className="text-sm">Crie eventos e realize vendas para ver os dados aqui</p>
                    </div>
                  </td>
                </tr>
              ) : (
                // Dados reais das vendas
                filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                        {sale.eventImage ? (
                          <img 
                            src={sale.eventImage} 
                            alt={sale.eventName}
                            className="w-10 h-10 rounded-lg object-cover mr-3"
                            onError={(e) => {
                              // Fallback para ícone se a imagem falhar
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-3 ${sale.eventImage ? 'hidden' : ''}`}>
                        <Calendar className="h-5 w-5 text-pink-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{sale.eventName}</div>
                        <div className="text-sm text-gray-500">{sale.ticketType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="text-sm font-medium text-gray-900">{sale.buyerName}</div>
                    <div className="text-sm text-gray-500">{sale.buyerEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="text-sm font-medium text-gray-900">{sale.userName}</div>
                    <div className="text-sm text-gray-500">{sale.userEmail}</div>
                    {sale.isUsed && sale.usedAt && (
                      <div className="text-xs text-green-600">Usado em: {sale.usedAt}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {sale.ticketCode}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sale.status === 'pendente' ? 'bg-orange-100 text-orange-800' :
                      sale.status === 'confirmado' ? 'bg-green-100 text-green-800' :
                      sale.status === 'usado' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">R$ {sale.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{sale.date}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex gap-2">
                      {sale.status === 'pendente' && (
                        <>
                          <button 
                            onClick={() => updateTicketStatus(sale.id, 'confirmado')}
                            className="text-green-600 hover:text-green-700 flex items-center gap-1 px-2 py-1 text-xs bg-green-50 rounded"
                            title="Confirmar ingresso (comprador poderá definir usuário)"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Confirmar
                          </button>
                          <button 
                            onClick={() => updateTicketStatus(sale.id, 'cancelado')}
                            className="text-red-600 hover:text-red-700"
                            title="Cancelar ingresso"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {sale.status === 'confirmado' && (
                        <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                          ✅ Confirmado
                        </span>
                      )}
                      {sale.status === 'usado' && (
                        <span className="text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded">
                          🎯 Usado
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal removido - agora o comprador define o usuário */}
    </div>
  );
};

// Página Financeira Unificada (Contas Bancárias + Saques)
const OrganizerFinancial = () => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'withdrawals'>('accounts');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg max-w-md">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'accounts'
              ? 'bg-white text-pink-600 shadow-sm'
              : 'text-gray-600 hover:text-pink-600'
          }`}
        >
          Contas Bancárias
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'withdrawals'
              ? 'bg-white text-pink-600 shadow-sm'
              : 'text-gray-600 hover:text-pink-600'
          }`}
        >
          Saques
        </button>
      </div>

      {/* Content */}
      {activeTab === 'accounts' && <BankAccountsSection />}
      {activeTab === 'withdrawals' && <WithdrawalsSection />}
    </div>
  );
};

// Seção de Contas Bancárias
const BankAccountsSection = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);



  // ✅ BUSCAR DADOS REAIS DO SUPABASE
  const fetchBankAccounts = async () => {
    try {
      setIsLoading(true);
      
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ Erro ao obter usuário:', userError);
        return;
      }

      console.log('✅ Usuário obtido para busca:', user.id);

      // Buscar contas bancárias do organizador
      const { data: accountsData, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('organizer_id', user.id);

      if (error) {
        console.error('❌ Erro ao buscar contas bancárias:', error);
        
        if (error.code === '42P01') {
          alert('Tabela bank_accounts não existe. Execute o script SQL no Supabase primeiro.');
        } else {
          alert('Erro ao buscar contas: ' + error.message);
        }
        return;
      }

      console.log('✅ Contas bancárias encontradas:', accountsData?.length || 0);

      // Formatar dados para a interface
      const formattedAccounts: BankAccount[] = accountsData?.map(account => ({
        id: account.id,
        bank: account.bank_name,
        agency: account.agency,
        account: account.account_number,
        type: account.account_type,
        isDefault: account.is_default || false
      })) || [];

      setBankAccounts(formattedAccounts);
    } catch (error: any) {
      console.error('❌ Erro inesperado ao buscar contas bancárias:', error);
      alert('Erro inesperado: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar dados ao montar o componente
  React.useEffect(() => {
    fetchBankAccounts();
  }, []);

  const handleAddAccount = () => {
    setSelectedAccount({ id: '', bank: '', agency: '', account: '', type: 'corrente', isDefault: false });
    setShowAccountModal(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setSelectedAccount(account);
    setShowAccountModal(true);
  };

  const handleSaveAccount = async () => {
    if (!selectedAccount) return;

    // Validar campos obrigatórios
    if (!selectedAccount.bank || !selectedAccount.agency || !selectedAccount.account) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsSavingAccount(true);
      console.log('🔄 Iniciando salvamento da conta bancária...', selectedAccount);

      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ Erro ao obter usuário:', userError);
        alert('Erro ao obter dados do usuário: ' + (userError?.message || 'Usuário não encontrado'));
        return;
      }

      console.log('✅ Usuário obtido:', user.id);

      if (selectedAccount.id) {
        // Editar conta existente
        console.log('🔄 Editando conta existente:', selectedAccount.id);
        
        const updateData = {
          bank_name: selectedAccount.bank,
          agency: selectedAccount.agency,
          account_number: selectedAccount.account,
          account_type: selectedAccount.type,
          is_default: selectedAccount.isDefault
        };
        
        console.log('📝 Dados para atualização:', updateData);

        const { data, error } = await supabase
          .from('bank_accounts')
          .update(updateData)
          .eq('id', selectedAccount.id)
          .select();

        if (error) {
          console.error('❌ Erro na atualização:', error);
          throw error;
        }

        console.log('✅ Conta atualizada com sucesso:', data);
      } else {
        // Criar nova conta
        console.log('🔄 Criando nova conta...');
        
        // Gerar UUID manualmente para garantir que não seja null
        const insertData = {
          id: crypto.randomUUID(), // ✅ Gerar UUID no frontend
          organizer_id: user.id,
          bank_name: selectedAccount.bank.trim(),
          agency: selectedAccount.agency.trim(),
          account_number: selectedAccount.account.trim(),
          account_type: selectedAccount.type,
          is_default: selectedAccount.isDefault || false
        };
        
        console.log('📝 Dados para inserção:', insertData);

        const { data, error } = await supabase
          .from('bank_accounts')
          .insert(insertData)
          .select();

        if (error) {
          console.error('❌ Erro na inserção:', error);
          throw error;
        }

        console.log('✅ Conta criada com sucesso:', data);
      }

      // Recarregar dados e fechar modal
      console.log('🔄 Recarregando lista de contas...');
      await fetchBankAccounts();
      setShowAccountModal(false);
      setSelectedAccount(null);
      console.log('✅ Operação concluída com sucesso!');
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar conta bancária:', error);
      
      // Tratamento específico de erros
      let errorMessage = 'Erro desconhecido ao salvar conta bancária';
      
      if (error.message) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet e tente novamente.';
        } else if (error.message.includes('JWT')) {
          errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert('Erro ao salvar conta bancária: ' + errorMessage);
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      // Atualizar estado local
      setBankAccounts(prev => prev.filter(account => account.id !== accountId));
    } catch (error: any) {
      console.error('Erro ao deletar conta bancária:', error);
      alert('Erro ao deletar conta bancária');
    }
  };

  const handleSetDefault = async (accountId: string) => {
    try {
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      // Primeiro, remover padrão de todas as contas
      await supabase
        .from('bank_accounts')
        .update({ is_default: false })
        .eq('organizer_id', user.id);

      // Depois, definir a conta selecionada como padrão
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_default: true })
        .eq('id', accountId);

      if (error) throw error;

      // Atualizar estado local
      setBankAccounts(prev => prev.map(account => 
        account.id === accountId ? { ...account, isDefault: true } : { ...account, isDefault: false }
      ));
    } catch (error: any) {
      console.error('Erro ao definir conta padrão:', error);
      alert('Erro ao definir conta padrão');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Contas Bancárias</h2>
        <button 
          onClick={handleAddAccount}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="h-5 w-5" />
          Nova Conta
        </button>
      </div>

      {/* Bank Accounts Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <ProfessionalLoader size="md" className="mr-2" />
            <span className="ml-2 text-gray-600">Carregando contas bancárias...</span>
          </div>
        ) : bankAccounts.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta bancária</h3>
            <p className="text-gray-500 mb-4">Adicione uma conta bancária para receber seus pagamentos</p>
            <button 
              onClick={handleAddAccount}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Adicionar primeira conta
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banco</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agência</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Padrão</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bankAccounts.map(account => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{account.bank}</div>
                        <div className="text-sm text-gray-500">{account.agency}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{account.agency}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{account.account}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{account.type.charAt(0).toUpperCase() + account.type.slice(1)}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleSetDefault(account.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        account.isDefault ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      Padrão
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditAccount(account)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bank Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">{selectedAccount ? 'Editar Conta' : 'Nova Conta'}</h3>
                <button 
                  onClick={() => setShowAccountModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleSaveAccount(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                  <input
                    type="text"
                    value={selectedAccount?.bank || ''}
                    onChange={(e) => setSelectedAccount(prev => prev ? { ...prev, bank: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
                  <input
                    type="text"
                    value={selectedAccount?.agency || ''}
                    onChange={(e) => setSelectedAccount(prev => prev ? { ...prev, agency: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
                  <input
                    type="text"
                    value={selectedAccount?.account || ''}
                    onChange={(e) => setSelectedAccount(prev => prev ? { ...prev, account: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={selectedAccount?.type || 'corrente'}
                    onChange={(e) => setSelectedAccount(prev => prev ? { ...prev, type: e.target.value as 'corrente' | 'poupanca' } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="corrente">Corrente</option>
                    <option value="poupanca">Poupança</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <LoadingButton
                    type="submit"
                    isLoading={isSavingAccount}
                    loadingText="Salvando..."
                    variant="primary"
                    size="sm"
                    className="text-sm font-medium"
                  >
                    Salvar Conta
                  </LoadingButton>
                  <LoadingButton
                    type="button"
                    onClick={() => setShowAccountModal(false)}
                    variant="outline"
                    size="sm"
                    className="text-sm font-medium"
                  >
                    Cancelar
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Withdrawals Component
// Seção de Saques
const WithdrawalsSection = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingWithdrawal, setIsSavingWithdrawal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [withdrawalLimit, setWithdrawalLimit] = useState<number>(0);

  // ✅ BUSCAR DADOS REAIS DO SUPABASE
  const fetchWithdrawals = async () => {
    try {
      setIsLoading(true);
      
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Erro ao obter usuário:', userError);
        return;
      }

      // Buscar contas bancárias do organizador
      const { data: accountsData, error: accountsError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('organizer_id', user.id);

      if (accountsError) {
        console.error('Erro ao buscar contas bancárias:', accountsError);
      } else {
        setBankAccounts(accountsData || []);
        console.log('✅ Contas bancárias encontradas:', accountsData?.length || 0);
      }

      // Buscar saques do organizador
      const { data: withdrawalsData, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          bank_account:bank_accounts(bank_name, account_number)
        `)
        .eq('organizer_id', user.id);

      if (error) {
        console.error('Erro ao buscar saques:', error);
        return;
      }

      // Formatar dados para a interface
      const formattedWithdrawals: Withdrawal[] = withdrawalsData?.map(withdrawal => ({
        id: withdrawal.id,
        amount: withdrawal.amount,
        requestDate: withdrawal.created_at ? new Date(withdrawal.created_at).toLocaleDateString('pt-BR') : 'Não informado',
        processedDate: withdrawal.processed_at ? new Date(withdrawal.processed_at).toLocaleDateString('pt-BR') : undefined,
        status: withdrawal.status,
        bankAccount: withdrawal.bank_account?.bank_name + ' - ' + withdrawal.bank_account?.account_number || 'N/A',
        bank_account_id: withdrawal.bank_account_id || '',
        // withdrawal_limit removido - não existe na tabela
        notes: withdrawal.notes
      })) || [];

      setWithdrawals(formattedWithdrawals);
      console.log('✅ Saques encontrados:', formattedWithdrawals.length);
    } catch (error) {
      console.error('Erro inesperado ao buscar saques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar dados ao montar o componente
  React.useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleAddWithdrawal = () => {
    setSelectedWithdrawal({ 
      id: '', 
      amount: 0, 
      requestDate: new Date().toISOString().split('T')[0], 
      status: 'pendente', 
      bankAccount: '',
      bank_account_id: '',
      notes: '',
      // ✅ Novas funcionalidades de saque automático
      auto_withdrawal_enabled: false,
      auto_trigger_type: 'manual',
      sales_amount_trigger: 0,
      sales_count_trigger: 0,
      time_interval_days: 0,
      withdrawal_limit: 0
    });
    setShowWithdrawalModal(true);
  };

  const handleEditWithdrawal = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowWithdrawalModal(true);
  };

  const handleDeleteWithdrawal = async (withdrawalId: string) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .delete()
        .eq('id', withdrawalId);

      if (error) throw error;

    setWithdrawals(prev => prev.filter(withdrawal => withdrawal.id !== withdrawalId));
      console.log('✅ Saque deletado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao deletar saque:', error);
      alert('Erro ao deletar saque');
    }
  };

  // ✅ Função para salvar saque no banco de dados
  const handleSaveWithdrawal = async () => {
    if (!selectedWithdrawal) return;

    // Validar campos obrigatórios
    if (!selectedWithdrawal.amount || !selectedWithdrawal.bank_account_id) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsSavingWithdrawal(true);
      console.log('🔄 Salvando saque...', selectedWithdrawal);

      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ Erro ao obter usuário:', userError);
        return;
      }

      if (selectedWithdrawal.id) {
        // Editar saque existente (apenas admin pode fazer isso)
        console.log('🔄 Editando saque existente:', selectedWithdrawal.id);
        
        const updateData = {
          amount: selectedWithdrawal.amount,
          notes: selectedWithdrawal.notes,
          // ✅ Novas funcionalidades de saque automático
          auto_withdrawal_enabled: selectedWithdrawal.auto_withdrawal_enabled,
          auto_trigger_type: selectedWithdrawal.auto_trigger_type,
          sales_amount_trigger: selectedWithdrawal.sales_amount_trigger,
          sales_count_trigger: selectedWithdrawal.sales_count_trigger,
          time_interval_days: selectedWithdrawal.time_interval_days,
          withdrawal_limit: selectedWithdrawal.withdrawal_limit
        };
        
        const { data, error } = await supabase
          .from('withdrawals')
          .update(updateData)
          .eq('id', selectedWithdrawal.id)
          .select();

        if (error) throw error;
        console.log('✅ Saque atualizado com sucesso:', data);
      } else {
        // Criar novo saque
        console.log('🔄 Criando novo saque...');
        
        const insertData = {
          id: crypto.randomUUID(),
          organizer_id: user.id,
          bank_account_id: selectedWithdrawal.bank_account_id,
          amount: selectedWithdrawal.amount,
          status: 'pendente', // ✅ Sempre pendente para novos saques
          notes: selectedWithdrawal.notes || '',
          // ✅ Novas funcionalidades de saque automático
          auto_withdrawal_enabled: selectedWithdrawal.auto_withdrawal_enabled || false,
          auto_trigger_type: selectedWithdrawal.auto_trigger_type || 'manual',
          sales_amount_trigger: selectedWithdrawal.sales_amount_trigger || null,
          sales_count_trigger: selectedWithdrawal.sales_count_trigger || null,
          time_interval_days: selectedWithdrawal.time_interval_days || null,
          withdrawal_limit: selectedWithdrawal.withdrawal_limit || null
          // ✅ created_at e updated_at são preenchidos automaticamente pelo banco
        };
        
        const { data, error } = await supabase
          .from('withdrawals')
          .insert(insertData)
          .select();

        if (error) throw error;
        console.log('✅ Saque criado com sucesso:', data);
      }

      // Recarregar dados e fechar modal
      await fetchWithdrawals();
      setShowWithdrawalModal(false);
      setSelectedWithdrawal(null);
      console.log('✅ Operação concluída com sucesso!');
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar saque:', error);
      alert('Erro ao salvar saque: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSavingWithdrawal(false);
    }
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Saques</h2>
        <button 
          onClick={handleAddWithdrawal}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <PlusCircle className="h-5 w-5" />
          Novo Saque
        </button>
      </div>

      {/* Withdrawals Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Solicitação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conta Bancária</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Automático</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observações</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {withdrawals.map(withdrawal => (
                <tr key={withdrawal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-green-600">R$ {withdrawal.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{withdrawal.requestDate}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      withdrawal.status === 'pendente' ? 'bg-orange-100 text-orange-800' :
                      withdrawal.status === 'processando' ? 'bg-yellow-100 text-yellow-800' :
                      withdrawal.status === 'concluido' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{withdrawal.bankAccount}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {withdrawal.auto_withdrawal_enabled ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✅ Automático
                        </span>
                        <span className="text-xs text-gray-600">
                          {withdrawal.auto_trigger_type === 'sales_amount' && `R$ ${withdrawal.sales_amount_trigger?.toLocaleString() || 0}`}
                          {withdrawal.auto_trigger_type === 'sales_count' && `${withdrawal.sales_count_trigger || 0} vendas`}
                          {withdrawal.auto_trigger_type === 'time_interval' && `A cada ${withdrawal.time_interval_days || 0} dias`}
                          {withdrawal.auto_trigger_type === 'manual' && 'Manual'}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        ❌ Manual
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {withdrawal.notes ? (
                      <div className="max-w-xs">
                        <p className="text-gray-700 line-clamp-2" title={withdrawal.notes}>
                          {withdrawal.notes}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Sem observações</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex gap-2">
                      {/* ✅ Apenas editar e deletar - status controlado pelo admin */}
                      <button 
                        onClick={() => handleEditWithdrawal(withdrawal)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Editar saque"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteWithdrawal(withdrawal.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Deletar saque"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">{selectedWithdrawal ? 'Editar Saque' : 'Novo Saque'}</h3>
                <button 
                  onClick={() => setShowWithdrawalModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={selectedWithdrawal?.amount || ''}
                    onChange={(e) => setSelectedWithdrawal(prev => prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conta Bancária *</label>
                  <select
                    value={selectedWithdrawal?.bank_account_id || ''}
                    onChange={(e) => {
                      const accountId = e.target.value;
                      const account = bankAccounts.find(acc => acc.id === accountId);
                      setSelectedWithdrawal(prev => prev ? { 
                        ...prev, 
                        bank_account_id: accountId,
                        bankAccount: account ? `${account.bank} - ${account.agency}/${account.account}` : ''
                      } : prev);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma conta bancária</option>
                    {bankAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.bank} - Agência: {account.agency}, Conta: {account.account}
                      </option>
                    ))}
                  </select>
                  {bankAccounts.length === 0 && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠️ Nenhuma conta bancária cadastrada. 
                      <button 
                        type="button"
                        onClick={() => {
                          setShowWithdrawalModal(false);
                          // TODO: Abrir modal de contas bancárias
                        }}
                        className="text-blue-600 hover:text-blue-800 underline ml-1"
                      >
                        Cadastre uma conta primeiro
                      </button>
                    </p>
                  )}
                </div>

                {/* ✅ Configurações de Saque Automático */}
                <div className="border-t pt-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">🔄 Saque Automático</h4>
                  
                  <div className="space-y-4">
                    {/* Ativar saque automático */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="auto_withdrawal"
                        checked={selectedWithdrawal?.auto_withdrawal_enabled || false}
                        onChange={(e) => setSelectedWithdrawal(prev => prev ? { 
                          ...prev, 
                          auto_withdrawal_enabled: e.target.checked,
                          auto_trigger_type: e.target.checked ? 'sales_amount' : 'manual'
                        } : prev)}
                        className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                      />
                      <label htmlFor="auto_withdrawal" className="ml-2 text-sm font-medium text-gray-700">
                        Ativar saque automático
                      </label>
                </div>

                    {/* Tipo de gatilho */}
                    {selectedWithdrawal?.auto_withdrawal_enabled && (
                <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Gatilho</label>
                  <select
                          value={selectedWithdrawal?.auto_trigger_type || 'sales_amount'}
                          onChange={(e) => setSelectedWithdrawal(prev => prev ? { 
                            ...prev, 
                            auto_trigger_type: e.target.value as any 
                          } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                          <option value="sales_amount">Valor total de vendas</option>
                          <option value="sales_count">Número de vendas</option>
                          <option value="time_interval">Intervalo de tempo</option>
                  </select>
                </div>
                    )}

                    {/* Gatilho por valor de vendas */}
                    {selectedWithdrawal?.auto_withdrawal_enabled && selectedWithdrawal?.auto_trigger_type === 'sales_amount' && (
                <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor para Acionar (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={selectedWithdrawal?.sales_amount_trigger || ''}
                          onChange={(e) => setSelectedWithdrawal(prev => prev ? { 
                            ...prev, 
                            sales_amount_trigger: parseFloat(e.target.value) || 0 
                          } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Saque será executado quando as vendas atingirem este valor
                        </p>
                </div>
                    )}

                    {/* Gatilho por contador de vendas */}
                    {selectedWithdrawal?.auto_withdrawal_enabled && selectedWithdrawal?.auto_trigger_type === 'sales_count' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Número de Vendas</label>
                        <input
                          type="number"
                          min="1"
                          value={selectedWithdrawal?.sales_count_trigger || ''}
                          onChange={(e) => setSelectedWithdrawal(prev => prev ? { 
                            ...prev, 
                            sales_count_trigger: parseInt(e.target.value) || 0 
                          } : prev)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Saque será executado após este número de vendas
                        </p>
                      </div>
                    )}

                    {/* Gatilho por intervalo de tempo */}
                    {selectedWithdrawal?.auto_withdrawal_enabled && selectedWithdrawal?.auto_trigger_type === 'time_interval' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo (dias)</label>
                        <input
                          type="number"
                          min="1"
                          value={selectedWithdrawal?.time_interval_days || ''}
                          onChange={(e) => setSelectedWithdrawal(prev => prev ? { 
                            ...prev, 
                            time_interval_days: parseInt(e.target.value) || 0 
                          } : prev)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          placeholder="30"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Saque será executado a cada X dias
                        </p>
                      </div>
                    )}

                    {/* Limite de saque */}
                    {selectedWithdrawal?.auto_withdrawal_enabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Limite por Saque (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={selectedWithdrawal?.withdrawal_limit || ''}
                          onChange={(e) => setSelectedWithdrawal(prev => prev ? { 
                            ...prev, 
                            withdrawal_limit: parseFloat(e.target.value) || 0 
                          } : prev)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          placeholder="0.00 (sem limite)"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Valor máximo que pode ser sacado automaticamente
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={selectedWithdrawal?.notes || ''}
                    onChange={(e) => setSelectedWithdrawal(prev => prev ? { ...prev, notes: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={3}
                    placeholder="Observações sobre o saque (opcional)"
                  />
                </div>

                {selectedWithdrawal?.id && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Status:</strong> {selectedWithdrawal.status}
                    </p>
                    <p className="text-sm text-blue-800">
                      <strong>Data de Solicitação:</strong> {selectedWithdrawal.requestDate}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      ⚠️ Apenas administradores podem alterar o status dos saques
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button 
                    type="button"
                    onClick={handleSaveWithdrawal}
                    disabled={isSavingWithdrawal}
                    className={`px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium ${
                      isSavingWithdrawal ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSavingWithdrawal ? (
                      <>
                        <svg className="animate-spin h-4 w-4 inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Salvando...
                      </>
                    ) : (
                      'Salvar Saque'
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowWithdrawalModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Check-ins Component
const OrganizerCheckIns = () => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrResult, setQrResult] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  // ✅ BUSCAR DADOS REAIS DO SUPABASE
  const fetchCheckIns = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Buscando check-ins...');
      
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ Erro ao obter usuário:', userError);
        return;
      }

      // Buscar ingressos usados dos eventos do organizador
      const { data: checkInsData, error } = await supabase
        .from('tickets')
        .select(`
          *,
          event:events!inner(title, organizer_id)
        `)
        .eq('event.organizer_id', user.id)
        .eq('status', 'used') // ✅ APENAS INGRESSOS USADOS
        .order('used_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar check-ins:', error);
        return;
      }

      console.log('✅ Check-ins encontrados:', checkInsData?.length || 0);

      // Buscar dados dos usuários separadamente
      const userIds = checkInsData?.map(t => t.user_id).filter(Boolean) || [];
      let usersData: any = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        
        usersData = profiles?.reduce((acc: any, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {}) || {};
      }

      const formattedCheckIns: CheckIn[] = checkInsData?.map(ticket => {
        const user = usersData[ticket.user_id] || {};
        return {
          id: ticket.id,
          eventId: ticket.event_id,
          participantName: user.name || 'Nome não informado',
          ticketType: ticket.ticket_type || 'Padrão',
          checkInTime: ticket.used_at ? new Date(ticket.used_at).toLocaleString('pt-BR') : 'Não informado',
          status: 'ok' as const // Todos os ingressos usados têm status ok
        };
      }) || [];

      setCheckIns(formattedCheckIns);
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar check-ins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar dados ao montar o componente
  React.useEffect(() => {
    fetchCheckIns();
  }, []);

  // ✅ VALIDAR E MARCAR INGRESSO COMO USADO
  const handleTicketValidation = async (ticketCode: string) => {
    try {
      console.log('🔄 Validando ingresso:', ticketCode);
      
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ Erro ao obter usuário:', userError);
        alert('Erro de autenticação');
        return;
      }

      // Buscar o ingresso pelo código
      const { data: ticketData, error: searchError } = await supabase
        .from('tickets')
        .select(`
          *,
          event:events!inner(title, organizer_id)
        `)
        .eq('code', ticketCode)
        .eq('event.organizer_id', user.id) // ✅ APENAS INGRESSOS DOS EVENTOS DO ORGANIZADOR
        .single();

      if (searchError || !ticketData) {
        console.error('❌ Ingresso não encontrado:', searchError);
        alert('❌ Ingresso não encontrado ou não pertence aos seus eventos');
        setQrResult(`❌ INVÁLIDO: ${ticketCode}`);
        return;
      }

      // Verificar se já foi usado
      if (ticketData.status === 'used') {
        console.log('⚠️ Ingresso já foi usado');
        alert('⚠️ Este ingresso já foi usado anteriormente');
        setQrResult(`⚠️ JÁ USADO: ${ticketCode}`);
        return;
      }

      // Verificar se está ativo
      if (ticketData.status !== 'active') {
        console.log('❌ Ingresso não está ativo');
        alert('❌ Este ingresso não está ativo');
        setQrResult(`❌ INATIVO: ${ticketCode}`);
        return;
      }

      // Marcar como usado
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: 'used',
          used_at: new Date().toISOString()
        })
        .eq('id', ticketData.id);

      if (updateError) {
        console.error('❌ Erro ao marcar como usado:', updateError);
        alert('❌ Erro ao processar check-in');
        return;
      }

      console.log('✅ Check-in realizado com sucesso');
      
      // Buscar dados do usuário se necessário
      let userName = 'Nome não informado';
      if (ticketData.user_id) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', ticketData.user_id)
          .single();
        userName = userProfile?.name || 'Nome não informado';
      }
      
      // Adicionar à lista de check-ins
      const newCheckIn: CheckIn = {
        id: ticketData.id,
        eventId: ticketData.event_id,
        participantName: userName,
        ticketType: ticketData.ticket_type || 'Padrão',
        checkInTime: new Date().toLocaleString('pt-BR'),
        status: 'ok'
      };

      setCheckIns(prev => [newCheckIn, ...prev]);
      setQrResult(`✅ CHECK-IN OK: ${userName}`);
      alert(`✅ Check-in realizado com sucesso!\nParticipante: ${userName}\nEvento: ${ticketData.event.title}`);
    } catch (error) {
      console.error('❌ Erro inesperado ao validar ingresso:', error);
      alert('Erro ao validar ingresso. Por favor, tente novamente.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Check-ins</h2>
        <button 
          onClick={() => setShowQrScanner(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Camera className="h-5 w-5" />
          Scan QR Code
        </button>
      </div>

      {/* Check-ins Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participante</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Ingresso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {checkIns.map(checkIn => (
                <tr key={checkIn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
                        <Calendar className="h-5 w-5 text-pink-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{checkIn.eventId}</div>
                        <div className="text-sm text-gray-500">{checkIn.eventId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{checkIn.participantName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{checkIn.ticketType}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{checkIn.checkInTime}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      checkIn.status === 'ok' ? 'bg-green-100 text-green-800' :
                      checkIn.status === 'duplicado' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {checkIn.status.charAt(0).toUpperCase() + checkIn.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQrScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Scan QR Code</h3>
                <button 
                  onClick={() => setShowQrScanner(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="relative w-64 h-64 mb-4">
                  {/* Add your QR code scanner component here */}
                  {/* For example, you can use a library like react-qr-reader */}
                  <div id="qr-reader"></div>
                </div>
                <input
                  type="text"
                  placeholder="Or enter code manually"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                  onClick={() => handleTicketValidation(manualCode)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Validate Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Placeholder OrganizerSettings component to avoid runtime errors
const OrganizerSettings = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    notifications: true
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      alert('Configurações salvas!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-xl border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input type="text" name="phone" value={form.phone} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500" />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input type="checkbox" name="notifications" checked={form.notifications} onChange={handleChange} id="notifications" className="h-4 w-4 text-pink-600 border-gray-300 rounded" />
            <label htmlFor="notifications" className="text-sm text-gray-700">Receber notificações por e-mail</label>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500" />
          </div>
        </div>
        <LoadingButton 
          type="submit" 
          isLoading={isSaving}
          loadingText="Salvando..."
          variant="primary"
          size="md"
          className="font-semibold"
        >
          Salvar Alterações
        </LoadingButton>
      </form>
    </div>
  );
};

// Main OrganizerDashboardPage component
const OrganizerDashboardPage = () => {
  const [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSetActive = (v: string) => {
    setActive(v);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between p-3 bg-white shadow-sm sticky top-0 z-30">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200 transition-colors">
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="text-base font-bold text-gray-900 truncate">Painel do Organizador</h2>
        <div className="w-10"></div> {/* Spacer para centralizar o título */}
      </div>

      {/* Sidebar */}
      <div>
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setSidebarOpen(false)}></div>
        )}
        <aside className={`bg-white shadow-md rounded-lg p-2 md:p-4 w-64 md:w-64 mb-4 md:mb-0 md:sticky md:top-6 z-50 transition-transform duration-200 fixed md:static top-0 left-0 h-full md:h-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`} style={{maxWidth: '90vw'}}>
          <nav className="flex flex-col gap-2 w-full">
            <button onClick={() => handleSetActive('dashboard')} className={`w-full flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 rounded text-sm md:text-base ${active==='dashboard'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>
              <span className="hidden md:inline">Dashboard</span>
              <span className="md:hidden">Dash</span>
            </button>
            <button onClick={() => handleSetActive('events')} className={`w-full flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 rounded text-sm md:text-base ${active==='events'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Eventos</button>
            <button onClick={() => handleSetActive('sales')} className={`w-full flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 rounded text-sm md:text-base ${active==='sales'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Vendas</button>
            <button onClick={() => handleSetActive('finance')} className={`w-full flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 rounded text-sm md:text-base ${active==='finance'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Financeiro</button>
            <button onClick={() => navigate('/checkin')} className={`w-full flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 rounded text-sm md:text-base hover:bg-pink-50 text-gray-700`}>Check-in</button>
            <button onClick={() => handleSetActive('settings')} className={`w-full flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 rounded text-sm md:text-base ${active==='settings'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Config</button>
          </nav>
        </aside>
      </div>

      {/* Main content */}
      <main className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8 w-full min-w-0">
        {active === 'dashboard' && <DashboardOverview />}
        {active === 'events' && <OrganizerEvents />}
        {active === 'sales' && <OrganizerSales />}
        {active === 'finance' && <OrganizerFinancial />}
        {active === 'settings' && <OrganizerSettings />}
      </main>
    </div>
  );
};

export default OrganizerDashboardPage;