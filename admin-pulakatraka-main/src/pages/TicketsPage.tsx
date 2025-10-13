import { useState, useEffect, useRef } from 'react';
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
  const refreshTimerRef = useRef<number | null>(null);
  
  // Estados para modais
  const [selectedTicket, setSelectedTicket] = useState<TicketSale | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  // Realtime updates: auto-refresh when core tables change
  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = window.setTimeout(() => {
        fetchTickets();
      }, 500);
    };

    const channel = supabase
      .channel('admin-tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkin' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_users' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
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
          max_transfers,
          ticket_user_id,
          ticket_type_id
        `)
        .order('created_at', { ascending: false });

      if (ticketsError) {
        console.log('⚠️ Erro ao buscar tickets:', ticketsError);
      } else {
        console.log('✅ Tickets encontrados:', ticketsData?.length || 0);
      }

      // 2.5 Buscar dados de check-in da tabela checkin
      console.log('🔍 Buscando dados de check-in...');
      const { data: checkinsData, error: checkinsError } = await supabase
        .from('checkin')
        .select(`
          id,
          ticket_user_id,
          event_id,
          organizer_id,
          created_at,
          notes
        `)
        .order('created_at', { ascending: false });

      if (checkinsError) {
        console.log('⚠️ Erro ao buscar check-ins:', checkinsError);
      } else {
        console.log('✅ Check-ins encontrados:', checkinsData?.length || 0);
      }

      // 2.6 Buscar ticket_users para dados completos dos participantes
      console.log('🔍 Buscando ticket_users...');
      const { data: ticketUsersData, error: ticketUsersError } = await supabase
        .from('ticket_users')
        .select(`
          id,
          ticket_id,
          name,
          email,
          document,
          qr_code,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (ticketUsersError) {
        console.log('⚠️ Erro ao buscar ticket_users:', ticketUsersError);
      } else {
        console.log('✅ Ticket users encontrados:', ticketUsersData?.length || 0);
      }

      // Criar mapa de check-ins por ticket_user_id
      const checkinsByTicketUser = checkinsData?.reduce((acc: Record<string, any>, checkin) => {
        acc[checkin.ticket_user_id] = checkin;
        return acc;
      }, {}) || {};

      // Criar mapa de ticket_users por ticket_id
      const ticketUsersByTicketId = ticketUsersData?.reduce((acc: Record<string, any>, tu) => {
        acc[tu.ticket_id] = tu;
        return acc;
      }, {}) || {};

      // 3. Buscar pedidos (orders) para dados reais de vendas
      console.log('🔍 Buscando pedidos...');
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          status:payment_status,
          customer_name,
          customer_email,
          total_amount,
          payment_method,
          created_at,
          updated_at,
          metadata
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
        .select('*');

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

        const orderUser = (profiles[order.customer_id] || {
          name: order.customer_name,
          email: order.customer_email
        }) as any;
        let itemsForOrder: any[] = (orderItems?.filter((item: any) => item.order_id === order.id) || []);

        // Fallback: se não houver registros em order_items, usar orders.metadata.items
        if ((!itemsForOrder || itemsForOrder.length === 0) && Array.isArray(order.metadata?.items)) {
          itemsForOrder = (order.metadata.items || []).map((mi: any, idx: number) => ({
            id: `${order.id}-m${idx}`,
            order_id: order.id,
            ticket_type: mi.name || mi.description || mi.ticket_type || 'Ingresso',
            quantity: Number(mi.quantity || 1),
            price: Number((mi.amount || 0) / 100),
            total_price: Number((mi.amount || 0) / 100) * Number(mi.quantity || 1),
            event_id: order.metadata?.event_id || null
          }));
        }
        
        itemsForOrder.forEach((item: any) => {
          // Encontrar ticketType por id (se existir) ou por nome + event_id
          let ticketType = ticketTypes?.find(tt => tt.id === item.ticket_type_id);
          if (!ticketType) {
            const candidateEventId = item.event_id || order.metadata?.event_id || null;
            if (candidateEventId && item.ticket_type) {
              ticketType = ticketTypes?.find(tt => tt.event_id === candidateEventId && (tt.name || '').toLowerCase() === (item.ticket_type || '').toLowerCase());
            }
          }
          const event = ticketType ? (events?.find(e => e.id === ticketType.event_id)) : (item.event_id ? (events?.find(e => e.id === item.event_id)) : null);
          const organizerProfile = event ? organizerProfiles[event.organizer_id] : null;
          
          // Buscar tickets relacionados a este pedido para verificar se foram usados
          const relatedTickets = ticketsData?.filter(t => 
            t.event_id === event?.id && 
            t.user_id === order.customer_id
          ) || [];
          
          const hasUsedTicket = relatedTickets.some(t => t.status === 'used');
          const usedTicket = relatedTickets.find(t => t.status === 'used');
          
          // Apenas incluir se tiver evento aprovado, dados do comprador e organizador
          if (event && orderUser?.name && organizerProfile?.name) {
            orderTickets.push({
              id: `${order.id}-${item.id}`,
              event_id: event.id,
              event_title: event.title,
              event_date: event.start_date,
              event_location: event.location || 'Local a definir',
              event_price: item.price || ticketType?.price || event.price || 0,
              event_status: event.status,
              organizer_name: organizerProfile.name,
              organizer_email: organizerProfile.email,
              customer_name: orderUser.name,
              customer_email: orderUser.email || 'Email não informado',
              customer_phone: orderUser.phone || 'Telefone não informado',
              ticket_type: (item.ticket_type || ticketType?.name || 'Ingresso Padrão')
                .replace(/\s*-?\s*(Feminino|Masculino|Unissex)\s*$/i, '')
                .replace(/\s*\((Feminino|Masculino|Unissex)\)\s*$/i, '')
                .trim(),
              price: item.price || ticketType?.price || 0,
              quantity: item.quantity || 1,
              total_amount: item.total_price || ((item.price || 0) * (item.quantity || 1)) || 0,
              status: hasUsedTicket ? 'used' : 
                     (['paid','completed','captured','capturado'].includes(String(order.status))) ? 'active' : 
                     (String(order.status) === 'pending' ? 'pending' : 'cancelled'),
              purchase_date: order.created_at || new Date().toISOString(),
              payment_method: order.payment_method || 'PIX/Cartão',
              qr_code: usedTicket?.code || usedTicket?.qr_code || `ORDER-${order.id.slice(0, 8)}-${String(item.id).slice(0, 8)}`,
              is_used: hasUsedTicket,
              used_at: usedTicket?.used_at,
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
          // Buscar dados do ticket_user e check-in
          const ticketUserData = ticket.ticket_user_id ? ticketUsersByTicketId[ticket.id] : null;
          const checkinData = ticketUserData ? checkinsByTicketUser[ticketUserData.id] : null;
          
          // Buscar nome do tipo de ingresso
          const ticketTypeData = ticket.ticket_type_id ? ticketTypes?.find(tt => tt.id === ticket.ticket_type_id) : null;
          let ticketTypeName = ticketTypeData?.name || ticket.ticket_type || 'Ingresso Padrão';
          
          // Remover sufixos como "Feminino", "Masculino", etc do nome
          ticketTypeName = ticketTypeName
            .replace(/\s*-?\s*(Feminino|Masculino|Unissex)\s*$/i, '')
            .replace(/\s*\((Feminino|Masculino|Unissex)\)\s*$/i, '')
            .trim();
          
          // Determinar status real baseado em check-in
          let realStatus = ticket.status;
          let realUsedAt = ticket.used_at;
          
          if (checkinData && ticket.status === 'used') {
            realUsedAt = checkinData.created_at;
          }
          
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
            ticket_type: ticketTypeName,
            price: ticket.price || event.price || 0,
            quantity: 1,
            total_amount: ticket.price || event.price || 0,
            status: realStatus === 'active' ? 'active' : 
                   realStatus === 'used' ? 'used' : 
                   realStatus === 'cancelled' ? 'cancelled' : 'active',
            purchase_date: ticket.created_at || new Date().toISOString(),
            payment_method: 'PIX/Cartão',
            qr_code: ticket.code || ticket.qr_code || `TICKET-${ticket.id.slice(0, 8)}`,
            is_used: realStatus === 'used' || !!checkinData,
            used_at: realUsedAt,
            assigned_user_name: ticketUserData?.name || ticketUser.name || ticket.assigned_user_name || 'Usuário não identificado',
            assigned_user_email: ticketUserData?.email || ticketUser.email || ticket.assigned_user_email || 'Email não informado',
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
        const ticketsWithCheckin = allTickets.filter(t => t.is_used || t.status === 'used');
        
        console.log('💰 Receita total:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue));
        console.log('📊 Status dos ingressos:', {
          ativos: allTickets.filter(t => t.status === 'active').length,
          usados: allTickets.filter(t => t.status === 'used').length,
          comCheckin: ticketsWithCheckin.length,
          isUsedTrue: allTickets.filter(t => t.is_used === true).length,
          pendentes: allTickets.filter(t => t.status === 'pending').length,
          cancelados: allTickets.filter(t => t.status === 'cancelled').length
        });
        
        if (ticketsWithCheckin.length > 0) {
          console.log('✅ Ingressos com check-in:', ticketsWithCheckin.map(t => ({
            id: t.id.slice(0, 8),
            customer: t.customer_name,
            status: t.status,
            is_used: t.is_used,
            used_at: t.used_at
          })));
        }
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

  const handleViewDetails = (ticket: TicketSale) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
  };

  const handleViewQR = (ticket: TicketSale) => {
    setSelectedTicket(ticket);
    setShowQRModal(true);
  };

  const handleOpenCancelModal = (ticket: TicketSale) => {
    setSelectedTicket(ticket);
    setShowCancelModal(true);
  };

  const handleOpenRefundModal = (ticket: TicketSale) => {
    setSelectedTicket(ticket);
    setShowRefundModal(true);
  };

  const handleRefund = async () => {
    if (!selectedTicket) return;
    
    try {
      setActionLoading(true);
      let error;
      if (selectedTicket.order_id) {
        ({ error } = await supabase
          .from('orders')
          .update({ payment_status: 'refunded' })
          .eq('id', selectedTicket.order_id));
      } else {
        ({ error } = await supabase
          .from('tickets')
          .update({ status: 'cancelled' })
          .eq('id', selectedTicket.id));
      }

      if (error) throw error;
      
      setShowRefundModal(false);
      setSelectedTicket(null);
      await fetchTickets();
    } catch (error) {
      console.error('Erro ao processar reembolso:', error);
      alert('Erro ao processar reembolso. Por favor, tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedTicket) return;
    
    try {
      setActionLoading(true);
      let error;
      if (selectedTicket.order_id) {
        ({ error } = await supabase
          .from('orders')
          .update({ payment_status: 'cancelled' })
          .eq('id', selectedTicket.order_id));
      }
      
      ({ error } = await supabase
        .from('tickets')
        .update({ status: 'cancelled' })
        .eq('id', selectedTicket.id));

      if (error) throw error;
      
      setShowCancelModal(false);
      setSelectedTicket(null);
      await fetchTickets();
    } catch (error) {
      console.error('Erro ao cancelar ingresso:', error);
      alert('Erro ao cancelar ingresso. Por favor, tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    try {
      // Pequeno delay para garantir que a UI atualize para o estado de loading
      await new Promise(resolve => setTimeout(resolve, 50));

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const margin = 14;
      const pageWidth = doc.internal.pageSize.getWidth();

      // Cabeçalho
      doc.setFillColor(59, 130, 246); // azul
      doc.rect(0, 0, pageWidth, 26, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Relatório de Venda de Ingressos - Admin', margin, 17);
      doc.setFontSize(10);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin - 60, 17);

      // Resumo
      let currentY = 34;
      doc.setTextColor(33, 33, 33);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const totalRegistros = filteredTickets.length;
      const pendentes = filteredTickets.filter(t => t.status === 'pending').length;
      const usados = filteredTickets.filter(t => t.status === 'used').length;
      const confirmados = filteredTickets.filter(t => t.status === 'active').length;
      doc.text(`Total registros: ${totalRegistros}`, margin, currentY);
      doc.text(`Receita: ${formatCurrency(totalRevenue)}`, margin + 80, currentY);
      currentY += 6;
      doc.text(`Confirmados: ${confirmados}`, margin, currentY);
      doc.text(`Pendentes: ${pendentes}`, margin + 80, currentY);
      doc.text(`Usados: ${usados}`, margin + 160, currentY);

      // Tabela
      currentY += 8;
      autoTable(doc, {
        startY: currentY,
        head: [[
          'Cliente', 'Evento', 'Organizador', 'Tipo', 'Valor', 'Status'
        ]],
        body: filteredTickets.map(ticket => [
          `${ticket.customer_name || ''}\n${ticket.customer_email || ''}`,
          `${ticket.event_title || ''}\n${ticket.event_date || ''}`,
          `${ticket.organizer_name || ''}\n${ticket.organizer_email || ''}`,
          ticket.ticket_type || '-',
          formatCurrency(ticket.total_amount || 0),
          getStatusText(ticket.status)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { cellPadding: 3, fontSize: 9, valign: 'middle' },
        alternateRowStyles: { fillColor: [232, 240, 254] },
        columnStyles: {
          0: { cellWidth: 48 },
          1: { cellWidth: 52 },
          2: { cellWidth: 52 },
          3: { cellWidth: 18 },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 20 }
        },
        margin: { left: margin, right: margin },
        didDrawPage: () => {
          const str = `Página ${doc.getNumberOfPages()}`;
          doc.setFontSize(9);
          doc.setTextColor(120);
          doc.text(str, pageWidth - margin, doc.internal.pageSize.height - 8, { align: 'right' });
        }
      });

      const finalY = doc.lastAutoTable?.finalY || (currentY + 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(33, 33, 33);
      doc.text(`Receita Total (Filtro Atual): ${formatCurrency(totalRevenue)}`, margin, finalY + 8);

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

      {/* Banner Informativo removido por solicitação */}
 
      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total de Ingressos</p>
              <p className="text-2xl font-bold">{tickets.reduce((acc, t) => acc + t.quantity, 0)}</p>
              <div className="text-blue-200 text-xs mt-1">
                <div>📦 {tickets.filter(t => t.order_id).reduce((acc, t) => acc + t.quantity, 0)} via Pedidos</div>
                <div>🎟️ {tickets.filter(t => !t.order_id).reduce((acc, t) => acc + t.quantity, 0)} Individuais</div>
              </div>
            </div>
            <Ticket className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Status dos Ingressos</p>
              <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'active').length} Ativos</p>
              <div className="text-green-200 text-xs mt-1">
                <div>✅ {tickets.filter(t => t.is_used || t.status === 'used').length} Com Check-in</div>
                <div>⏳ {tickets.filter(t => t.status === 'pending').length} Pendentes</div>
                <div>❌ {tickets.filter(t => t.status === 'cancelled').length} Cancelados</div>
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
                  const eventTicketCount = eventTickets.reduce((acc, t) => acc + t.quantity, 0);
                  const eventRevenue = eventTickets.reduce((acc, t) => acc + t.total_amount, 0);
                  return (
                    <option key={eventId} value={eventId}>
                      {event?.event_title} - {eventTicketCount} ingressos - {formatCurrency(eventRevenue)}
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
                  const organizerTicketCount = organizerTickets.reduce((acc, t) => acc + t.quantity, 0);
                  const organizerRevenue = organizerTickets.reduce((acc, t) => acc + t.total_amount, 0);
                  return (
                    <option key={organizerEmail} value={organizerEmail}>
                      {organizer?.organizer_name} - {organizerTicketCount} ingressos - {formatCurrency(organizerRevenue)}
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
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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
                            onClick={() => handleViewDetails(ticket)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Ver Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenRefundModal(ticket)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Reembolsar"
                            disabled={ticket.status === 'cancelled' || ticket.status === 'expired'}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenCancelModal(ticket)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Cancelar"
                            disabled={ticket.status === 'cancelled' || ticket.status === 'expired'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleViewQR(ticket)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg transition-all duration-200 hover:scale-110"
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

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Detalhes do Ingresso</h3>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-center">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    selectedTicket.status === 'active' ? 'bg-green-100 text-green-700' :
                    selectedTicket.status === 'used' ? 'bg-blue-100 text-blue-700' :
                    selectedTicket.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    selectedTicket.status === 'expired' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedTicket.status === 'active' ? '✅ Ativo' :
                     selectedTicket.status === 'used' ? '🎫 Usado' :
                     selectedTicket.status === 'cancelled' ? '❌ Cancelado' :
                     selectedTicket.status === 'expired' ? '⏰ Expirado' :
                     '⏳ Pendente'}
                  </span>
                </div>

                {/* Informações do Evento */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">📅 EVENTO</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-blue-600 dark:text-blue-400 font-medium">Nome</label>
                      <p className="text-gray-900 dark:text-white font-bold">{selectedTicket.event_title}</p>
                    </div>
                    <div>
                      <label className="text-xs text-blue-600 dark:text-blue-400 font-medium">Data</label>
                      <p className="text-gray-900 dark:text-white">{formatDate(selectedTicket.event_date)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-blue-600 dark:text-blue-400 font-medium">Local</label>
                      <p className="text-gray-900 dark:text-white">{selectedTicket.event_location}</p>
                    </div>
                  </div>
                </div>

                {/* Informações do Comprador */}
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                  <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3">👤 COMPRADOR</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-purple-600 dark:text-purple-400 font-medium">Nome</label>
                      <p className="text-gray-900 dark:text-white font-bold">{selectedTicket.customer_name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-purple-600 dark:text-purple-400 font-medium">Email</label>
                      <p className="text-gray-900 dark:text-white">{selectedTicket.customer_email}</p>
                    </div>
                    {selectedTicket.customer_phone && (
                      <div>
                        <label className="text-xs text-purple-600 dark:text-purple-400 font-medium">Telefone</label>
                        <p className="text-gray-900 dark:text-white">{selectedTicket.customer_phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informações do Ingresso */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                  <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-3">🎫 INGRESSO</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-green-600 dark:text-green-400 font-medium">Tipo</label>
                      <p className="text-gray-900 dark:text-white font-bold">{selectedTicket.ticket_type}</p>
                    </div>
                    <div>
                      <label className="text-xs text-green-600 dark:text-green-400 font-medium">Quantidade</label>
                      <p className="text-gray-900 dark:text-white font-bold">{selectedTicket.quantity}</p>
                    </div>
                    <div>
                      <label className="text-xs text-green-600 dark:text-green-400 font-medium">Preço Unitário</label>
                      <p className="text-gray-900 dark:text-white font-bold">{formatCurrency(selectedTicket.price)}</p>
                    </div>
                    <div>
                      <label className="text-xs text-green-600 dark:text-green-400 font-medium">Total</label>
                      <p className="text-gray-900 dark:text-white font-bold text-lg">{formatCurrency(selectedTicket.total_amount)}</p>
                    </div>
                  </div>
                </div>

                {/* Informações de Pagamento */}
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                  <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-3">💳 PAGAMENTO</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-orange-600 dark:text-orange-400 font-medium">Método</label>
                      <p className="text-gray-900 dark:text-white font-bold">{selectedTicket.payment_method}</p>
                    </div>
                    <div>
                      <label className="text-xs text-orange-600 dark:text-orange-400 font-medium">Data da Compra</label>
                      <p className="text-gray-900 dark:text-white">{formatDate(selectedTicket.purchase_date)}</p>
                    </div>
                    {selectedTicket.used_at && (
                      <div>
                        <label className="text-xs text-orange-600 dark:text-orange-400 font-medium">Data de Uso</label>
                        <p className="text-gray-900 dark:text-white">{formatDate(selectedTicket.used_at)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Organizador */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">🏢 ORGANIZADOR</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Nome</label>
                      <p className="text-gray-900 dark:text-white font-bold">{selectedTicket.organizer_name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Email</label>
                      <p className="text-gray-900 dark:text-white">{selectedTicket.organizer_email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de QR Code */}
      {showQRModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">QR Code do Ingresso</h3>
                <button 
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* QR Code Display */}
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 flex flex-col items-center">
                  <div className="bg-gray-100 p-4 rounded-lg mb-4">
                    <QrCode className="w-32 h-32 text-gray-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">Código do Ingresso</p>
                    <p className="text-2xl font-mono font-bold text-gray-900 bg-gray-100 px-4 py-2 rounded">
                      {selectedTicket.qr_code || 'Não disponível'}
                    </p>
                  </div>
                </div>

                {/* Informações Rápidas */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Evento:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedTicket.event_title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Comprador:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedTicket.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`font-semibold ${
                        selectedTicket.status === 'active' ? 'text-green-600' :
                        selectedTicket.status === 'used' ? 'text-blue-600' :
                        'text-red-600'
                      }`}>
                        {selectedTicket.status === 'active' ? 'Ativo' :
                         selectedTicket.status === 'used' ? 'Usado' :
                         selectedTicket.status === 'cancelled' ? 'Cancelado' :
                         selectedTicket.status === 'expired' ? 'Expirado' :
                         'Pendente'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowQRModal(false)}
                className="w-full mt-6 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Cancelamento */}
      {showCancelModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cancelar Ingresso</h3>
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  disabled={actionLoading}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">⚠️</div>
                    <div>
                      <p className="text-red-800 dark:text-red-200 font-semibold mb-2">
                        Atenção! Esta ação não pode ser desfeita.
                      </p>
                      <p className="text-red-700 dark:text-red-300 text-sm">
                        O ingresso será cancelado e não poderá mais ser utilizado.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Evento:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedTicket.event_title}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Comprador:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedTicket.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Valor:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(selectedTicket.total_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
                  disabled={actionLoading}
                >
                  Voltar
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    'Confirmar Cancelamento'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Reembolso */}
      {showRefundModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Processar Reembolso</h3>
                <button 
                  onClick={() => setShowRefundModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  disabled={actionLoading}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">💰</div>
                    <div>
                      <p className="text-green-800 dark:text-green-200 font-semibold mb-2">
                        Reembolso do Ingresso
                      </p>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        O valor será devolvido ao comprador e o ingresso será cancelado.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Evento:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedTicket.event_title}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Comprador:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedTicket.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Valor a Reembolsar:</span>
                    <span className="font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(selectedTicket.total_amount)}</span>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                  <p className="text-yellow-800 dark:text-yellow-200 text-xs">
                    ⚠️ Esta ação marcará o pedido como reembolsado. O processamento financeiro deve ser feito manualmente através do gateway de pagamento.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
                  disabled={actionLoading}
                >
                  Voltar
                </button>
                <button
                  onClick={handleRefund}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Reembolso'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}