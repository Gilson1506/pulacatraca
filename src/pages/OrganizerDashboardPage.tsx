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
  status: 'ativo' | 'adiado' | 'cancelado';
  ticketsSold: number;
  totalTickets: number;
  revenue: number;
  category: string;
  image?: string;
}

interface Sale {
  id: string;
  eventId: string;
  eventName: string;
  buyerName: string;
  buyerEmail: string;
  ticketType: string;
  quantity: number;
  amount: number;
  date: string;
  status: 'pendente' | 'confirmado' | 'cancelado';
  paymentMethod: string;
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

interface SupabaseEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  status: string;
  category: string;
  image_url?: string;
  total_tickets: number;
  tickets?: { count: number };
  sales?: { sum: number };
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

      // Buscar eventos
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Buscar vendas
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Calcular estatísticas
      const activeEventsCount = events?.filter(event => event.status === 'active').length || 0;
      const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0;
      const totalTicketsSold = sales?.filter(sale => sale.status === 'confirmed').length || 0;
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
  const [filter, setFilter] = useState<'todos' | 'ativo' | 'adiado' | 'cancelado'>('todos');
  const [search, setSearch] = useState('');
  const [showEventFormModal, setShowEventFormModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          *,
          tickets:tickets(count),
          sales:sales(sum:amount)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedEvents: Event[] = (eventsData as SupabaseEvent[])?.map(event => ({
        id: event.id,
        name: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        description: event.description,
        status: event.status as 'ativo' | 'adiado' | 'cancelado',
        ticketsSold: event.tickets?.count || 0,
        totalTickets: event.total_tickets || 0,
        revenue: event.sales?.sum || 0,
        category: event.category,
        image: event.image_url
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
            date: eventData.date,
            time: eventData.time,
            location: eventData.location,
            description: eventData.description,
            status: eventData.status,
            category: eventData.category,
            image_url: eventData.image
          })
          .eq('id', eventData.id);

        if (error) throw error;
      } else {
        // Criação
        const { error } = await supabase
          .from('events')
          .insert({
            title: eventData.name,
            date: eventData.date,
            time: eventData.time,
            location: eventData.location,
            description: eventData.description,
            status: eventData.status,
            category: eventData.category,
            image_url: eventData.image,
            total_tickets: eventData.totalTickets
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
      case 'ativo': return 'bg-green-100 text-green-800 border-green-200';
      case 'adiado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200';
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
            <option value="ativo">Ativos</option>
            <option value="adiado">Adiados</option>
            <option value="cancelado">Cancelados</option>
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
              
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm">
                  <span className="text-gray-600">Vendidos: </span>
                  <span className="font-semibold">{event.ticketsSold}/{event.totalTickets}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Receita: </span>
                  <span className="font-semibold text-green-600">R$ {event.revenue.toLocaleString()}</span>
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

  useEffect(() => {
    fetchSales();
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedEvents: Event[] = (eventsData as SupabaseEvent[])?.map(event => ({
        id: event.id,
        name: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        description: event.description,
        status: event.status as 'ativo' | 'adiado' | 'cancelado',
        ticketsSold: 0,
        totalTickets: event.total_tickets || 0,
        revenue: 0,
        category: event.category,
        image: event.image_url
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
    }
  };

  const fetchSales = async () => {
    try {
      const { data: salesData, error } = await supabase
        .from('sales')
        .select(`
          *,
          event:events(title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSales: Sale[] = salesData.map(sale => ({
        id: sale.id,
        eventId: sale.event_id,
        eventName: sale.event.title,
        buyerName: sale.buyer_name,
        buyerEmail: sale.buyer_email,
        ticketType: sale.ticket_type,
        quantity: sale.quantity,
        amount: sale.amount,
        date: sale.created_at,
        status: sale.status,
        paymentMethod: sale.payment_method
      }));

      setSales(formattedSales);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
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
      const { error } = await supabase
        .from('sales')
        .update({ status: newStatus })
        .eq('id', saleId);

      if (error) throw error;

      setSales(prev => prev.map(sale => 
        sale.id === saleId ? { ...sale, status: newStatus } : sale
      ));
    } catch (error) {
      console.error('Erro ao atualizar status da venda:', error);
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
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
                        <div className="text-sm text-gray-500">Comprador: {sale.buyerName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <p>Comprador: {sale.buyerName}</p>
                    <p>Email: {sale.buyerEmail}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sale.status === 'pendente' ? 'bg-orange-100 text-orange-800' :
                      sale.status === 'confirmado' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{sale.quantity}</td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">R$ {sale.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{sale.date}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex gap-2">
                      {sale.status === 'pendente' && (
                        <>
                          <button 
                            onClick={() => updateSaleStatus(sale.id, 'confirmado')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => updateSaleStatus(sale.id, 'cancelado')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button className="text-gray-600 hover:text-gray-700">
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
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

// Bank Accounts Component
const OrganizerBankAccounts = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    { id: '1', bank: 'Banco do Brasil', agency: '0001', account: '12345-6', type: 'corrente', isDefault: true },
    { id: '2', bank: 'Bradesco', agency: '0002', account: '67890-1', type: 'poupanca', isDefault: false },
    { id: '3', bank: 'Itaú', agency: '0003', account: '11223-4', type: 'corrente', isDefault: false }
  ]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  const handleAddAccount = () => {
    setSelectedAccount({ id: '', bank: '', agency: '', account: '', type: 'corrente', isDefault: false });
    setShowAccountModal(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setSelectedAccount(account);
    setShowAccountModal(true);
  };

  const handleDeleteAccount = (accountId: string) => {
    setBankAccounts(prev => prev.filter(account => account.id !== accountId));
  };

  const handleSetDefault = (accountId: string) => {
    setBankAccounts(prev => prev.map(account => 
      account.id === accountId ? { ...account, isDefault: true } : { ...account, isDefault: false }
    ));
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
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                  <input
                    type="text"
                    value={selectedAccount?.bank || ''}
                    onChange={(e) => setSelectedAccount(prev => prev ? { ...prev, bank: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
                  <input
                    type="text"
                    value={selectedAccount?.agency || ''}
                    onChange={(e) => setSelectedAccount(prev => prev ? { ...prev, agency: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
                  <input
                    type="text"
                    value={selectedAccount?.account || ''}
                    onChange={(e) => setSelectedAccount(prev => prev ? { ...prev, account: e.target.value } : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                    onClick={() => {
                      if (selectedAccount) {
                        setBankAccounts(prev => prev.map(account => 
                          account.id === selectedAccount.id ? selectedAccount : account
                        ));
                      } else {
                        const newId = Math.max(...bankAccounts.map(acc => parseInt(acc.id))) + 1;
                        setBankAccounts(prev => [...prev, { ...selectedAccount!, id: newId.toString() }]);
                      }
                      setShowAccountModal(false);
                    }}
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
                  >
                    Salvar Conta
                  </button>
                  <button 
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
const OrganizerWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([
    { id: '1', amount: 1500.00, requestDate: '2025-07-25', processedDate: '2025-07-26', status: 'concluido', bankAccount: '1' },
    { id: '2', amount: 200.00, requestDate: '2025-07-27', processedDate: '2025-07-28', status: 'processando', bankAccount: '2' },
    { id: '3', amount: 500.00, requestDate: '2025-07-29', status: 'pendente', bankAccount: '3' }
  ]);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);

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
  const [checkIns, setCheckIns] = useState<CheckIn[]>([
    { id: '1', eventId: '1', participantName: 'João Silva', ticketType: 'Pista', checkInTime: '2025-07-25T10:00:00', status: 'ok' },
    { id: '2', eventId: '1', participantName: 'Maria Santos', ticketType: 'VIP', checkInTime: '2025-07-25T10:05:00', status: 'ok' },
    { id: '3', eventId: '2', participantName: 'Pedro Oliveira', ticketType: 'Pista', checkInTime: '2025-07-25T11:00:00', status: 'duplicado' },
    { id: '4', eventId: '3', participantName: 'Ana Costa', ticketType: 'Pista', checkInTime: '2025-07-25T12:00:00', status: 'invalido' }
  ]);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrResult, setQrResult] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const handleQRCodeScan = (data: string | null) => {
    if (data) {
      // Simular validação do QR code
      const alreadyChecked = checkIns.some(c => c.id === data);
      const status: 'ok' | 'duplicado' | 'invalido' = alreadyChecked ? 'duplicado' : 'ok';
      const newCheckIn: CheckIn = {
        id: data,
        eventId: '1', // Simulação: associar ao primeiro evento
        participantName: 'Participante QR',
        ticketType: 'Pista',
        checkInTime: new Date().toISOString(),
        status
      };
      setCheckIns(prev => [newCheckIn, ...prev]);
      setManualCode('');
      setQrResult(data);
      setShowQrScanner(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleQRCodeScan(manualCode.trim());
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
    name: 'Organizador Exemplo',
    email: 'organizador@email.com',
    phone: '(62) 99999-9999',
    password: '',
    confirmPassword: '',
    notifications: true
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    if (form.password && form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setSuccess('Configurações salvas com sucesso!');
    setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações da Conta</h2>
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded">{success}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}
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
            <button onClick={() => handleSetActive('withdrawals')} className={`w-full flex items-center gap-2 px-4 py-2 rounded ${active==='withdrawals'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Saques</button>
            <button onClick={() => handleSetActive('checkin')} className={`w-full flex items-center gap-2 px-4 py-2 rounded ${active==='checkin'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Check-in</button>
            <button onClick={() => handleSetActive('settings')} className={`w-full flex items-center gap-2 px-4 py-2 rounded ${active==='settings'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Configurações</button>
    </nav>
  </aside>
      </div>
      <main className="flex-1 p-2 sm:p-4 md:p-8 w-full">
        {active === 'dashboard' && <DashboardOverview />}
        {active === 'events' && <OrganizerEvents />}
        {active === 'sales' && <OrganizerSales />}
        {active === 'finance' && <OrganizerBankAccounts />}
        {active === 'withdrawals' && <OrganizerWithdrawals />}
        {active === 'checkin' && <OrganizerCheckIns />}
        {active === 'settings' && <OrganizerSettings />}
      </main>
    </div>
  );
};

export default OrganizerDashboardPage;