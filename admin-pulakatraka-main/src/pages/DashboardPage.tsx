import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, DollarSign, Ticket, TrendingUp, AlertTriangle, CreditCard, Wallet, BarChart3, RefreshCw, ShoppingCart, CheckCircle, ArrowRightLeft, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import StatsCard from '../components/Dashboard/StatsCard';
import RecentActivity from '../components/Dashboard/RecentActivity';
import QuickActions from '../components/Dashboard/QuickActions';
import SalesChart from '../components/Dashboard/SalesChart';

interface DashboardStats {
  totalUsers: number;
  activeEvents: number;
  pendingEvents: number;
  totalRevenue: number;
  revenueChange: number;
  ticketsSold: number;
  ticketsChange: number;
  conversionRate: number;
  conversionChange: number;
  supportTickets: number;
  pendingTickets: number;
  totalOrganizers: number;
  totalBankAccounts: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  monthlyRevenue: number;
  monthlyGrowth: number;
  // Novas métricas com orders, checkin, transfers, activities
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  canceledOrders: number;
  averageOrderValue: number;
  totalCheckins: number;
  checkinRate: number;
  totalTransfers: number;
  recentActivities: number;
}

export default function DashboardPageImproved() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeEvents: 0,
    pendingEvents: 0,
    totalRevenue: 0,
    revenueChange: 0,
    ticketsSold: 0,
    ticketsChange: 0,
    conversionRate: 0,
    conversionChange: 0,
    supportTickets: 0,
    pendingTickets: 0,
    totalOrganizers: 0,
    totalBankAccounts: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    monthlyRevenue: 0,
    monthlyGrowth: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    canceledOrders: 0,
    averageOrderValue: 0,
    totalCheckins: 0,
    checkinRate: 0,
    totalTransfers: 0,
    recentActivities: 0
  });

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Buscando dados completos do dashboard...');

      // 1. Buscar perfis de usuários
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) console.log('⚠️ Erro ao buscar usuários:', usersError);

      // 2. Buscar eventos com dados completos
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id, 
          title, 
          status, 
          created_at, 
          organizer_id,
          price,
          total_tickets
        `);

      if (eventsError) console.log('⚠️ Erro ao buscar eventos:', eventsError);

      const activeEvents = (events || []).filter(e => ['active','approved','published'].includes(String(e.status))).length || 0;
      const pendingEvents = (events || []).filter(e => ['pending','awaiting_approval','draft'].includes(String(e.status))).length || 0;

      // 3. ✅ BUSCAR ORDERS (fonte principal de receita)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_id,
          customer_name,
          customer_email,
          total_amount,
          payment_method,
          payment_status,
          created_at,
          paid_at,
          canceled_at
        `);

      if (ordersError) {
        console.log('⚠️ Erro ao buscar orders:', ordersError);
      } else {
        console.log('✅ Orders encontrados:', orders?.length || 0);
      }

      // 3.1 ✅ Buscar ORDER_ITEMS para detalhes dos itens
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          item_type,
          item_id,
          description,
          quantity,
          unit_amount,
          total_amount,
          created_at
        `);

      if (orderItemsError) {
        console.log('⚠️ Erro ao buscar order_items:', orderItemsError);
      } else {
        console.log('✅ Order items encontrados:', orderItems?.length || 0);
      }

      // 3.2 ✅ Buscar PAYMENT_HISTORY para histórico de pagamentos
      const { data: paymentHistory, error: paymentHistoryError } = await supabase
        .from('payment_history')
        .select(`
          id,
          order_id,
          old_status,
          new_status,
          change_reason,
          created_at
        `);

      if (paymentHistoryError) {
        console.log('⚠️ Erro ao buscar payment_history:', paymentHistoryError);
      } else {
        console.log('✅ Payment history encontrado:', paymentHistory?.length || 0);
      }

      // 4. Buscar tickets para contagem
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, price, created_at, status');

      if (ticketsError) console.log('⚠️ Erro ao buscar tickets:', ticketsError);

      // 5. Buscar contas bancárias
      const { data: bankAccounts, error: baError } = await supabase
        .from('bank_accounts')
        .select('*');

      if (baError) console.log('⚠️ Erro ao buscar contas bancárias:', baError);

      // 6. Buscar saques
      const { data: withdrawals, error: wError } = await supabase
        .from('withdrawals')
        .select('*');

      if (wError) console.log('⚠️ Erro ao buscar saques:', wError);

      // 7. ✅ Buscar CHECKIN para taxa de comparecimento
      const { data: checkins, error: checkinError } = await supabase
        .from('checkin')
        .select(`
          id,
          ticket_user_id,
          event_id,
          organizer_id,
          created_at
        `);

      if (checkinError) {
        console.log('⚠️ Erro ao buscar checkins:', checkinError);
      } else {
        console.log('✅ Checkins encontrados:', checkins?.length || 0);
      }

      // 7.1 ✅ Buscar TICKET_TRANSFERS para transferências
      const { data: ticketTransfers, error: transfersError } = await supabase
        .from('ticket_transfers')
        .select(`
          id,
          ticket_id,
          from_user_id,
          to_user_id,
          transferred_at,
          transfer_reason,
          status
        `);

      if (transfersError) {
        console.log('⚠️ Erro ao buscar ticket_transfers:', transfersError);
      } else {
        console.log('✅ Ticket transfers encontrados:', ticketTransfers?.length || 0);
      }

      // 7.2 ✅ Buscar ACTIVITIES para atividades recentes
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          id,
          user_id,
          action,
          description,
          entity_type,
          entity_id,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (activitiesError) {
        console.log('⚠️ Erro ao buscar activities:', activitiesError);
      } else {
        console.log('✅ Activities encontradas:', activities?.length || 0);
      }

      // 7.3 Buscar tickets de suporte
      const { data: supportTickets, error: stError } = await supabase
        .from('support_tickets')
        .select('id, status');

      if (stError) console.log('⚠️ Erro ao buscar tickets de suporte:', stError);

      // 8. ✅ Calcular métricas financeiras USANDO ORDERS (fonte principal)
      const totalRevenue = orders ? 
        orders
          .filter(order => order.payment_status === 'paid' || order.payment_status === 'completed')
          .reduce((acc, order) => acc + (parseFloat(order.total_amount) || 0), 0) : 0;

      // 8.1 ✅ Calcular métricas de ORDERS
      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.payment_status === 'pending').length || 0;
      const completedOrders = orders?.filter(o => o.payment_status === 'paid' || o.payment_status === 'completed').length || 0;
      const canceledOrders = orders?.filter(o => o.canceled_at !== null).length || 0;
      const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

      // 9. Calcular receita mensal e crescimento
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const monthlyRevenue = orders ? 
        orders
          .filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= currentMonth && (order.payment_status === 'paid' || order.payment_status === 'completed');
          })
          .reduce((acc, order) => acc + (parseFloat(order.total_amount) || 0), 0) : 0;

      const previousMonthRevenue = orders ? 
        orders
          .filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= previousMonth && orderDate < currentMonth && (order.payment_status === 'paid' || order.payment_status === 'completed');
          })
          .reduce((acc, order) => acc + (parseFloat(order.total_amount) || 0), 0) : 0;

      const monthlyGrowth = previousMonthRevenue > 0 ? 
        ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;

      // 10. Calcular organizadores únicos
      const uniqueOrganizers = new Set([
        ...(events || []).map(e => e.organizer_id),
        ...(bankAccounts || []).map(ba => ba.organizer_id),
        ...(withdrawals || []).map(w => w.organizer_id)
      ]).size;

      // 11. Calcular tickets vendidos e conversão
      const ticketsSold = tickets?.filter(t => t.status === 'active' || t.status === 'used').length || 0;
      const totalTicketsAvailable = events?.reduce((acc, e) => acc + (e.total_tickets || 0), 0) || 0;
      const conversionRate = totalTicketsAvailable > 0 ? (ticketsSold / totalTicketsAvailable) * 100 : 0;

      // 12. Calcular mudanças percentuais
      const revenueChange = monthlyGrowth;
      const ticketsChange = 0; // Implementar lógica de comparação de tickets

      // 13. Calcular métricas de suporte
      const totalSupportTickets = supportTickets?.length || 0;
      const pendingSupportTickets = supportTickets?.filter(t => t.status === 'pending').length || 0;

      // 14. Calcular métricas de saques
      const totalWithdrawals = withdrawals?.filter(w => w.status === 'concluido').length || 0;
      const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pendente').length || 0;

      // 15. ✅ Calcular métricas de CHECKIN
      const totalCheckins = checkins?.length || 0;
      const checkinRate = ticketsSold > 0 ? (totalCheckins / ticketsSold) * 100 : 0;

      // 16. ✅ Calcular métricas de TRANSFERS
      const totalTransfers = ticketTransfers?.filter(t => t.status === 'completed').length || 0;

      // 17. ✅ Calcular atividades recentes (últimas 24h)
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentActivities = activities?.filter(a => new Date(a.created_at) >= last24h).length || 0;

      console.log('📊 Dados calculados:', {
        totalUsers,
        activeEvents,
        pendingEvents,
        totalRevenue,
        monthlyRevenue,
        monthlyGrowth,
        ticketsSold,
        conversionRate,
        uniqueOrganizers,
        totalBankAccounts: bankAccounts?.length || 0,
        totalWithdrawals,
        pendingWithdrawals,
        // Novas métricas
        totalOrders,
        pendingOrders,
        completedOrders,
        canceledOrders,
        averageOrderValue,
        totalCheckins,
        checkinRate,
        totalTransfers,
        recentActivities
      });

      setStats({
        totalUsers: totalUsers || 0,
        activeEvents,
        pendingEvents,
        totalRevenue,
        revenueChange,
        ticketsSold,
        ticketsChange,
        conversionRate: Math.round(conversionRate * 100) / 100,
        conversionChange: 0,
        supportTickets: totalSupportTickets,
        pendingTickets: pendingSupportTickets,
        totalOrganizers: uniqueOrganizers,
        totalBankAccounts: bankAccounts?.length || 0,
        totalWithdrawals,
        pendingWithdrawals,
        monthlyRevenue,
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
        // Novas métricas
        totalOrders,
        pendingOrders,
        completedOrders,
        canceledOrders,
        averageOrderValue,
        totalCheckins,
        checkinRate: Math.round(checkinRate * 100) / 100,
        totalTransfers,
        recentActivities
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      setStats({
        totalUsers: 0,
        activeEvents: 0,
        pendingEvents: 0,
        totalRevenue: 0,
        revenueChange: 0,
        ticketsSold: 0,
        ticketsChange: 0,
        conversionRate: 0,
        conversionChange: 0,
        supportTickets: 0,
        pendingTickets: 0,
        totalOrganizers: 0,
        totalBankAccounts: 0,
        totalWithdrawals: 0,
        pendingWithdrawals: 0,
        monthlyRevenue: 0,
        monthlyGrowth: 0,
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        canceledOrders: 0,
        averageOrderValue: 0,
        totalCheckins: 0,
        checkinRate: 0,
        totalTransfers: 0,
        recentActivities: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create-user':
        navigate('/usuarios');
        break;
      case 'approve-event':
        navigate('/eventos');
        break;
      case 'open-chat':
        navigate('/chat');
        break;
      case 'generate-report':
        navigate('/analytics');
        break;
      case 'open-settings':
        navigate('/configuracoes');
        break;
      case 'view-financials':
        navigate('/financeiro');
        break;
      case 'view-tickets':
        navigate('/ingressos');
        break;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando estatísticas completas...</p>
        </div>
      </div>
    );
  }

  const hasData = stats.totalUsers > 0 || stats.totalRevenue > 0 || stats.activeEvents > 0;

  if (!hasData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Melhorado</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Visão geral completa da plataforma PULACATRACA
            </p>
          </div>
          <button
            onClick={fetchDashboardStats}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Nenhum dado disponível
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Não foi possível carregar os dados do dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Melhorado ✨</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Visão completa com Orders, Check-ins, Transferências e Atividades • 
            Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardStats}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar</span>
          </button>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Sistema Online</span>
          </div>
        </div>
      </div>

      {/* Stats Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatsCard
          title="Total de Usuários"
          value={formatNumber(stats.totalUsers)}
          change={null}
          changeType="neutral"
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Eventos Ativos"
          value={formatNumber(stats.activeEvents)}
          change={`${stats.pendingEvents} pendentes`}
          changeType="neutral"
          icon={Calendar}
          color="green"
        />
        <StatsCard
          title="Receita Total"
          value={formatCurrency(stats.totalRevenue)}
          change={formatPercentage(stats.revenueChange)}
          changeType={stats.revenueChange >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
          color="purple"
        />
        <StatsCard
          title="Ingressos Vendidos"
          value={formatNumber(stats.ticketsSold)}
          change={`${stats.conversionRate.toFixed(1)}% conversão`}
          changeType="neutral"
          icon={Ticket}
          color="orange"
        />
      </div>

      {/* ✨ NOVOS Stats Cards - Orders, Check-ins, Transfers, Activities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatsCard
          title="Total de Pedidos"
          value={formatNumber(stats.totalOrders)}
          change={`${stats.pendingOrders} pendentes`}
          changeType="neutral"
          icon={ShoppingCart}
          color="indigo"
        />
        <StatsCard
          title="Ticket Médio"
          value={formatCurrency(stats.averageOrderValue)}
          change={`${stats.completedOrders} pedidos`}
          changeType="positive"
          icon={TrendingUp}
          color="emerald"
        />
        <StatsCard
          title="Taxa de Check-in"
          value={`${stats.checkinRate.toFixed(1)}%`}
          change={`${stats.totalCheckins} check-ins`}
          changeType="neutral"
          icon={CheckCircle}
          color="cyan"
        />
        <StatsCard
          title="Transferências"
          value={formatNumber(stats.totalTransfers)}
          change="Ingressos transferidos"
          changeType="neutral"
          icon={ArrowRightLeft}
          color="pink"
        />
      </div>

      {/* Stats Cards Secundários */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatsCard
          title="Receita Mensal"
          value={formatCurrency(stats.monthlyRevenue)}
          change={formatPercentage(stats.monthlyGrowth)}
          changeType={stats.monthlyGrowth >= 0 ? 'positive' : 'negative'}
          icon={TrendingUp}
          color="emerald"
        />
        <StatsCard
          title="Organizadores"
          value={formatNumber(stats.totalOrganizers)}
          change={`${stats.totalBankAccounts} contas`}
          changeType="neutral"
          icon={Users}
          color="indigo"
        />
        <StatsCard
          title="Contas Bancárias"
          value={formatNumber(stats.totalBankAccounts)}
          change={`${stats.pendingWithdrawals} saques pendentes`}
          changeType="neutral"
          icon={CreditCard}
          color="cyan"
        />
        <StatsCard
          title="Atividades (24h)"
          value={formatNumber(stats.recentActivities)}
          change="Últimas 24 horas"
          changeType="neutral"
          icon={Activity}
          color="amber"
        />
      </div>

      {/* Quick Actions */}
      <QuickActions onAction={handleQuickAction} />

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart />
        <RecentActivity />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Pedidos</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-green-600 font-medium">{stats.completedOrders} pagos</p>
                <p className="text-sm text-yellow-600 font-medium">{stats.pendingOrders} pendentes</p>
                <p className="text-sm text-red-600 font-medium">{stats.canceledOrders} cancelados</p>
              </div>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl">
              <ShoppingCart className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Check-ins</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCheckins}</p>
              <p className="text-sm text-cyan-600 font-medium">
                {stats.checkinRate.toFixed(1)}% dos ingressos
              </p>
            </div>
            <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-xl">
              <CheckCircle className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Transferências</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalTransfers}</p>
              <p className="text-sm text-pink-600 font-medium">Ingressos transferidos</p>
            </div>
            <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-xl">
              <ArrowRightLeft className="w-8 h-8 text-pink-600 dark:text-pink-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Visão Geral Financeira</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Receita Total</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Receita Mensal</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.monthlyRevenue)}</p>
            <p className={`text-sm font-medium ${stats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(stats.monthlyGrowth)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ticket Médio</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.averageOrderValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Saques</p>
            <p className="text-2xl font-bold text-orange-600">{formatNumber(stats.totalWithdrawals)}</p>
            <p className="text-sm text-orange-600 font-medium">{stats.pendingWithdrawals} pendentes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
