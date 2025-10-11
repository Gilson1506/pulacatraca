import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Ticket, 
  TrendingUp, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  totalUsers: number;
  activeEvents: number;
  pendingEvents: number;
  totalRevenue: number;
  totalTickets: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalTransfers: number;
  monthlyRevenue: number;
  totalOrganizers: number;
  lastUpdated: Date;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeEvents: 0,
    pendingEvents: 0,
    totalRevenue: 0,
    totalTickets: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalTransfers: 0,
    monthlyRevenue: 0,
    lastUpdated: new Date()
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/admin');
        return;
      }

      await fetchDashboardStats();
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar o dashboard');
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      console.log('🔄 Buscando estatísticas do dashboard admin...');

      // 1. Buscar usuários
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) console.log('⚠️ Erro ao buscar usuários:', usersError);

      // 2. Buscar eventos com contagem correta
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, status, created_at, organizer_id')
        .order('created_at', { ascending: false });

      if (eventsError) console.log('⚠️ Erro ao buscar eventos:', eventsError);

      const activeEvents = events?.filter(e => e.status === 'approved').length || 0;
      const pendingEvents = events?.filter(e => e.status === 'pending').length || 0;
      
      // Calcular organizadores únicos
      const uniqueOrganizers = [...new Set(events?.map(e => e.organizer_id).filter(Boolean))].length || 0;

      // 3. Buscar tickets
      const { count: totalTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      if (ticketsError) console.log('⚠️ Erro ao buscar tickets:', ticketsError);

      // 4. Buscar pedidos (orders)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at');

      if (ordersError) console.log('⚠️ Erro ao buscar pedidos:', ordersError);

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;

      // 5. Calcular receita total
      const totalRevenue = orders
        ?.filter(o => o.status === 'completed' && o.total_amount)
        .reduce((acc, o) => acc + (o.total_amount || 0), 0) || 0;

      // 6. Calcular receita mensal
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const monthlyRevenue = orders
        ?.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= currentMonth && o.status === 'completed' && o.total_amount;
        })
        .reduce((acc, o) => acc + (o.total_amount || 0), 0) || 0;

      // 7. Buscar transferências
      const { count: totalTransfers, error: transfersError } = await supabase
        .from('ticket_transfers')
        .select('*', { count: 'exact', head: true });

      if (transfersError) console.log('⚠️ Erro ao buscar transferências:', transfersError);

          const newStats: DashboardStats = {
            totalUsers: totalUsers || 0,
            activeEvents,
            pendingEvents,
            totalRevenue,
            totalTickets: totalTickets || 0,
            totalOrders,
            pendingOrders,
            completedOrders,
            totalTransfers: totalTransfers || 0,
            monthlyRevenue,
            totalOrganizers: uniqueOrganizers,
            lastUpdated: new Date()
          };

      console.log('✅ Estatísticas atualizadas:', newStats);
      setStats(newStats);

    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Administrativo</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Última atualização: {stats.lastUpdated.toLocaleTimeString('pt-BR')}
            </p>
          </div>
          <button
            onClick={fetchDashboardStats}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Cards de Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Usuários */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Usuários Ativos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Eventos Ativos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Eventos Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeEvents}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.pendingEvents} pendentes • {stats.totalOrganizers} organizadores
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Receita Total */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Receita Total</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(stats.monthlyRevenue)} este mês
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Ingressos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ingressos Vendidos</p>
                <p className="text-2xl font-bold text-orange-600">{stats.totalTickets}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.totalTransfers} transferências
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl">
                <Ticket className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas Secundárias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Pedidos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Pedidos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalOrders}</p>
                <div className="flex space-x-4 mt-2">
                  <span className="text-xs text-green-600">{stats.completedOrders} concluídos</span>
                  <span className="text-xs text-yellow-600">{stats.pendingOrders} pendentes</span>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Taxa de Conversão */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pedidos concluídos
                </p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Atividade Recente */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Atividade</p>
                <p className="text-2xl font-bold text-indigo-600">Ativo</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sistema funcionando
                </p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl">
                <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ações Rápidas</h2>
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/usuarios')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
              >
                Gerenciar Usuários
              </button>
              <button 
                onClick={() => navigate('/eventos')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
              >
                Gerenciar Eventos
              </button>
              <button 
                onClick={() => navigate('/ingressos')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors"
              >
                Ver Ingressos
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Relatórios</h2>
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/analytics')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded transition-colors"
              >
                Ver Analytics
              </button>
              <button 
                onClick={() => navigate('/transferencias')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded transition-colors"
              >
                Transferências
              </button>
              <button 
                onClick={() => navigate('/financeiro')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded transition-colors"
              >
                Financeiro
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status do Sistema</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Banco de Dados</span>
                <span className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">API</span>
                <span className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Funcionando
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Eventos</span>
                <span className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {stats.activeEvents} ativos
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 