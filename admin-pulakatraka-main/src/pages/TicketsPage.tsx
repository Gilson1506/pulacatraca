import { useState, useEffect } from 'react';
import { Search, Download, Eye, RefreshCw, Calendar, MapPin, User, Ticket, QrCode, Mail, Phone, Loader2, X, CheckCircle, TrendingUp, BarChart3, Activity, Users, Filter, DollarSign } from 'lucide-react';
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
  order_id?: string;
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
      console.log('🔍 Buscando dados completos de ingressos e vendas...');

      let allTickets: TicketSale[] = [];

      // 1. Buscar apenas eventos aprovados e ativos com dados completos
      console.log('🔍 Buscando eventos aprovados e ativos...');
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          end_date,
          location,
          price,
          status,
          organizer_id,
          created_at,
          total_tickets,
          available_tickets
        `)
        .in('status', ['approved', 'active', 'published'])
        .order('created_at', { ascending: false });

      if (eventsError) {
        console.log('⚠️ Erro ao buscar eventos:', eventsError);
      } else {
        console.log('✅ Eventos encontrados:', events?.length || 0);
      }

      // 1.5 Buscar tipos de ingressos
      console.log('🔍 Buscando tipos de ingressos...');
      const { data: ticketTypes, error: ticketTypesError } = await supabase
        .from('event_ticket_types')
        .select(`
          id,
          event_id,
          name,
          price,
          ticket_type
        `)
        .order('created_at', { ascending: false });

      if (ticketTypesError) {
        console.log('⚠️ Erro ao buscar tipos de ingressos:', ticketTypesError);
      } else {
        console.log('✅ Tipos de ingressos encontrados:', ticketTypes?.length || 0);
      }

      // 2. Buscar tickets com dados completos
      console.log('🔍 Buscando tickets...');
      const { data: ticketsData, error: ticketsError } = await supabase
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
          qr_code,
          transfer_count,
          max_transfers
        `)
        .order('created_at', { ascending: false });

      if (ticketsError) {
        console.log('⚠️ Erro ao buscar tickets:', ticketsError);
      } else {
        console.log('✅ Tickets encontrados:', ticketsData?.length || 0);
      }

      // 3. Buscar pedidos (orders) para dados reais de vendas
      console.log('🔍 Buscando pedidos...');
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          status,
          total_amount,
          payment_method,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.log('⚠️ Erro ao buscar pedidos:', ordersError);
      } else {
        console.log('✅ Pedidos encontrados:', orders?.length || 0);
      }

      // 4. Buscar itens dos pedidos
      console.log('🔍 Buscando itens dos pedidos...');
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          ticket_type_id,
          ticket_type,
          quantity,
          price,
          total_price
        `);

      if (orderItemsError) {
        console.log('⚠️ Erro ao buscar itens dos pedidos:', orderItemsError);
      } else {
        console.log('✅ Itens dos pedidos encontrados:', orderItems?.length || 0);
      }

      // 5. Buscar perfis dos usuários
      const userIds = [...new Set([
        ...(ticketsData?.map(t => t.buyer_id).filter(Boolean) || []),
        ...(ticketsData?.map(t => t.user_id).filter(Boolean) || []),
        ...(orders?.map(o => o.customer_id).filter(Boolean) || [])
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

      // 6. Buscar perfis dos organizadores
      const organizerIds = [...new Set((events || []).map(e => e.organizer_id))].filter(Boolean);

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

      // 7. Processar apenas pedidos confirmados como ingressos vendidos
      console.log('🔍 Processando pedidos confirmados como ingressos vendidos...');
      const orderTickets: TicketSale[] = [];
      
      orders?.forEach(order => {
        // Apenas processar pedidos com status válido
        if (!order.status || order.status === 'cancelled') {
          return;
        }

        const orderUser = profiles[order.customer_id] || {};
        const itemsForOrder = orderItems?.filter(item => item.order_id === order.id) || [];
        
        itemsForOrder.forEach(item => {
          const ticketType = ticketTypes?.find(tt => tt.id === item.ticket_type_id);
          const event = ticketType ? events?.find(e => e.id === ticketType.event_id) : null;
          const organizerProfile = event ? organizerProfiles[event.organizer_id] : null;
          
          // Apenas incluir se tiver evento aprovado, dados do comprador e organizador
          if (event && ticketType && orderUser.name && organizerProfile?.name) {
            orderTickets.push({
              id: `${order.id}-${item.id}`,
              event_id: ticketType.event_id,
              event_title: event.title,
              event_date: event.start_date,
              event_location: event.location || 'Local a definir',
              event_price: item.price || ticketType.price || event.price || 0,
              event_status: event.status,
              organizer_name: organizerProfile.name,
              organizer_email: organizerProfile.email,
              customer_name: orderUser.name,
              customer_email: orderUser.email || 'Email não informado',
              customer_phone: orderUser.phone || 'Telefone não informado',
              ticket_type: item.ticket_type || ticketType.name || 'Ingresso Padrão',
              price: item.price || ticketType.price || 0,
              quantity: item.quantity || 1,
              total_amount: item.total_price || (item.price * item.quantity) || 0,
              status: order.status === 'completed' ? 'active' : 
                     order.status === 'pending' ? 'pending' : 'cancelled',
              purchase_date: order.created_at || new Date().toISOString(),
              payment_method: order.payment_method || 'PIX/Cartão',
              qr_code: `ORDER-${order.id.slice(0, 8)}-${item.id.slice(0, 8)}`,
              is_used: false,
              used_at: undefined,
              assigned_user_name: orderUser.name,
              assigned_user_email: orderUser.email || 'Email não informado',
              assigned_user_phone: orderUser.phone || 'Telefone não informado',
              buyer_id: order.customer_id,
              user_id: order.customer_id,
              order_id: order.id
            });
          }
        });
      });

      // 8. Processar apenas tickets individuais com dados completos
      console.log('🔍 Processando tickets individuais com dados completos...');
      const individualTickets: TicketSale[] = [];
      
      ticketsData?.forEach(ticket => {
        // Apenas processar tickets não cancelados
        if (ticket.status === 'cancelled') {
          return;
        }

        const event = events?.find(e => e.id === ticket.event_id);
        const buyer = profiles[ticket.buyer_id] || {};
        const ticketUser = profiles[ticket.user_id] || buyer;
        const organizerProfile = event ? organizerProfiles[event.organizer_id] : null;

        // Apenas incluir se tiver evento aprovado, dados do comprador e organizador
        const hasCompleteBuyerData = buyer.name || ticket.assigned_user_name;
        const hasCompleteOrganizerData = organizerProfile?.name;

        if (event && hasCompleteBuyerData && hasCompleteOrganizerData) {
          individualTickets.push({
            id: ticket.id,
            event_id: ticket.event_id,
            event_title: event.title,
            event_date: event.start_date,
            event_location: event.location || 'Local a definir',
            event_price: ticket.price || event.price || 0,
            event_status: event.status,
            organizer_name: organizerProfile.name,
            organizer_email: organizerProfile.email,
            customer_name: buyer.name || ticket.assigned_user_name || 'Comprador não identificado',
            customer_email: buyer.email || ticket.assigned_user_email || 'Email não informado',
            customer_phone: buyer.phone || ticket.assigned_user_phone || 'Telefone não informado',
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
            assigned_user_name: ticketUser.name || ticket.assigned_user_name || 'Usuário não identificado',
            assigned_user_email: ticketUser.email || ticket.assigned_user_email || 'Email não informado',
            assigned_user_phone: ticketUser.phone || ticket.assigned_user_phone || 'Telefone não informado',
            buyer_id: ticket.buyer_id || '',
            user_id: ticket.user_id || ''
          });
        }
      });

      // 9. Combinar todos os dados
      allTickets = [...orderTickets, ...individualTickets];

      // 10. Logs de resumo
      console.log('✅ Processamento concluído - Mostrando apenas ingressos vendidos de eventos aprovados');
      console.log('📊 Total de ingressos processados:', allTickets.length);
      console.log('📊 Ingressos de pedidos:', orderTickets.length);
      console.log('📊 Ingressos individuais:', individualTickets.length);
      console.log('📊 Eventos únicos:', new Set(allTickets.map(t => t.event_id)).size);
      console.log('📊 Organizadores únicos:', new Set(allTickets.map(t => t.organizer_email)).size);
      console.log('📊 Compradores únicos:', new Set(allTickets.map(t => t.customer_email)).size);
      
      if (allTickets.length > 0) {
        const totalRevenue = allTickets.reduce((acc, t) => acc + t.total_amount, 0);
        console.log('💰 Receita total:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue));
        console.log('📊 Status dos ingressos:', {
          ativos: allTickets.filter(t => t.status === 'active').length,
          usados: allTickets.filter(t => t.status === 'used').length,
          pendentes: allTickets.filter(t => t.status === 'pending').length,
          cancelados: allTickets.filter(t => t.status === 'cancelled').length
        });
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

  const sortedTickets = [...filteredTickets].sort((a, b) => a.event_title.localeCompare(b.event_title));

  const groupedTickets = sortedTickets.reduce((acc: { event_id: string; event_title: string; event_date: string; event_location: string; tickets: TicketSale[] }[], ticket) => {
    let lastGroup = acc[acc.length - 1];
    if (!lastGroup || lastGroup.event_id !== ticket.event_id) {
      acc.push({
        event_id: ticket.event_id,
        event_title: ticket.event_title,
        event_date: ticket.event_date,
        event_location: ticket.event_location,
        tickets: []
      });
      lastGroup = acc[acc.length - 1];
    }
    lastGroup.tickets.push(ticket);
    return acc;
  }, []);

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

  const handleRefund = async (ticket: TicketSale) => {
    if (confirm('Tem certeza que deseja processar o reembolso deste ingresso?')) {
      try {
        let error;
        if (ticket.order_id) {
          ({ error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', ticket.order_id));
        } else {
          ({ error } = await supabase
            .from('tickets')
            .update({ status: 'cancelled' })
            .eq('id', ticket.id));
        }

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

  const handleCancel = async (ticket: TicketSale) => {
    if (confirm('Tem certeza que deseja cancelar este ingresso?')) {
      try {
        let error;
        if (ticket.order_id) {
          ({ error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', ticket.order_id));
        } else {
          ({ error } = await supabase
            .from('tickets')
            .update({ status: 'cancelled' })
            .eq('id', ticket.id));
        }

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
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitore e gerencie todos os ingressos vendidos de eventos aprovados com dados completos dos compradores.
          </p>
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

      {/* Banner Informativo */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              📊 Dados Reais e Validados
            </h3>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              Esta página exibe apenas ingressos vendidos de <strong>eventos aprovados/ativos</strong>, com informações completas dos compradores 
              (nome, email, telefone) e organizadores. Ingressos cancelados ou sem dados completos não são exibidos para garantir 
              a qualidade das informações.
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total de Ingressos Vendidos</p>
              <p className="text-2xl font-bold">{tickets.length}</p>
              <div className="text-blue-200 text-xs mt-1">
                <div>📦 {tickets.filter(t => t.order_id).length} via Pedidos</div>
                <div>🎟️ {tickets.filter(t => !t.order_id).length} Individuais</div>
              </div>
            </div>
            <Ticket className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Ingressos Válidos</p>
              <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'active').length}</p>
              <div className="text-green-200 text-xs mt-1">
                <div>{tickets.filter(t => t.status === 'used').length} Usados</div>
                <div>{tickets.filter(t => t.status === 'pending').length} Pendentes</div>
              </div>
            </div>
            <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Receita Total</p>
              <p className="text-2xl font-bold">{formatCurrency(tickets.reduce((acc, t) => acc + t.total_amount, 0))}</p>
              <div className="text-purple-200 text-xs mt-1">
                <div>{formatCurrency(tickets.filter(t => t.status === 'active').reduce((acc, t) => acc + t.total_amount, 0))} Ativos</div>
                <div>{formatCurrency(tickets.filter(t => t.status === 'used').reduce((acc, t) => acc + t.total_amount, 0))} Usados</div>
              </div>
            </div>
            <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Eventos Aprovados</p>
              <p className="text-2xl font-bold">{Array.from(new Set(tickets.map(t => t.event_id))).length}</p>
              <div className="text-orange-200 text-xs mt-1">
                <div>🎭 {Array.from(new Set(tickets.map(t => t.event_title))).length} Eventos distintos</div>
                <div>👥 {Array.from(new Set(tickets.map(t => t.customer_email))).filter(Boolean).length} Compradores</div>
              </div>
            </div>
            <Calendar className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Estatísticas Detalhadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Compradores Únicos</p>
              <p className="text-2xl font-bold">{Array.from(new Set(tickets.map(t => t.customer_email))).filter(Boolean).length}</p>
              <div className="text-emerald-200 text-xs mt-1">
                <div>📧 {tickets.filter(t => t.customer_email && t.customer_email !== 'Email não informado').length} Com email</div>
                <div>📱 {tickets.filter(t => t.customer_phone && t.customer_phone !== 'Telefone não informado').length} Com telefone</div>
              </div>
            </div>
            <div className="w-8 h-8 bg-emerald-200 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm font-medium">Organizadores Ativos</p>
              <p className="text-2xl font-bold">{Array.from(new Set(tickets.map(t => t.organizer_email).filter(Boolean))).length}</p>
              <div className="text-teal-200 text-xs mt-1">
                <div>{Array.from(new Set(tickets.filter(t => t.event_status === 'approved').map(t => t.organizer_email))).length} Com eventos aprovados</div>
              </div>
            </div>
            <div className="w-8 h-8 bg-teal-200 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
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
              <div className="text-indigo-200 text-xs mt-1">
                <div>Ticket mais caro: {formatCurrency(Math.max(...tickets.map(t => t.total_amount), 0))}</div>
                <div>Ticket mais barato: {formatCurrency(Math.min(...tickets.filter(t => t.total_amount > 0).map(t => t.total_amount), 0) || 0)}</div>
              </div>
            </div>
            <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-rose-100 text-sm font-medium">Taxa de Conversão</p>
              <p className="text-2xl font-bold">
                {tickets.length > 0 ? ((tickets.filter(t => t.status === 'active' || t.status === 'used').length / tickets.length) * 100).toFixed(1) : 0}%
              </p>
              <div className="text-rose-200 text-xs mt-1">
                <div>{tickets.filter(t => t.status === 'cancelled').length} Cancelados</div>
                <div>{tickets.filter(t => t.status === 'pending').length} Pendentes</div>
              </div>
            </div>
            <div className="w-8 h-8 bg-rose-200 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros Avançados */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Filtros Avançados</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Use os filtros abaixo para encontrar ingressos específicos e analisar dados por evento
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Busca Principal */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Busca Geral
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, email, evento, organizador, código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status do Ingresso
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'used' | 'pending' | 'cancelled' | 'expired')}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Válido</option>
                  <option value="used">Usado</option>
                  <option value="pending">Pendente</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="expired">Expirado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Período
                </label>
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

          {/* Filtros por Evento e Organizador */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por Evento
              </label>
              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">Todos os Eventos ({Array.from(new Set(tickets.map(t => t.event_id))).length})</option>
                {Array.from(new Set(tickets.map(t => t.event_id))).map(eventId => {
                  const event = tickets.find(t => t.event_id === eventId);
                  const eventTickets = tickets.filter(t => t.event_id === eventId);
                  const eventRevenue = eventTickets.reduce((acc, t) => acc + t.total_amount, 0);
                  return (
                    <option key={eventId} value={eventId}>
                      {event?.event_title} - {eventTickets.length} ingressos - {formatCurrency(eventRevenue)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por Organizador
              </label>
              <select
                value={filterOrganizer}
                onChange={(e) => setFilterOrganizer(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">Todos os Organizadores ({Array.from(new Set(tickets.map(t => t.organizer_email))).filter(Boolean).length})</option>
                {Array.from(new Set(tickets.map(t => t.organizer_email))).filter(Boolean).map(organizerEmail => {
                  const organizer = tickets.find(t => t.organizer_email === organizerEmail);
                  const organizerTickets = tickets.filter(t => t.organizer_email === organizerEmail);
                  const organizerRevenue = organizerTickets.reduce((acc, t) => acc + t.total_amount, 0);
                  return (
                    <option key={organizerEmail} value={organizerEmail}>
                      {organizer?.organizer_name} - {organizerTickets.length} ingressos - {formatCurrency(organizerRevenue)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Resumo dos Filtros */}
        {filteredTickets.length !== tickets.length && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Filtros Ativos
                </span>
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Mostrando {filteredTickets.length} de {tickets.length} ingressos | 
                Receita: {formatCurrency(filteredTickets.reduce((acc, t) => acc + t.total_amount, 0))} de {formatCurrency(tickets.reduce((acc, t) => acc + t.total_amount, 0))}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {searchTerm && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                  Busca: "{searchTerm}"
                </span>
              )}
              {filterStatus !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                  Status: {filterStatus}
                </span>
              )}
              {filterEvent !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                  Evento: {tickets.find(t => t.event_id === filterEvent)?.event_title}
                </span>
              )}
              {filterOrganizer !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                  Organizador: {tickets.find(t => t.organizer_email === filterOrganizer)?.organizer_name}
                </span>
              )}
              {filterDate !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                  Período: {filterDate}
                </span>
              )}
            </div>
          </div>
        )}
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
              {groupedTickets.map((group) => (
                <>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <td colSpan={7} className="px-6 py-3 font-semibold text-gray-900 dark:text-white">
                      {group.event_title} - {formatDate(group.event_date)} - {group.event_location}
                      <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                        {group.tickets.length} ingressos - {formatCurrency(group.tickets.reduce((sum, t) => sum + t.total_amount, 0))}
                      </span>
                    </td>
                  </tr>
                  {group.tickets.map((ticket) => (
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
                            {ticket.ticket_type === 'Evento Disponível' && (
                              <p className="text-xs text-orange-600 font-medium">Evento disponível</p>
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
                            onClick={() => handleRefund(ticket)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Reembolsar"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleCancel(ticket)}
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
                </>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTickets.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Ticket className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nenhum ingresso encontrado
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || filterStatus !== 'all' || filterEvent !== 'all' || filterOrganizer !== 'all' || filterDate !== 'all'
                ? 'Tente ajustar os filtros de busca para encontrar ingressos vendidos'
                : 'Não há ingressos vendidos no momento'
              }
            </p>
            {tickets.length === 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 max-w-lg mx-auto">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  <strong>ℹ️ Informações sobre esta página:</strong>
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1">
                  <li>Mostra apenas ingressos vendidos de <strong>eventos aprovados</strong></li>
                  <li>Exibe dados completos dos compradores e organizadores</li>
                  <li>Ingressos sem dados completos não são exibidos</li>
                  <li>Para ver ingressos aqui, é necessário ter pedidos confirmados ou tickets ativos</li>
                </ul>
              </div>
            )}
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