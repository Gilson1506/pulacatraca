import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Download, RefreshCw, Calendar, Loader2, TrendingUp, Eye, BarChart3, Shield, CreditCard, Wallet, Ticket, FileText, PieChart, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

interface AnalyticsSummary {
  totalUsers: { value: number; change: number };
  totalRevenue: { value: number; change: number };
  ticketsSold: { value: number; change: number };
  conversionRate: { value: number; change: number };
  totalCommission: { value: number; change: number };
  totalEvents: { value: number; change: number };
  activeEvents: { value: number; change: number };
  totalOrganizers: { value: number; change: number };
  totalBankAccounts: { value: number; change: number };
  totalWithdrawals: { value: number; change: number };
  pendingWithdrawals: { value: number; change: number };
}

interface UserGrowth {
  month: string;
  users: number;
  growth: number;
}

interface EventCategory {
  category: string;
  events: number;
  percentage: number;
}

interface TopEvent {
  name: string;
  tickets: number;
  revenue: number;
  conversion: number;
}

interface MonthData {
  month: string;
  users: number;
  growth: number;
}

interface FinancialData {
  month: string;
  revenue: number;
  tickets: number;
  commission: number;
}

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('users');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalUsers: { value: 0, change: 0 },
    totalRevenue: { value: 0, change: 0 },
    ticketsSold: { value: 0, change: 0 },
    conversionRate: { value: 0, change: 0 },
    totalCommission: { value: 0, change: 0 },
    totalEvents: { value: 0, change: 0 },
    activeEvents: { value: 0, change: 0 },
    totalOrganizers: { value: 0, change: 0 },
    totalBankAccounts: { value: 0, change: 0 },
    totalWithdrawals: { value: 0, change: 0 },
    pendingWithdrawals: { value: 0, change: 0 }
  });
  const [userGrowth, setUserGrowth] = useState<UserGrowth[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Buscando dados de analytics...');

      // Calcular datas para o período selecionado
      const endDate = new Date();
      const startDate = new Date();
      switch (selectedPeriod) {
        case '1month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // 1. Buscar total de usuários
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) console.log('⚠️ Erro ao buscar usuários:', usersError);

      // 2. Buscar total de usuários do período anterior para calcular crescimento
      const { count: previousUsers, error: prevUsersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', startDate.toISOString());

      if (prevUsersError) console.log('⚠️ Erro ao buscar usuários anteriores:', prevUsersError);

      // 3. Buscar transações para calcular receita
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (txError) console.log('⚠️ Erro ao buscar transações:', txError);

      const { data: previousTransactions, error: prevTxError } = await supabase
        .from('transactions')
        .select('*')
        .lt('created_at', startDate.toISOString());

      if (prevTxError) console.log('⚠️ Erro ao buscar transações anteriores:', prevTxError);

      // 4. Buscar eventos
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (eventsError) console.log('⚠️ Erro ao buscar eventos:', eventsError);

      const { data: previousEvents, error: prevEventsError } = await supabase
        .from('events')
        .select('*')
        .lt('created_at', startDate.toISOString());

      if (prevEventsError) console.log('⚠️ Erro ao buscar eventos anteriores:', prevEventsError);

      // 5. Buscar tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (ticketsError) console.log('⚠️ Erro ao buscar tickets:', ticketsError);

      const { data: previousTickets, error: prevTicketsError } = await supabase
        .from('tickets')
        .select('*')
        .lt('created_at', startDate.toISOString());

      if (prevTicketsError) console.log('⚠️ Erro ao buscar tickets anteriores:', prevTicketsError);

      // 6. Buscar contas bancárias
      const { data: bankAccounts, error: baError } = await supabase
        .from('bank_accounts')
        .select('*');

      if (baError) console.log('⚠️ Erro ao buscar contas bancárias:', baError);

      // 7. Buscar saques
      const { data: withdrawals, error: wError } = await supabase
        .from('withdrawals')
        .select('*');

      if (wError) console.log('⚠️ Erro ao buscar saques:', wError);

      // 8. Calcular métricas
      const totalRevenue = transactions ? 
        transactions
          .filter(tx => tx.status === 'completed' || tx.status === 'concluido')
          .reduce((acc, tx) => acc + (tx.amount || 0), 0) : 0;

      const previousRevenue = previousTransactions ? 
        previousTransactions
          .filter(tx => tx.status === 'completed' || tx.status === 'concluido')
          .reduce((acc, tx) => acc + (tx.amount || 0), 0) : 0;

      const revenueChange = previousRevenue > 0 ? 
        ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      const totalCommission = totalRevenue * 0.1; // 10% de comissão

      const totalEvents = events?.length || 0;
      const previousTotalEvents = previousEvents?.length || 0;
      const eventsChange = previousTotalEvents > 0 ? 
        ((totalEvents - previousTotalEvents) / previousTotalEvents) * 100 : 0;

      const activeEvents = events?.filter(e => e.status === 'active').length || 0;
      const previousActiveEvents = previousEvents?.filter(e => e.status === 'active').length || 0;
      const activeEventsChange = previousActiveEvents > 0 ? 
        ((activeEvents - previousActiveEvents) / previousActiveEvents) * 100 : 0;

      const ticketsSold = tickets?.filter(t => t.status === 'active' || t.status === 'used').length || 0;
      const previousTicketsSold = previousTickets?.filter(t => t.status === 'active' || t.status === 'used').length || 0;
      const ticketsChange = previousTicketsSold > 0 ? 
        ((ticketsSold - previousTicketsSold) / previousTicketsSold) * 100 : 0;

      const totalTicketsAvailable = events?.reduce((acc, e) => acc + (e.max_tickets || 0), 0) || 0;
      const conversionRate = totalTicketsAvailable > 0 ? (ticketsSold / totalTicketsAvailable) * 100 : 0;

      // 9. Calcular organizadores únicos
      const uniqueOrganizers = new Set([
        ...(events || []).map(e => e.organizer_id),
        ...(bankAccounts || []).map(ba => ba.organizer_id),
        ...(withdrawals || []).map(w => w.organizer_id)
      ]).size;

      const previousUniqueOrganizers = new Set([
        ...(previousEvents || []).map(e => e.organizer_id),
        ...(bankAccounts || []).map(ba => ba.organizer_id),
        ...(withdrawals || []).map(w => w.organizer_id)
      ]).size;

      const organizersChange = previousUniqueOrganizers > 0 ? 
        ((uniqueOrganizers - previousUniqueOrganizers) / previousUniqueOrganizers) * 100 : 0;

      // 10. Calcular métricas de saques
      const totalWithdrawals = withdrawals?.filter(w => w.status === 'concluido').length || 0;
      const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pendente').length || 0;

      // 11. Gerar dados mensais para gráficos
      const monthlyData = generateMonthlyData(startDate, endDate, transactions, tickets, events);

      console.log('📊 Dados de analytics calculados:', {
        totalUsers,
        totalRevenue,
        revenueChange,
        totalEvents,
        eventsChange,
        ticketsSold,
        ticketsChange,
        conversionRate,
        uniqueOrganizers,
        organizersChange
      });

      setSummary({
        totalUsers: { 
          value: totalUsers || 0, 
          change: previousUsers ? ((totalUsers || 0) - previousUsers) / previousUsers * 100 : 0 
        },
        totalRevenue: { value: totalRevenue, change: revenueChange },
        ticketsSold: { value: ticketsSold, change: ticketsChange },
        conversionRate: { value: conversionRate, change: 0 },
        totalCommission: { value: totalCommission, change: revenueChange },
        totalEvents: { value: totalEvents, change: eventsChange },
        activeEvents: { value: activeEvents, change: activeEventsChange },
        totalOrganizers: { value: uniqueOrganizers, change: organizersChange },
        totalBankAccounts: { value: bankAccounts?.length || 0, change: 0 },
        totalWithdrawals: { value: totalWithdrawals, change: 0 },
        pendingWithdrawals: { value: pendingWithdrawals, change: 0 }
      });

      setFinancialData(monthlyData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Erro ao buscar dados de analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMonthlyData = (startDate: Date, endDate: Date, transactions: any[] | null, tickets: any[] | null, events: any[] | null) => {
    const months = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const monthKey = current.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      const monthTransactions = transactions?.filter(tx => {
        const txDate = new Date(tx.created_at);
        return txDate.getMonth() === current.getMonth() && txDate.getFullYear() === current.getFullYear();
      }) || [];

      const monthTickets = tickets?.filter(ticket => {
        const ticketDate = new Date(ticket.created_at);
        return ticketDate.getMonth() === current.getMonth() && ticketDate.getFullYear() === current.getFullYear();
      }) || [];

      const monthEvents = events?.filter(event => {
        const eventDate = new Date(event.created_at);
        return eventDate.getMonth() === current.getMonth() && eventDate.getFullYear() === current.getFullYear();
      }) || [];

      const monthRevenue = monthTransactions
        .filter(tx => tx.status === 'completed' || tx.status === 'concluido')
        .reduce((acc, tx) => acc + (tx.amount || 0), 0);

      months.push({
        month: monthKey,
        revenue: monthRevenue,
        tickets: monthTickets.length,
        commission: monthRevenue * 0.1
      });

      current.setMonth(current.getMonth() + 1);
    }

    return months;
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Cabeçalho
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 220, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('RELATÓRIO COMPLETO', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Período: ${selectedPeriod} • Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 28);
      
      // Resetar cor do texto
      doc.setTextColor(0, 0, 0);
      
      // Resumo Executivo
      doc.setFontSize(18);
      doc.text('Resumo Executivo', 20, 45);
      
      doc.setFontSize(12);
      let yPosition = 55;
      
      doc.text(`• Total de Usuários: ${summary.totalUsers.value.toLocaleString('pt-BR')}`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Receita Total: R$ ${summary.totalRevenue.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Total de Eventos: ${summary.totalEvents.value}`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Ingressos Vendidos: ${summary.ticketsSold.value}`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Taxa de Conversão: ${summary.conversionRate.value.toFixed(1)}%`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Total de Organizadores: ${summary.totalOrganizers.value}`, 20, yPosition);
      
      // Métricas Financeiras
      yPosition += 15;
      doc.setFontSize(16);
      doc.text('Métricas Financeiras', 20, yPosition);
      
      yPosition += 10;
      doc.setFontSize(12);
      doc.text(`• Receita Total: R$ ${summary.totalRevenue.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Total de Comissões: R$ ${summary.totalCommission.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Total de Saques: ${summary.totalWithdrawals.value}`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Saques Pendentes: ${summary.pendingWithdrawals.value}`, 20, yPosition);
      
      // Dados Mensais
      yPosition += 15;
      doc.setFontSize(16);
      doc.text('Dados Mensais', 20, yPosition);
      
      if (financialData.length > 0) {
        yPosition += 10;
        
        const tableData = financialData.map(data => [
          data.month,
          `R$ ${data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          data.tickets.toString(),
          `R$ ${data.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);
        
        autoTable(doc, {
          head: [['Mês', 'Receita', 'Tickets', 'Comissões']],
          body: tableData,
          startY: yPosition,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 20 }
        });
      }
      
      // Eventos Principais
      if (topEvents.length > 0) {
        doc.addPage();
        doc.setFontSize(18);
        doc.text('Eventos Principais', 20, 20);
        
        const eventTableData = topEvents.map(event => [
          event.name,
          event.tickets.toString(),
          `R$ ${event.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `${event.conversion.toFixed(1)}%`
        ]);
        
        autoTable(doc, {
          head: [['Evento', 'Tickets', 'Receita', 'Conversão']],
          body: eventTableData,
          startY: 30,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 20 }
        });
      }
      
      doc.save(`relatorio-completo-${selectedPeriod}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
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
          <p className="text-gray-600 dark:text-gray-400">Carregando dados de analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Relatórios e Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Análise completa da plataforma PULACATRACA • 
            Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAnalyticsData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isExporting ? 'Exportando...' : 'Exportar PDF'}</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Período
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="1month">Último Mês</option>
              <option value="3months">Últimos 3 Meses</option>
              <option value="6months">Últimos 6 Meses</option>
              <option value="1year">Último Ano</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Métrica Principal
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="users">Usuários</option>
              <option value="revenue">Receita</option>
              <option value="events">Eventos</option>
              <option value="tickets">Ingressos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total de Usuários</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(summary.totalUsers.value)}
              </p>
              <p className={`text-sm font-medium ${summary.totalUsers.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(summary.totalUsers.change)}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(summary.totalRevenue.value)}
              </p>
              <p className={`text-sm font-medium ${summary.totalRevenue.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(summary.totalRevenue.change)}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total de Eventos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(summary.totalEvents.value)}
              </p>
              <p className={`text-sm font-medium ${summary.totalEvents.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(summary.totalEvents.change)}
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ingressos Vendidos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(summary.ticketsSold.value)}
              </p>
              <p className={`text-sm font-medium ${summary.ticketsSold.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(summary.ticketsSold.change)}
              </p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl">
              <Ticket className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards Secundários */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Taxa de Conversão</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.conversionRate.value.toFixed(1)}%
              </p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
              <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total de Comissões</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(summary.totalCommission.value)}
              </p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Organizadores</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(summary.totalOrganizers.value)}
              </p>
              <p className={`text-sm font-medium ${summary.totalOrganizers.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(summary.totalOrganizers.change)}
              </p>
            </div>
            <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded-xl">
              <Users className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Contas Bancárias</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(summary.totalBankAccounts.value)}
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl">
              <CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos e Dados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dados Mensais</h3>
          {financialData.length > 0 ? (
            <div className="space-y-3">
              {financialData.map((data, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="font-medium text-gray-900 dark:text-white">{data.month}</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-green-600">{formatCurrency(data.revenue)}</span>
                    <span className="text-blue-600">{data.tickets} tickets</span>
                    <span className="text-purple-600">{formatCurrency(data.commission)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhum dado disponível</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumo Financeiro</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Receita Total</span>
              <span className="font-semibold text-green-600">{formatCurrency(summary.totalRevenue.value)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total de Comissões</span>
              <span className="font-semibold text-blue-600">{formatCurrency(summary.totalCommission.value)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total de Saques</span>
              <span className="font-semibold text-purple-600">{summary.totalWithdrawals.value}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Saques Pendentes</span>
              <span className="font-semibold text-orange-600">{summary.pendingWithdrawals.value}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Informações Adicionais */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informações do Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-3">
              <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Eventos Ativos</p>
            <p className="text-2xl font-bold text-blue-600">{summary.activeEvents.value}</p>
            <p className={`text-sm font-medium ${summary.activeEvents.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(summary.activeEvents.change)}
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl mb-3">
              <PieChart className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Taxa de Conversão</p>
            <p className="text-2xl font-bold text-green-600">{summary.conversionRate.value.toFixed(1)}%</p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl mb-3">
              <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Relatórios</p>
            <p className="text-2xl font-bold text-purple-600">4</p>
            <p className="text-sm text-gray-500">Disponíveis</p>
          </div>
        </div>
      </div>
    </div>
  );
}