import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar, BarChart3, CreditCard, PlusCircle, AlertCircle, DollarSign, Users, Edit3, Share2, X, Download, Clock, CheckCircle, XCircle, Trash2, Send, Menu, Camera, Loader2
} from 'lucide-react';
import EventFormModal from '../components/EventFormModal';
import QrScanner from '../components/QrScanner';
import { supabase } from '../lib/supabase';

// Interfaces
interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  description: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  ticketsSold: number;
  totalTickets: number;
  revenue: number;
  category: string;
  price: number; // ✅ ADICIONADO CAMPO DE PREÇO
  image?: string;
}

interface Sale {
  id: string;
  eventId: string;
  eventName: string;
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
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTicketsSold: 0,
    activeEvents: 0,
    pendingSales: 0
  });
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Erro ao obter usuário:', userError);
        return;
      }

      // Buscar apenas eventos do organizador atual
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id) // ✅ APENAS EVENTOS DO ORGANIZADOR
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Buscar transações (vendas) apenas dos eventos do organizador
      const { data: sales, error: salesError } = await supabase
        .from('transactions')
        .select(`
          *,
          event:events!inner(organizer_id)
        `)
        .eq('event.organizer_id', user.id) // ✅ APENAS VENDAS DOS EVENTOS DO ORGANIZADOR
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Calcular estatísticas
      const activeEventsCount = events?.filter(event => event.status === 'approved').length || 0;
      const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0;
      const totalTicketsSold = sales?.filter(sale => sale.status === 'completed').length || 0;
      const pendingSales = sales?.filter(sale => sale.status === 'pending').length || 0;

      setStats({
        totalRevenue,
        totalTicketsSold,
        activeEvents: activeEventsCount,
        pendingSales
      });

      setRecentEvents(events?.slice(0, 3) || []);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando dados do dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Receita Total</p>
              <p className="text-2xl font-bold">R$ {stats.totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Ingressos Vendidos</p>
              <p className="text-2xl font-bold">{stats.totalTicketsSold.toLocaleString()}</p>
            </div>
            <Users className="h-8 w-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Eventos Ativos</p>
              <p className="text-2xl font-bold">{stats.activeEvents}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Vendas Pendentes</p>
              <p className="text-2xl font-bold">{stats.pendingSales}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Eventos Recentes</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentEvents.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Nenhum evento encontrado</p>
              </div>
            ) : (
              recentEvents.map(event => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-pink-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{event.name}</h4>
                      <p className="text-sm text-gray-600">{event.date} • {event.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.status === 'ativo' ? 'bg-green-100 text-green-800' :
                      event.status === 'adiado' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Events Component
const OrganizerEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('pending');
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
          *,
          tickets:tickets(count),
          transactions:transactions(sum:amount)
        `)
        .eq('organizer_id', user.id) // ✅ APENAS EVENTOS DO ORGANIZADOR
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedEvents: Event[] = (eventsData as any[])?.map(event => ({
        id: event.id,
        name: event.title,
        date: new Date(event.start_date).toISOString().split('T')[0],
        time: new Date(event.start_date).toTimeString().split(':').slice(0,2).join(':'),
        location: event.location,
        description: event.description,
        status: event.status,
        ticketsSold: event.tickets?.count || 0,
        totalTickets: event.total_tickets || 0,
        revenue: event.transactions?.sum || 0,
        category: event.category,
        price: event.price || 0, // ✅ INCLUIR PREÇO DO EVENTO
        image: event.banner_url
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitEvent = async (eventData: Event) => {
    try {
      if (selectedEvent) {
        // Edição
        const { error } = await supabase
          .from('events')
          .update({
            title: eventData.name,
            start_date: `${eventData.date}T${eventData.time}:00`,
            end_date: `${eventData.date}T${eventData.time}:00`,
            location: eventData.location,
            description: eventData.description,
            status: eventData.status,
            category: eventData.category,
            banner_url: eventData.image,
            price: eventData.price || 0, // ✅ SALVAR PREÇO DO EVENTO
            available_tickets: eventData.totalTickets,
            total_tickets: eventData.totalTickets
          })
          .eq('id', eventData.id);

        if (error) throw error;
      } else {
        // Criação
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('events')
          .insert({
            title: eventData.name,
            start_date: `${eventData.date}T${eventData.time}:00`,
            end_date: `${eventData.date}T${eventData.time}:00`,
            location: eventData.location,
            description: eventData.description,
            status: 'pending', // Criar eventos pendentes de aprovação
            category: eventData.category,
            banner_url: eventData.image,
            organizer_id: userData.user?.id || '',
            price: eventData.price || 0, // ✅ SALVAR PREÇO DO EVENTO
            available_tickets: eventData.totalTickets,
            total_tickets: eventData.totalTickets,
            tags: []
          });

        if (error) throw error;
      }

      await fetchEvents();
      setSelectedEvent(undefined);
      setShowEventFormModal(false);
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
    }
  };

  const filteredEvents = events.filter(event =>
    (filter === 'todos' || event.status === filter) &&
    event.name.toLowerCase().includes(search.toLowerCase())
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
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
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
        onClose={() => setShowEventFormModal(false)}
        event={selectedEvent}
        onSubmit={handleSubmitEvent}
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
              {event.image ? (
                <img 
                  src={event.image} 
                  alt={event.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="font-semibold text-lg line-clamp-1">{event.name}</h3>
                <p className="text-sm opacity-90">{event.date} • {event.time}</p>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="line-clamp-1">{event.location}</span>
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
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-600">Receita: </span>
                    <span className="font-semibold text-green-600">R$ {event.revenue.toLocaleString()}</span>
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
  
  // 🎫 Estados para atribuição de usuário ao ingresso
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Sale | null>(null);
  const [userEmail, setUserEmail] = useState('');

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
        name: event.title,
        date: new Date(event.start_date).toISOString().split('T')[0],
        time: new Date(event.start_date).toTimeString().split(':').slice(0,2).join(':'),
        location: event.location,
        description: event.description,
        status: event.status,
        ticketsSold: 0,
        totalTickets: event.total_tickets || 0,
        revenue: 0,
        category: event.category,
        price: event.price || 0, // ✅ INCLUIR PREÇO DO EVENTO
        image: event.banner_url
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

      // Buscar ingressos com dados completos do comprador e usuário
      const { data: ticketsData, error } = await supabase
        .from('tickets')
        .select(`
          *,
          event:events!inner(title, organizer_id, price)
        `)
        .eq('event.organizer_id', user.id) // ✅ APENAS INGRESSOS DOS EVENTOS DO ORGANIZADOR
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar ingressos:', error);
        // Fallback para buscar apenas transações se tickets não existir
        return await fetchTransactionsOnly(user.id);
      }

      console.log('✅ Ingressos encontrados:', ticketsData?.length || 0);

      // Buscar dados dos usuários separadamente para evitar problemas de FK
      const userIds = [...new Set([
        ...ticketsData?.map(t => t.buyer_id).filter(Boolean) || [],
        ...ticketsData?.map(t => t.user_id).filter(Boolean) || []
      ])];

      let usersData = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);
        
        usersData = profiles?.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {}) || {};
      }

      const formattedSales: Sale[] = ticketsData?.map(ticket => {
        const buyer = usersData[ticket.buyer_id] || {};
        const ticketUser = usersData[ticket.user_id] || buyer;
        
        return {
          id: ticket.id,
          eventId: ticket.event_id,
          eventName: ticket.event.title,
          buyerName: buyer.name || 'Nome não informado',
          buyerEmail: buyer.email || 'Email não informado',
          userName: ticketUser.name || 'Usuário não informado', // ✅ PESSOA QUE USA O INGRESSO
          userEmail: ticketUser.email || 'Email não informado',
          ticketType: ticket.ticket_type || 'Padrão',
          ticketCode: ticket.code || 'N/A', // ✅ CÓDIGO DO INGRESSO
          quantity: 1,
          amount: ticket.event.price || 0,
          date: new Date(ticket.created_at).toLocaleDateString('pt-BR'),
          status: ticket.status === 'active' ? 'confirmado' : ticket.status === 'used' ? 'usado' : ticket.status === 'cancelled' ? 'cancelado' : 'pendente',
          paymentMethod: 'Não informado',
          isUsed: ticket.status === 'used', // ✅ STATUS DE USO DO INGRESSO
          usedAt: ticket.used_at ? new Date(ticket.used_at).toLocaleString('pt-BR') : null
        };
      }) || [];

      setSales(formattedSales);
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar vendas:', error);
    }
  };

  // Fallback para buscar apenas transações se tabela tickets não existir
  const fetchTransactionsOnly = async (userId: string) => {
    try {
      console.log('🔄 Fallback: Buscando apenas transações...');
      
      const { data: salesData, error } = await supabase
        .from('transactions')
        .select(`
          *,
          event:events!inner(title, organizer_id, price),
          buyer:profiles!transactions_user_id_fkey(name, email)
        `)
        .eq('event.organizer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSales: Sale[] = salesData?.map(sale => ({
        id: sale.id,
        eventId: sale.event_id,
        eventName: sale.event.title,
        buyerName: sale.buyer?.name || 'Nome não informado',
        buyerEmail: sale.buyer?.email || 'Email não informado',
        userName: sale.buyer?.name || 'Usuário não informado', // Mesmo que comprador
        userEmail: sale.buyer?.email || 'Email não informado',
        ticketType: 'Padrão',
        ticketCode: 'N/A', // Não disponível em transações
        quantity: 1,
        amount: sale.amount,
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

  const updateSaleStatus = async (saleId: string, newStatus: 'confirmado' | 'cancelado') => {
    try {
      const dbStatus = newStatus === 'confirmado' ? 'completed' : newStatus === 'cancelado' ? 'failed' : 'pending';
      const { error } = await supabase
        .from('transactions')
        .update({ status: dbStatus })
        .eq('id', saleId);

      if (error) throw error;

      setSales(prev => prev.map(sale => 
        sale.id === saleId ? { ...sale, status: newStatus } : sale
      ));
    } catch (error) {
      console.error('Erro ao atualizar status da venda:', error);
    }
  };

  // 🎫 Função para abrir modal de atribuição de usuário
  const handleAssignUser = (ticket: Sale) => {
    setSelectedTicket(ticket);
    setUserEmail('');
    setShowUserModal(true);
  };

  // 🎫 Função para confirmar ingresso e atribuir usuário
  const handleConfirmTicket = async () => {
    if (!selectedTicket || !userEmail.trim()) {
      alert('Por favor, insira um email válido para o usuário.');
      return;
    }

    try {
      console.log('🎫 Confirmando ingresso e atribuindo usuário...');

      // 1. Buscar o usuário pelo email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail.trim())
        .single();

      if (userError) {
        console.error('❌ Usuário não encontrado:', userError);
        alert('Usuário não encontrado. Verifique se o email está correto e se o usuário possui cadastro na plataforma.');
        return;
      }

      // 2. Atualizar o ingresso com o usuário e status ativo
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ 
          user_id: userData.id,
          status: 'active'
        })
        .eq('id', selectedTicket.id);

      if (ticketError) {
        console.error('❌ Erro ao atualizar ingresso:', ticketError);
        alert('Erro ao confirmar ingresso. Tente novamente.');
        return;
      }

      // 3. Atualizar a transação relacionada
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', selectedTicket.id);

      if (transactionError) {
        console.warn('⚠️ Aviso: Ingresso confirmado mas transação não atualizada:', transactionError);
      }

      console.log('✅ Ingresso confirmado com sucesso!');

      // 4. Atualizar estado local
      setSales(prev => prev.map(sale => 
        sale.id === selectedTicket.id 
          ? { 
              ...sale, 
              status: 'confirmado',
              userName: userEmail, // Temporário até recarregar dados
              userEmail: userEmail
            } 
          : sale
      ));

      // 5. Fechar modal e recarregar dados
      setShowUserModal(false);
      setSelectedTicket(null);
      setUserEmail('');
      
      // Recarregar vendas para obter dados atualizados
      await fetchSales();

      alert(`✅ Ingresso confirmado com sucesso!\nUsuário: ${userEmail}\nCódigo: ${selectedTicket.ticketCode}`);

    } catch (error) {
      console.error('❌ Erro inesperado ao confirmar ingresso:', error);
      alert('Erro inesperado ao confirmar ingresso. Tente novamente.');
    }
  };

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
      doc.text(`Evento: ${selectedEvent?.name || 'Todos os Eventos'}`, margin, currentY);
      
      if (selectedEvent) {
        currentY += 10;
        doc.text(`Data: ${new Date(selectedEvent.date).toLocaleDateString('pt-BR')}`, margin, currentY);
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
              <option key={event.id} value={event.id}>{event.name}</option>
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
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
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
                            onClick={() => handleAssignUser(sale)}
                            className="text-green-600 hover:text-green-700 flex items-center gap-1 px-2 py-1 text-xs bg-green-50 rounded"
                            title="Atribuir usuário e confirmar"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Confirmar
                          </button>
                          <button 
                            onClick={() => updateSaleStatus(sale.id, 'cancelado')}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🎫 Modal para Atribuir Usuário ao Ingresso */}
      {showUserModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                🎫 Confirmar Ingresso
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Informações do Ingresso */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Detalhes do Ingresso:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Evento:</strong> {selectedTicket.eventName}</p>
                  <p><strong>Comprador:</strong> {selectedTicket.buyerName}</p>
                  <p><strong>Código:</strong> <span className="font-mono bg-gray-200 px-1 rounded">{selectedTicket.ticketCode}</span></p>
                  <p><strong>Valor:</strong> R$ {selectedTicket.amount.toLocaleString()}</p>
                </div>
              </div>

              {/* Campo de Email do Usuário */}
              <div>
                <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email do usuário que vai usar o ingresso:
                </label>
                <input
                  id="userEmail"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  O usuário deve estar cadastrado na plataforma
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmTicket}
                  disabled={!userEmail.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  ✅ Confirmar Ingresso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
    } catch (error) {
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
        
        // Não incluir o campo id para deixar o PostgreSQL gerar automaticamente
        const insertData = {
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
      
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
            <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
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
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
                  >
                    Salvar Conta
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAccountModal(false)}
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

// Withdrawals Component
// Seção de Saques
const WithdrawalsSection = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);

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
        requestDate: 'Não informado', // Temporário até termos a coluna created_at
        processedDate: withdrawal.processed_at ? new Date(withdrawal.processed_at).toLocaleDateString('pt-BR') : undefined,
        status: withdrawal.status,
        bankAccount: withdrawal.bank_account?.bank_name + ' - ' + withdrawal.bank_account?.account_number || 'N/A'
      })) || [];

      setWithdrawals(formattedWithdrawals);
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
    setSelectedWithdrawal({ id: '', amount: 0, requestDate: '', status: 'pendente', bankAccount: '' });
    setShowWithdrawalModal(true);
  };

  const handleEditWithdrawal = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowWithdrawalModal(true);
  };

  const handleDeleteWithdrawal = (withdrawalId: string) => {
    setWithdrawals(prev => prev.filter(withdrawal => withdrawal.id !== withdrawalId));
  };

  const handleProcessWithdrawal = (withdrawalId: string) => {
    setWithdrawals(prev => prev.map(withdrawal => 
      withdrawal.id === withdrawalId ? { ...withdrawal, status: 'processando' } : withdrawal
    ));
  };

  const handleCompleteWithdrawal = (withdrawalId: string) => {
    setWithdrawals(prev => prev.map(withdrawal => 
      withdrawal.id === withdrawalId ? { ...withdrawal, status: 'concluido' } : withdrawal
    ));
  };

  const handleRejectWithdrawal = (withdrawalId: string) => {
    setWithdrawals(prev => prev.map(withdrawal => 
      withdrawal.id === withdrawalId ? { ...withdrawal, status: 'rejeitado' } : withdrawal
    ));
  };

  const handleExportSalesReport = () => {
    // Cabeçalho do CSV
    const headers = [
      'ID da Venda',
      'Evento',
      'Comprador',
      'Email',
      'Tipo de Ingresso',
      'Quantidade',
      'Valor Total',
      'Data',
      'Status',
      'Forma de Pagamento'
    ].join(',');

    // Converter cada venda em uma linha do CSV
    const rows = sales.filter(sale => {
      const matchesFilter = filter === 'todos' || sale.status === filter;
      const matchesDate = !dateRange.start || !dateRange.end || 
        (sale.date >= dateRange.start && sale.date <= dateRange.end);
      return matchesFilter && matchesDate;
    }).map(sale => [
      sale.id,
      sale.eventName,
      sale.buyerName,
      sale.buyerEmail,
      sale.ticketType,
      sale.quantity,
      sale.amount.toFixed(2).replace('.', ','),
      sale.date,
      sale.status.charAt(0).toUpperCase() + sale.status.slice(1),
      sale.paymentMethod
    ].join(','));

    // Juntar cabeçalho e linhas
    const csvContent = [headers, ...rows].join('\\n');

    // Criar blob e link para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Configurar e simular clique no link
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_vendas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex gap-2">
                      {withdrawal.status === 'pendente' && (
                        <>
                          <button 
                            onClick={() => handleProcessWithdrawal(withdrawal.id)}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleRejectWithdrawal(withdrawal.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {withdrawal.status === 'processando' && (
                        <>
                          <button 
                            onClick={() => handleCompleteWithdrawal(withdrawal.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleRejectWithdrawal(withdrawal.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleEditWithdrawal(withdrawal)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteWithdrawal(withdrawal.id)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                  <input
                    type="number"
                    value={selectedWithdrawal?.amount || ''}
                    onChange={(e) => setSelectedWithdrawal(prev => prev ? { ...prev, amount: parseFloat(e.target.value) } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Solicitação</label>
                  <input
                    type="date"
                    value={selectedWithdrawal?.requestDate || ''}
                    onChange={(e) => setSelectedWithdrawal(prev => prev ? { ...prev, requestDate: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedWithdrawal?.status || 'pendente'}
                    onChange={(e) => setSelectedWithdrawal(prev => prev ? { ...prev, status: e.target.value as 'pendente' | 'processando' | 'concluido' | 'rejeitado' } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="processando">Processando</option>
                    <option value="concluido">Concluído</option>
                    <option value="rejeitado">Rejeitado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conta Bancária</label>
                  <select
                    value={selectedWithdrawal?.bankAccount || ''}
                    onChange={(e) => setSelectedWithdrawal(prev => prev ? { ...prev, bankAccount: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    {/* Assuming bankAccounts state is available in this scope or passed as prop */}
                    {/* For now, we'll just show a placeholder */}
                    <option value="">Selecione uma conta</option>
                    <option value="1">Banco do Brasil (Agência: 0001, Conta: 12345-6)</option>
                    <option value="2">Bradesco (Agência: 0002, Conta: 67890-1)</option>
                    <option value="3">Itaú (Agência: 0003, Conta: 11223-4)</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => {
                      if (selectedWithdrawal) {
                        setWithdrawals(prev => prev.map(withdrawal => 
                          withdrawal.id === selectedWithdrawal.id ? selectedWithdrawal : withdrawal
                        ));
                      } else {
                        const newId = Math.max(...withdrawals.map(w => parseInt(w.id))) + 1;
                        setWithdrawals(prev => [...prev, { ...selectedWithdrawal!, id: newId.toString() }]);
                      }
                      setShowWithdrawalModal(false);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Salvar Saque
                  </button>
                  <button 
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
      let usersData = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        
        usersData = profiles?.reduce((acc, profile) => {
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
      console.error('❌ Erro inesperado na validação:', error);
      alert('❌ Erro inesperado ao validar ingresso');
    }
  };

  const handleQRCodeScan = (data: string | null) => {
    if (data) {
      handleTicketValidation(data);
      setManualCode('');
      setShowQrScanner(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleTicketValidation(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Check-ins</h2>
        <button
          type="button"
          onClick={() => setShowQrScanner(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Camera className="h-5 w-5" />
          Scanner QR Code
        </button>
      </div>
      {qrResult && (
        <div className="mt-2 text-green-700 font-semibold">QR Code lido: {qrResult}</div>
      )}
      {showQrScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg relative w-full max-w-lg">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Scanner QR Code</h3>
              <button
                onClick={() => setShowQrScanner(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4">
              <div className="aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-lg">
                <QrScanner
                  onResult={result => {
                    handleQRCodeScan(result);
                  }}
                />
              </div>
              <p className="text-sm text-gray-600 text-center mt-4">
                Posicione o QR Code no centro da câmera para fazer o check-in
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Input manual para check-in */}
            <form onSubmit={handleManualSubmit} className="w-full flex flex-col items-center mb-2">
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Digite o código manualmente"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium w-full"
              >
                Registrar Check-in Manual
              </button>
            </form>
      {/* Tabela de check-ins */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participante</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Ingresso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {checkIns.map(checkIn => (
                <tr key={checkIn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                        <Calendar className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{checkIn.eventId}</div>
                        <div className="text-sm text-gray-500">Evento: {checkIn.eventId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{checkIn.participantName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{checkIn.ticketType}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{checkIn.checkInTime}</td>
                  <td className="px-6 py-4">
                    <span className={`
                      ${checkIn.status === 'ok' ? 'bg-green-100 text-green-800' : ''}
                      ${checkIn.status === 'duplicado' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${checkIn.status === 'invalido' ? 'bg-red-100 text-red-800' : ''}
                      px-3 py-1 rounded-full text-xs font-medium`
                    }>
                      {checkIn.status.charAt(0).toUpperCase() + checkIn.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Configurações do Organizador
const OrganizerSettings = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    notifications: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // ✅ BUSCAR DADOS REAIS DO ORGANIZADOR
  const fetchOrganizerData = async () => {
    try {
      setIsLoading(true);
      
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Erro ao obter usuário:', userError);
        return;
      }

      // Buscar dados do perfil do organizador
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar dados do organizador:', error);
        return;
      }

      // Preencher formulário com dados reais
      setForm(prev => ({
        ...prev,
        name: profileData.name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        // Não preencher senhas por segurança
        password: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Erro inesperado ao buscar dados do organizador:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar dados ao montar o componente
  React.useEffect(() => {
    fetchOrganizerData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    
    if (form.password && form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('Erro ao obter dados do usuário');
        return;
      }

      // Atualizar dados do perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: form.name,
          phone: form.phone
          // Email não é atualizado aqui por questões de segurança
        })
        .eq('id', user.id);

      if (profileError) {
        setError('Erro ao salvar configurações: ' + profileError.message);
        return;
      }

      // Se há nova senha, atualizar no Auth
      if (form.password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: form.password
        });

        if (passwordError) {
          setError('Erro ao atualizar senha: ' + passwordError.message);
          return;
        }
      }

      setSuccess('Configurações salvas com sucesso!');
      setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setError('Erro inesperado ao salvar configurações');
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações da Conta</h2>
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded">{success}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
          <span className="ml-2 text-gray-600">Carregando dados...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input type="text" name="phone" value={form.phone} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500" />
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
        <div className="flex items-center gap-2">
          <input type="checkbox" name="notifications" checked={form.notifications} onChange={handleChange} id="notifications" className="h-4 w-4 text-pink-600 border-gray-300 rounded" />
          <label htmlFor="notifications" className="text-sm text-gray-700">Receber notificações por e-mail</label>
        </div>
        <button type="submit" className="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors">Salvar Alterações</button>
      </form>
      )}
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
        {active === 'finance' && <OrganizerFinancial />}
        {active === 'checkin' && <OrganizerCheckIns />}
        {active === 'settings' && <OrganizerSettings />}
      </main>
    </div>
  );
};

export default OrganizerDashboardPage;