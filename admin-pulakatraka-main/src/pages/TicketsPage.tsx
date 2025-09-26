import React, { useState, useEffect } from 'react';
import { Search, Download, Eye, RefreshCw, Calendar, MapPin, User, Ticket, QrCode, Mail, Phone, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TicketSale {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_location: string;
  event_price: number;
  event_status: string;
  organizer_name: string;
  organizer_email: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  ticket_type: string;
  price: number;
  quantity: number;
  total_amount: number;
  status: 'active' | 'used' | 'cancelled' | 'expired' | 'pending';
  purchase_date: string;
  payment_method: string;
  qr_code: string;
  is_used: boolean;
  used_at?: string;
  assigned_user_name?: string;
  assigned_user_email?: string;
  assigned_user_phone?: string;
  buyer_id: string;
  user_id: string;
}

// Extend jsPDF with the autoTable method
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'used' | 'pending' | 'cancelled' | 'expired'>('all');
  const [filterEvent, setFilterEvent] = useState('all');
  const [filterOrganizer, setFilterOrganizer] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Buscando dados de vendas com múltiplas fontes (mesma lógica do financeiro)...');

      let allTickets: TicketSale[] = [];

      // 1. Buscar eventos para obter dados de vendas reais (mesma lógica do financeiro)
      console.log('🔍 Buscando eventos...');
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          location,
          price,
          status,
          organizer_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (eventsError) {
        console.log('⚠️ Erro ao buscar eventos:', eventsError);
      } else {
        console.log('✅ Eventos encontrados:', events?.length || 0);
      }

      // 2. Buscar tickets para calcular vendas reais (mesma lógica do financeiro)
      console.log('🔍 Buscando tickets...');
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          event_id,
          buyer_id,
          user_id,
          status,
          created_at,
          used_at,
          ticket_type,
          price,
          assigned_user_name,
          assigned_user_email,
          assigned_user_phone,
          code,
          qr_code
        `)
        .order('created_at', { ascending: false });

      if (ticketsError) {
        console.log('⚠️ Erro ao buscar tickets:', ticketsError);
      } else {
        console.log('✅ Tickets encontrados:', tickets?.length || 0);
      }

      // 3. Buscar perfis dos usuários (mesma lógica do financeiro)
      const userIds = [...new Set([
        ...(tickets?.map(t => t.buyer_id).filter(Boolean) || []),
        ...(tickets?.map(t => t.user_id).filter(Boolean) || [])
      ])];

      let profiles: Record<string, any> = {};
      if (userIds.length > 0) {
        console.log('🔍 Buscando perfis dos usuários:', userIds.length);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, email, phone')
          .in('id', userIds);
        
        profiles = profilesData?.reduce((acc: Record<string, any>, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {}) || {};

        console.log('✅ Perfis encontrados:', Object.keys(profiles).length);
      }

      // 4. Buscar transações existentes (se houver) - mesma lógica do financeiro
      console.log('🔍 Buscando transações...');
      const { data: existingTransactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txError) {
        console.log('⚠️ Tabela transactions não encontrada ou erro:', txError);
      } else {
        console.log('✅ Transações encontradas:', existingTransactions?.length || 0);
      }

      // 5. Criar transações baseadas nos dados reais dos tickets (mesma lógica do financeiro)
      console.log('🔍 Processando tickets como transações...');
      const realTransactions: TicketSale[] = [];
      
      // Processar cada ticket como uma transação de venda
      tickets?.forEach(ticket => {
        const event = events?.find(e => e.id === ticket.event_id);
        if (event && event.price && event.price > 0) {
          const buyer = profiles[ticket.buyer_id] || {};
          const ticketUser = profiles[ticket.user_id] || buyer;

          realTransactions.push({
            id: ticket.id,
            event_id: ticket.event_id,
            event_title: event.title || 'Evento não encontrado',
            event_date: event.start_date || '',
            event_location: event.location || '',
            event_price: event.price || 0,
            event_status: event.status || 'unknown',
            organizer_name: 'Organizador', // Será preenchido depois
            organizer_email: event.organizer_id || '',
            customer_name: buyer.name || ticket.assigned_user_name || 'Usuário não atribuído',
            customer_email: buyer.email || ticket.assigned_user_email || '',
            customer_phone: buyer.phone || ticket.assigned_user_phone || '',
            ticket_type: ticket.ticket_type || 'Ingresso Padrão',
            price: ticket.price || event.price || 0,
            quantity: 1,
            total_amount: ticket.price || event.price || 0,
            status: ticket.status === 'active' ? 'active' : 
                   ticket.status === 'used' ? 'used' : 
                   ticket.status === 'cancelled' ? 'cancelled' : 'active',
            purchase_date: ticket.created_at || new Date().toISOString(),
            payment_method: 'PIX/Cartão',
            qr_code: ticket.code || ticket.qr_code || `TICKET-${ticket.id.slice(0, 8)}`,
            is_used: ticket.status === 'used',
            used_at: ticket.used_at,
            assigned_user_name: ticketUser.name || ticket.assigned_user_name,
            assigned_user_email: ticketUser.email || ticket.assigned_user_email,
            assigned_user_phone: ticketUser.phone || ticket.assigned_user_phone,
            buyer_id: ticket.buyer_id || '',
            user_id: ticket.user_id || ''
          });
        }
      });

      // 6. Adicionar transações existentes se houver (mesma lógica do financeiro)
      if (existingTransactions) {
        console.log('🔍 Processando transações existentes...');
        existingTransactions.forEach(tx => {
          const event = tx.event_id ? events?.find(e => e.id === tx.event_id) : null;
          
          realTransactions.push({
            id: tx.id,
            event_id: tx.event_id,
            event_title: event?.title || 'Evento não encontrado',
            event_date: event?.start_date || '',
            event_location: event?.location || '',
            event_price: event?.price || 0,
            event_status: event?.status || 'unknown',
            organizer_name: 'Organizador', // Será preenchido depois
            organizer_email: event?.organizer_id || '',
            customer_name: 'Comprador via Transação',
            customer_email: '',
            customer_phone: '',
            ticket_type: tx.type || 'Transação',
            price: tx.amount || 0,
            quantity: 1,
            total_amount: tx.amount || 0,
            status: tx.status === 'completed' ? 'active' : 
                   tx.status === 'pending' ? 'pending' : 'cancelled',
            purchase_date: tx.created_at || new Date().toISOString(),
            payment_method: tx.payment_method || 'PIX/Cartão',
            qr_code: `TX-${tx.id.slice(0, 8)}`,
            is_used: false,
            used_at: undefined,
            assigned_user_name: 'Comprador via Transação',
            assigned_user_email: '',
            assigned_user_phone: '',
            buyer_id: '',
            user_id: ''
          });
        });
      }

      // 7. Se ainda não há dados, criar ingressos baseados nos eventos (mesma lógica do financeiro)
      if (realTransactions.length === 0) {
        console.log('🔍 Criando ingressos baseados nos eventos...');
        const eventTickets: TicketSale[] = (events || []).map(event => {
          return {
            id: `event-${event.id}`,
            event_id: event.id,
            event_title: event.title || 'Evento sem título',
            event_date: event.start_date || '',
            event_location: event.location || '',
            event_price: event.price || 0,
            event_status: event.status || 'unknown',
            organizer_name: 'Organizador', // Será preenchido depois
            organizer_email: event.organizer_id || '',
            customer_name: 'Evento sem vendas',
            customer_email: '',
            customer_phone: '',
            ticket_type: 'Evento',
            price: event.price || 0,
            quantity: 1,
            total_amount: event.price || 0,
            status: 'active',
            purchase_date: event.created_at || new Date().toISOString(),
            payment_method: 'N/A',
            qr_code: `EVENT-${event.id.slice(0, 8)}`,
            is_used: false,
            used_at: undefined,
            assigned_user_name: 'Evento sem vendas',
            assigned_user_email: '',
            assigned_user_phone: '',
            buyer_id: '',
            user_id: ''
          };
        });

        realTransactions.push(...eventTickets);
      }

      // 8. Buscar perfis dos organizadores para enriquecer dados (mesma lógica do financeiro)
      const organizerIds = [...new Set([
        ...(events || []).map(e => e.organizer_id),
        ...(tickets || []).map(t => t.buyer_id),
        ...(existingTransactions || []).map(tx => tx.event_id)
      ])].filter(Boolean);

      let organizerProfiles: Record<string, any> = {};
      if (organizerIds.length > 0) {
        console.log('🔍 Buscando perfis dos organizadores:', organizerIds.length);
        const { data: organizerProfilesData } = await supabase
          .from('profiles')
          .select('id, name, email, role')
          .in('id', organizerIds);

        organizerProfiles = organizerProfilesData?.reduce((acc: Record<string, any>, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {}) || {};

        console.log('✅ Perfis dos organizadores encontrados:', Object.keys(organizerProfiles).length);
      }

      // 9. Enriquecer dados com informações dos organizadores
      allTickets = realTransactions.map(ticket => {
        const event = events?.find(e => e.id === ticket.event_id);
        const organizerProfile = event ? organizerProfiles[event.organizer_id] : null;

        return {
          ...ticket,
          organizer_name: organizerProfile?.name || 'Organizador não encontrado',
          organizer_email: organizerProfile?.email || 'Email não encontrado'
        };
      });

      console.log('✅ Total de registros processados:', allTickets.length);
      
      // 10. Logs para debug (mesma lógica do financeiro)
      if (allTickets.length > 0) {
        console.log('📊 Primeiro registro:', allTickets[0]);
      }

      setTickets(allTickets);
    } catch (error) {
      console.error('❌ Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.event_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.organizer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticket_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.qr_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesEvent = filterEvent === 'all' || ticket.event_id === filterEvent;
    const matchesOrganizer = filterOrganizer === 'all' || ticket.organizer_email === filterOrganizer;
    
    // Filtro por data
    let matchesDate = true;
    if (filterDate !== 'all') {
      const ticketDate = new Date(ticket.event_date);
      const today = new Date();
      
      switch (filterDate) {
        case 'today':
          matchesDate = ticketDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = ticketDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = ticketDate >= monthAgo;
          break;
        case 'upcoming':
          matchesDate = ticketDate >= today;
          break;
        case 'past':
          matchesDate = ticketDate < today;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesEvent && matchesOrganizer && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700';
      case 'used':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Válido';
      case 'used':
        return 'Usado';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelado';
      case 'expired':
        return 'Expirado';
      default:
        return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRefund = async (ticketId: string) => {
    if (confirm('Tem certeza que deseja processar o reembolso deste ingresso?')) {
      try {
        const { error } = await supabase
          .from('tickets')
          .update({
            status: 'cancelled'
          })
          .eq('id', ticketId);

        if (error) throw error;

        // Recarregar ingressos
        await fetchTickets();
        alert('Ingresso reembolsado com sucesso!');
      } catch (error) {
        console.error('Erro ao processar reembolso:', error);
        alert('Erro ao processar reembolso. Por favor, tente novamente.');
      }
    }
  };

  const handleCancel = async (ticketId: string) => {
    if (confirm('Tem certeza que deseja cancelar este ingresso?')) {
      try {
        const { error } = await supabase
          .from('tickets')
          .update({
            status: 'cancelled'
          })
          .eq('id', ticketId);

        if (error) throw error;

        // Recarregar ingressos
        await fetchTickets();
        alert('Ingresso cancelado com sucesso!');
      } catch (error) {
        console.error('Erro ao cancelar ingresso:', error);
        alert('Erro ao cancelar ingresso. Por favor, tente novamente.');
      }
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    try {
      // Pequeno delay para garantir que a UI atualize para o estado de loading
      await new Promise(resolve => setTimeout(resolve, 50));

      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('Relatório de Venda de Ingressos - PULACATRACA', 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

      autoTable(doc, {
        head: [["Cliente", "Evento", "Organizador", "Tipo Ingresso", "Valor", "Status"]],
        body: filteredTickets.map(ticket => [
          `${ticket.customer_name}\n${ticket.customer_email}`,
          `${ticket.event_title}\n${ticket.event_date}`,
          `${ticket.organizer_name}\n${ticket.organizer_email}`,
          ticket.ticket_type,
          formatCurrency(ticket.total_amount),
          getStatusText(ticket.status),
        ]),
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
        styles: { cellPadding: 3, fontSize: 9, valign: 'middle' },
      });
      
      const finalY = doc.lastAutoTable.finalY;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(
          `Receita Total (Filtro Atual): ${formatCurrency(totalRevenue)}`,
          14,
          finalY + 15
      );

      doc.save(`relatorio_ingressos_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Por favor, tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalRevenue = filteredTickets.reduce((acc, ticket) => acc + ticket.total_amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando ingressos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestão de Ingressos</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Monitore e gerencie todos os ingressos vendidos.</p>
        </div>
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Exportando...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Exportar PDF</span>
            </>
          )}
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total de Registros</p>
              <p className="text-2xl font-bold">{tickets.length}</p>
              <p className="text-blue-200 text-xs">
                {tickets.filter(t => t.ticket_type === 'Ingresso Padrão').length} Ingressos
              </p>
            </div>
            <Ticket className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Ingressos Válidos</p>
              <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'active').length}</p>
              <p className="text-green-200 text-xs">
                {tickets.filter(t => t.ticket_type === 'Ingresso Padrão' && t.status === 'active').length} Padrão
              </p>
            </div>
            <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-green-600 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Receita Total</p>
              <p className="text-2xl font-bold">{formatCurrency(tickets.reduce((acc, t) => acc + t.total_amount, 0))}</p>
            </div>
            <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">R$</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Eventos Ativos</p>
              <p className="text-2xl font-bold">{Array.from(new Set(tickets.map(t => t.event_id))).length}</p>
              <p className="text-orange-200 text-xs">
                {tickets.filter(t => t.ticket_type === 'Evento').length} Sem vendas
              </p>
              <p className="text-orange-200 text-xs">
                {tickets.filter(t => t.event_status === 'active').length} Status Ativo
              </p>
            </div>
            <Calendar className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Estatísticas adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Transações</p>
              <p className="text-2xl font-bold">{tickets.filter(t => t.ticket_type.includes('Transação')).length}</p>
              <p className="text-purple-200 text-xs">
                {tickets.filter(t => t.ticket_type.includes('Transação') && t.status === 'active').length} Concluídas
              </p>
              <p className="text-purple-200 text-xs">
                {tickets.filter(t => t.ticket_type.includes('Transação') && t.status === 'pending').length} Pendentes
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">TX</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm font-medium">Organizadores</p>
              <p className="text-2xl font-bold">{Array.from(new Set(tickets.map(t => t.organizer_email).filter(Boolean))).length}</p>
            </div>
            <div className="w-8 h-8 bg-teal-200 rounded-full flex items-center justify-center">
              <span className="text-teal-600 font-bold">👤</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Valor Médio</p>
              <p className="text-2xl font-bold">
                {tickets.length > 0 ? formatCurrency(tickets.reduce((acc, t) => acc + t.total_amount, 0) / tickets.length) : 'R$ 0,00'}
              </p>
            </div>
            <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 font-bold">$</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, email, evento, organizador, transação ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'used' | 'pending' | 'cancelled' | 'expired')}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
                <option value="all">Todos os Status</option>
                <option value="active">Válido</option>
                <option value="used">Usado</option>
                <option value="pending">Pendente</option>
                <option value="cancelled">Cancelado</option>
                <option value="expired">Expirado</option>
            </select>
            
            <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
                <option value="all">Todos os Eventos</option>
                {Array.from(new Set(tickets.map(t => t.event_id))).map(eventId => {
                  const event = tickets.find(t => t.event_id === eventId);
                  return (
                    <option key={eventId} value={eventId}>
                      {event?.event_title}
                    </option>
                  );
                })}
            </select>

            <select
                value={filterOrganizer}
                onChange={(e) => setFilterOrganizer(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
                <option value="all">Todos os Organizadores</option>
                {Array.from(new Set(tickets.map(t => t.organizer_email))).filter(Boolean).map(organizerEmail => {
                  const organizer = tickets.find(t => t.organizer_email === organizerEmail);
                  return (
                    <option key={organizerEmail} value={organizerEmail}>
                      {organizer?.organizer_name}
                    </option>
                  );
                })}
            </select>

            <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
                <option value="all">Todas as Datas</option>
                <option value="today">Hoje</option>
                <option value="week">Última Semana</option>
                <option value="month">Último Mês</option>
                <option value="upcoming">Próximos Eventos</option>
                <option value="past">Eventos Passados</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Ingresso</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Cliente</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Evento</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Organizador</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Valor</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        ticket.ticket_type === 'Evento' ? 'bg-orange-100 dark:bg-orange-900/50' :
                        ticket.ticket_type.includes('Transação') ? 'bg-purple-100 dark:bg-purple-900/50' :
                        'bg-blue-100 dark:bg-blue-900/50'
                      }`}>
                        <Ticket className={`w-5 h-5 ${
                          ticket.ticket_type === 'Evento' ? 'text-orange-600 dark:text-orange-400' :
                          ticket.ticket_type.includes('Transação') ? 'text-purple-600 dark:text-purple-400' :
                          'text-blue-600 dark:text-blue-400'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{ticket.qr_code}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.ticket_type}</p>
                        {ticket.ticket_type === 'Evento' && (
                          <p className="text-xs text-orange-600 font-medium">Sem vendas</p>
                        )}
                        {ticket.ticket_type.includes('Transação') && (
                          <p className="text-xs text-purple-600 font-medium">Via Transação</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">{ticket.customer_name}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">{ticket.customer_email}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">{ticket.customer_phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900 dark:text-white">{ticket.event_title}</span>
                      <div className="flex items-center space-x-1 mt-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(ticket.event_date)}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{ticket.event_location}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {formatCurrency(ticket.event_price)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900 dark:text-white">{ticket.organizer_name}</span>
                      <div className="flex items-center space-x-1 mt-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{ticket.organizer_email}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          ticket.event_status === 'active' ? 'bg-green-100 text-green-800' :
                          ticket.event_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          ticket.event_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {ticket.event_status === 'active' ? 'Ativo' :
                           ticket.event_status === 'pending' ? 'Pendente' :
                           ticket.event_status === 'cancelled' ? 'Cancelado' :
                           ticket.event_status}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                      {getStatusText(ticket.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(ticket.total_amount)}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{ticket.quantity}x {formatCurrency(ticket.price)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => alert('QR Code em desenvolvimento')}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleRefund(ticket.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                        title="Reembolsar"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleCancel(ticket.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => alert('QR Code em desenvolvimento')}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                        title="Ver QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTickets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Nenhum ingresso encontrado</p>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <span>Mostrando {filteredTickets.length} de {tickets.length} ingressos</span>
          {filteredTickets.length !== tickets.length && (
            <span className="text-blue-600 font-medium">
              (Filtros aplicados)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-xs text-gray-500">
            Receita filtrada: {formatCurrency(filteredTickets.reduce((acc, t) => acc + t.total_amount, 0))}
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Anterior</button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
            <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700">2</button>
            <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  );
}