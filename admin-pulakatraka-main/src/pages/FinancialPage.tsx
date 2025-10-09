import React, { useState, useEffect } from 'react';
import { Download, Calendar, DollarSign, TrendingUp, Loader2, CreditCard, Wallet, Users, Eye, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';



interface BankAccount {
  id: string;
  organizer_id: string;
  organizer_name: string;
  organizer_email: string;
  bank_name: string;
  agency: string;
  account_number: string;
  account_type: 'corrente' | 'poupanca';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface Withdrawal {
  id: string;
  organizer_id: string;
  organizer_name: string;
  organizer_email: string;
  bank_account_id: string;
  bank_name: string;
  agency: string;
  account_number: string;
  amount: number;
  status: 'pendente' | 'processando' | 'concluido' | 'cancelado';
  created_at: string;
  processed_at?: string;
  notes?: string;
  withdrawal_limit?: number;
  auto_withdrawal_enabled: boolean;
  auto_trigger_type?: string;
  sales_amount_trigger?: number;
  sales_count_trigger?: number;
  time_interval_days?: number;
  last_auto_execution?: string;
  next_scheduled_execution?: string;
}

interface FinancialSummary {
  total_revenue: number;
  total_refunds: number;
  total_commissions: number;
  total_withdrawals: number;
  net_revenue: number;
  pending_amount: number;
  pending_withdrawals: number;
  total_bank_accounts: number;
  total_events?: number;
  active_events?: number;
  total_organizers?: number;
}

type TabType = 'overview' | 'bank-accounts' | 'withdrawals';

export default function FinancialPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    total_revenue: 0,
    total_refunds: 0,
    total_commissions: 0,
    total_withdrawals: 0,
    net_revenue: 0,
    pending_amount: 0,
    pending_withdrawals: 0,
    total_bank_accounts: 0,
    total_events: 0,
    active_events: 0,
    total_organizers: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);
      
      // Buscar dados das mesmas tabelas que a página de vendas dos organizadores usa
      
      // 1. Buscar eventos para obter dados de vendas reais
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          organizer_id,
          start_date,
          price,
          total_tickets,
          status,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // 2. Buscar perfis dos usuários (se necessário para outras funcionalidades)
      let profiles: Record<string, any> = {};

      // 4. Buscar contas bancárias com dados do organizador
      const { data: bankAccounts, error: baError } = await supabase
        .from('bank_accounts')
        .select(`
          *,
          organizer:profiles(name, email)
        `)
        .order('id', { ascending: false });

      if (baError) {
        console.log('⚠️ Tabela bank_accounts não encontrada ou erro:', baError);
        // Continuar sem contas bancárias
      } else {
        console.log('✅ Contas bancárias encontradas:', bankAccounts?.length || 0);
      }

      // 5. Buscar saques com dados da conta bancária e organizador
      const { data: withdrawals, error: wError } = await supabase
        .from('withdrawals')
        .select(`
          *,
          organizer:profiles(name, email),
          bank_account:bank_accounts(bank_name, agency, account_number, account_type)
        `)
        .order('id', { ascending: false });

      if (wError) {
        console.log('⚠️ Tabela withdrawals não encontrada ou erro:', wError);
        // Continuar sem saques
      } else {
        console.log('✅ Saques encontrados:', withdrawals?.length || 0);
      }

      // 6. Log dos dados encontrados para debug
      if (bankAccounts && bankAccounts.length > 0) {
        console.log('🏦 Primeira conta bancária:', bankAccounts[0]);
      }
      if (withdrawals && withdrawals.length > 0) {
        console.log('💳 Primeiro saque:', withdrawals[0]);
      }



      // 8. Mapear contas bancárias (se existirem)
      const formattedBankAccounts: BankAccount[] = (bankAccounts || []).map(ba => {
        return {
          id: ba.id,
          organizer_id: ba.organizer_id,
          organizer_name: ba.organizer?.name || 'Organizador não encontrado',
          organizer_email: ba.organizer?.email || 'Email não encontrado',
          bank_name: ba.bank_name,
          agency: ba.agency,
          account_number: ba.account_number,
          account_type: ba.account_type,
          is_default: ba.is_default,
          created_at: ba.created_at || new Date().toISOString(),
          updated_at: ba.updated_at || new Date().toISOString()
        };
      });

      // 9. Mapear saques (se existirem)
      const formattedWithdrawals: Withdrawal[] = (withdrawals || []).map(w => {
        return {
          id: w.id,
          organizer_id: w.organizer_id,
          organizer_name: w.organizer?.name || 'Organizador não encontrado',
          organizer_email: w.organizer?.email || 'Email não encontrado',
          bank_account_id: w.bank_account_id,
          bank_name: w.bank_account?.bank_name || 'Banco não informado',
          agency: w.bank_account?.agency || 'Agência não informada',
          account_number: w.bank_account?.account_number || 'Conta não informada',
          amount: w.amount,
          status: w.status,
          created_at: w.created_at || new Date().toISOString(),
          processed_at: w.processed_at,
          notes: w.notes,
          withdrawal_limit: w.withdrawal_limit,
          auto_withdrawal_enabled: w.auto_withdrawal_enabled,
          auto_trigger_type: w.auto_trigger_type,
          sales_amount_trigger: w.sales_amount_trigger,
          sales_count_trigger: w.sales_count_trigger,
          time_interval_days: w.time_interval_days,
          last_auto_execution: w.last_auto_execution,
          next_scheduled_execution: w.next_scheduled_execution
        };
      });

      // 10. Buscar transações reais para calcular receita
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txError) {
        console.log('⚠️ Tabela transactions não encontrada, usando valores baseados em eventos');
      }

      // Calcular receita total baseada em transações reais
      const totalRevenue = transactions ? 
        transactions
          .filter(tx => tx.status === 'completed' || tx.status === 'concluido')
          .reduce((acc, tx) => acc + (tx.amount || 0), 0) : 0;

      // Calcular comissões (assumindo 10% de comissão sobre vendas)
      const totalCommissions = totalRevenue * 0.1;

      const activeEvents = events?.filter(e => e.status === 'active').length || 0;
      const totalEvents = events?.length || 0;
      
      // Contar organizadores únicos
      const uniqueOrganizers = new Set([
        ...(events || []).map(e => e.organizer_id),
        ...(bankAccounts || []).map(ba => ba.organizer_id),
        ...(withdrawals || []).map(w => w.organizer_id)
      ]).size;

      setBankAccounts(formattedBankAccounts);
      setWithdrawals(formattedWithdrawals);

      // Logs para debug
      console.log('📊 Dados carregados:');
      console.log('  - Transações:', transactions?.length || 0);
      console.log('  - Receita total:', totalRevenue);
      console.log('  - Comissões:', totalCommissions);
      console.log('  - Contas bancárias:', formattedBankAccounts.length);
      console.log('  - Saques:', formattedWithdrawals.length);
      console.log('  - Organizadores únicos:', uniqueOrganizers);

      const summary: FinancialSummary = {
        total_revenue: totalRevenue,
        total_refunds: 0, // Sem reembolsos por enquanto
        total_commissions: totalCommissions,
        total_withdrawals: (formattedWithdrawals || [])
          .filter(w => w.status === 'concluido')
          .reduce((acc, w) => acc + w.amount, 0),
        net_revenue: totalRevenue - totalCommissions,
        pending_amount: 0, // Sem transações pendentes por enquanto
        pending_withdrawals: (formattedWithdrawals || [])
          .filter(w => w.status === 'pendente')
          .length,
        total_bank_accounts: (formattedBankAccounts || []).length
      };

                      // Adicionar dados adicionais ao resumo
        setSummary({
          ...summary,
          // Dados adicionais baseados em eventos
          total_events: totalEvents,
          active_events: activeEvents,
          total_organizers: uniqueOrganizers
        });

    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawalStatusUpdate = async (withdrawalId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: newStatus,
          processed_at: newStatus === 'concluido' ? new Date().toISOString() : null
        })
        .eq('id', withdrawalId);

      if (error) {
        console.error('Erro ao atualizar status do saque:', error);
        return;
      }

      console.log('✅ Status do saque atualizado com sucesso:', newStatus);

      // Recarregar dados
      fetchFinancialData();
    } catch (error) {
      console.error('Erro ao atualizar status do saque:', error);
    }
  };



  const pendingWithdrawals = (withdrawals || []).filter(w => w.status === 'pendente');
  const processingWithdrawals = (withdrawals || []).filter(w => w.status === 'processando');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  const getWithdrawalStatusColor = (status: string) => {
    switch (status) {
      case 'concluido': return 'bg-green-100 text-green-800 border-green-200';
      case 'processando': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getWithdrawalStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido': return <CheckCircle className="w-4 h-4" />;
      case 'processando': return <Clock className="w-4 h-4" />;
      case 'pendente': return <AlertCircle className="w-4 h-4" />;
      case 'cancelado': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(20);
      doc.text('Relatório Financeiro', 20, 20);
      
      // Resumo
      doc.setFontSize(14);
      doc.text('Resumo Financeiro', 20, 40);
      doc.setFontSize(12);
      doc.text(`Receita Total: ${formatCurrency(summary.total_revenue)}`, 20, 55);
      doc.text(`Total de Comissões: ${formatCurrency(summary.total_commissions)}`, 20, 65);
      doc.text(`Receita Líquida: ${formatCurrency(summary.net_revenue)}`, 20, 75);
      doc.text(`Total de Saques: ${formatCurrency(summary.total_withdrawals)}`, 20, 85);
      
      // Contas Bancárias
      doc.setFontSize(14);
      doc.text('Contas Bancárias', 20, 105);
      
      let yPosition = 115;
      (bankAccounts || []).forEach((ba, index) => {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(10);
        doc.text(`Organizador: ${ba.organizer_name}`, 20, yPosition);
        doc.text(`Banco: ${ba.bank_name} - Agência: ${ba.agency}`, 20, yPosition + 7);
        doc.text(`Conta: ${ba.account_number} (${ba.account_type})`, 20, yPosition + 14);
        
        yPosition += 25;
      });
      
      doc.save('relatorio-financeiro.pdf');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Financeiro</h1>
            <p className="text-gray-600 dark:text-gray-400">Gerencie transações, contas bancárias e saques</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Exportar PDF
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Visão Geral', icon: TrendingUp },
        
                { id: 'bank-accounts', label: 'Contas Bancárias', icon: CreditCard },
                { id: 'withdrawals', label: 'Saques', icon: Wallet }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Visão Geral */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Receita Total</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.total_revenue)}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Receita Líquida</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.net_revenue)}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-blue-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Saques Pendentes</p>
                        <p className="text-2xl font-bold">{pendingWithdrawals.length}</p>
                      </div>
                      <Wallet className="w-8 h-8 text-purple-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">Total de Eventos</p>
                        <p className="text-2xl font-bold">{summary.total_events || 0}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-orange-200" />
                    </div>
                  </div>
                </div>

                {/* Cards adicionais */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-indigo-100 text-sm font-medium">Total de Comissões</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.total_commissions)}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-indigo-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-teal-100 text-sm font-medium">Eventos Ativos</p>
                        <p className="text-2xl font-bold">{summary.active_events || 0}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-teal-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-pink-100 text-sm font-medium">Total de Saques</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.total_withdrawals)}</p>
                      </div>
                      <Wallet className="w-8 h-8 text-pink-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-cyan-100 text-sm font-medium">Organizadores</p>
                        <p className="text-2xl font-bold">{summary.total_organizers || 0}</p>
                      </div>
                      <Users className="w-8 h-8 text-cyan-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-amber-100 text-sm font-medium">Contas Bancárias</p>
                        <p className="text-2xl font-bold">{summary.total_bank_accounts}</p>
                      </div>
                      <CreditCard className="w-8 h-8 text-amber-200" />
                    </div>
                  </div>
                </div>

                {/* Gráficos e Estatísticas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status dos Saques</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Pendentes</span>
                        <span className="font-semibold text-yellow-600">{pendingWithdrawals.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Processando</span>
                        <span className="font-semibold text-blue-600">{processingWithdrawals.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Concluídos</span>
                        <span className="font-semibold text-green-600">
                          {withdrawals.filter(w => w.status === 'concluido').length}
                        </span>
                      </div>
                    </div>
                  </div>



                  <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumo Financeiro</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Receita Total</span>
                        <span className="font-semibold text-green-600">{formatCurrency(summary.total_revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total de Comissões</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(summary.total_commissions)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total de Saques</span>
                        <span className="font-semibold text-purple-600">{formatCurrency(summary.total_withdrawals)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* Contas Bancárias */}
            {activeTab === 'bank-accounts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Contas Bancárias dos Organizadores ({(bankAccounts || []).length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(bankAccounts || []).map((account) => (
                    <div key={account.id} className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{account.organizer_name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{account.organizer_email}</p>
                        </div>
                        {account.is_default && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            Padrão
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Banco:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{account.bank_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Agência:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{account.agency}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Conta:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{account.account_number}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Tipo:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{account.account_type}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Criada em: {formatDate(account.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                                  {(bankAccounts || []).length === 0 && (
                    <div className="text-center py-12">
                      <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">Nenhuma conta bancária encontrada</p>
                    </div>
                  )}
              </div>
            )}

            {/* Saques */}
            {activeTab === 'withdrawals' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Solicitações de Saque ({(withdrawals || []).length})
                  </h3>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-600 border-b border-gray-200 dark:border-gray-500">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Data</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Organizador</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Conta Bancária</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Valor</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-500">
                        {(withdrawals || []).map((withdrawal) => (
                          <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                              {formatDate(withdrawal.created_at)}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{withdrawal.organizer_name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{withdrawal.organizer_email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm text-gray-900 dark:text-white">{withdrawal.bank_name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Ag: {withdrawal.agency} | Conta: {withdrawal.account_number}
                                </p>
                                {withdrawal.auto_withdrawal_enabled && (
                                  <div className="text-xs text-blue-600 font-medium mt-1">
                                    ⚡ Saque Automático
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(withdrawal.amount)}
                                </span>
                                {withdrawal.withdrawal_limit && (
                                  <div className="text-xs text-gray-500">
                                    Limite: {formatCurrency(withdrawal.withdrawal_limit)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getWithdrawalStatusColor(withdrawal.status)}`}>
                                {getWithdrawalStatusIcon(withdrawal.status)}
                                {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {withdrawal.status === 'pendente' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleWithdrawalStatusUpdate(withdrawal.id, 'processando')}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
                                  >
                                    <Clock className="w-3 h-3" />
                                    Processar
                                  </button>
                                  <button
                                    onClick={() => handleWithdrawalStatusUpdate(withdrawal.id, 'cancelado')}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full hover:bg-red-200"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Cancelar
                                  </button>
                                </div>
                              )}
                              {withdrawal.status === 'processando' && (
                                <button
                                  onClick={() => handleWithdrawalStatusUpdate(withdrawal.id, 'concluido')}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full hover:bg-green-200"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Concluir
                                </button>
                              )}
                              {withdrawal.status === 'concluido' && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {withdrawal.processed_at && `Processado em: ${formatDate(withdrawal.processed_at)}`}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(withdrawals || []).length === 0 && (
                    <div className="text-center py-12">
                      <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">Nenhuma solicitação de saque encontrada</p>
                    </div>
                  )}
                </div>

                {/* Estatísticas dos Saques */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-yellow-100 rounded-full">
                        <AlertCircle className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Pendentes</p>
                        <p className="text-2xl font-bold text-yellow-600">{pendingWithdrawals.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 rounded-full">
                        <Clock className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Processando</p>
                        <p className="text-2xl font-bold text-blue-600">{processingWithdrawals.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 rounded-full">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Concluídos</p>
                        <p className="text-2xl font-bold text-green-600">
                          {(withdrawals || []).filter(w => w.status === 'concluido').length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}