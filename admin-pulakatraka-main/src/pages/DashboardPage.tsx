import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, DollarSign, Ticket, TrendingUp, AlertTriangle, Eye, CreditCard, Wallet, BarChart3, RefreshCw, Loader2 } from 'lucide-react';
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
}

export default function DashboardPage() {
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
    monthlyGrowth: 0
  });

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Buscando dados do dashboard...');

      // 1. Buscar perfis de usuários
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) {
        console.log('⚠️ Erro ao buscar usuários:', usersError);
      }

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
          max_tickets
        `);

      if (eventsError) {
        console.log('⚠️ Erro ao buscar eventos:', eventsError);
      }

      const activeEvents = events?.filter(e => e.status === 'active').length || 0;
      const pendingEvents = events?.filter(e => e.status === 'pending').length || 0;

      // 3. Buscar transações para receita real
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*');

      if (txError) {
        console.log('⚠️ Erro ao buscar transações:', txError);
      }

      // 4. Buscar tickets para contagem
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, price, created_at, status');

      if (ticketsError) {
        console.log('⚠️ Erro ao buscar tickets:', ticketsError);
      }

      // 5. Buscar contas bancárias
      const { data: bankAccounts, error: baError } = await supabase
        .from('bank_accounts')
        .select('*');

      if (baError) {
        console.log('⚠️ Erro ao buscar contas bancárias:', baError);
      }

      // 6. Buscar saques
      const { data: withdrawals, error: wError } = await supabase
        .from('withdrawals')
        .select('*');

      if (wError) {
        console.log('⚠️ Erro ao buscar saques:', wError);
      }

      // 7. Buscar tickets de suporte
      const { data: supportTickets, error: stError } = await supabase
        .from('support_tickets')
        .select('id, status');

      if (stError) {
        console.log('⚠️ Erro ao buscar tickets de suporte:', stError);
      }

      // 8. Calcular métricas financeiras
      const totalRevenue = transactions ? 
        transactions
          .filter(tx => tx.status === 'completed' || tx.status === 'concluido')
          .reduce((acc, tx) => acc + (tx.amount || 0), 0) : 0;

      // 9. Calcular receita mensal e crescimento
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const monthlyRevenue = transactions ? 
        transactions
          .filter(tx => {
            const txDate = new Date(tx.created_at);
            return txDate >= currentMonth && (tx.status === 'completed' || tx.status === 'concluido');
          })
          .reduce((acc, tx) => acc + (tx.amount || 0), 0) : 0;

      const previousMonthRevenue = transactions ? 
        transactions
          .filter(tx => {
            const txDate = new Date(tx.created_at);
            return txDate >= previousMonth && txDate < currentMonth && (tx.status === 'completed' || tx.status === 'concluido');
          })
          .reduce((acc, tx) => acc + (tx.amount || 0), 0) : 0;

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
      const totalTicketsAvailable = events?.reduce((acc, e) => acc + (e.max_tickets || 0), 0) || 0;
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
        pendingWithdrawals
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
        conversionChange: 0, // Implementar lógica de comparação
        supportTickets: totalSupportTickets,
        pendingTickets: pendingSupportTickets,
        totalOrganizers: uniqueOrganizers,
        totalBankAccounts: bankAccounts?.length || 0,
        totalWithdrawals,
        pendingWithdrawals,
        monthlyRevenue,
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      // Definir valores padrão em caso de erro
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
        monthlyGrowth: 0
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
          <p className="text-gray-600 dark:text-gray-400">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  // Verificar se há dados para exibir
  const hasData = stats.totalUsers > 0 || stats.totalRevenue > 0 || stats.activeEvents > 0;

  if (!hasData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Visão geral da plataforma PULACATRACA
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchDashboardStats}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar Novamente</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Nenhum dado disponível
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Não foi possível carregar os dados do dashboard. Isso pode acontecer se:
          </p>
          <ul className="text-left text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6 space-y-2">
            <li>• As tabelas do banco de dados ainda não foram criadas</li>
            <li>• Não há dados nas tabelas</li>
            <li>• Há um problema de conexão com o banco</li>
            <li>• As políticas de segurança (RLS) estão bloqueando o acesso</li>
          </ul>
          <button
            onClick={fetchDashboardStats}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Tentar Carregar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Visão geral da plataforma PULACATRACA • 
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
          title="Total de Saques"
          value={formatNumber(stats.totalWithdrawals)}
          change={`${stats.pendingWithdrawals} pendentes`}
          changeType="neutral"
          icon={Wallet}
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Taxa de Conversão</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.conversionRate.toFixed(1)}%</p>
              <p className="text-sm text-green-600 font-medium">
                {stats.ticketsSold} ingressos vendidos
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
              <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tickets de Suporte</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.supportTickets}</p>
              <p className="text-sm text-orange-600 font-medium">{stats.pendingTickets} pendentes</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl">
              <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Eventos Pendentes</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.pendingEvents}</p>
              <p className="text-sm text-blue-600 font-medium">Aguardando aprovação</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
              <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Visão Geral Financeira</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Saques</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalWithdrawals)}</p>
            <p className="text-sm text-orange-600 font-medium">{stats.pendingWithdrawals} pendentes</p>
          </div>
        </div>
      </div>
    </div>
  );
}