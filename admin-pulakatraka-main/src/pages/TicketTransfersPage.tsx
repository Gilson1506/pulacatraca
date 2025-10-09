import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  RefreshCw, 
  Filter, 
  Eye, 
  User, 
  Ticket, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  ArrowUpDown,
  Users,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

interface TicketTransfer {
  id: string;
  ticket_id: string;
  from_user_id: string;
  to_user_id: string;
  transferred_at: string;
  transfer_reason: string;
  status: 'completed' | 'failed' | 'cancelled';
  created_at: string;
  ticket?: {
    id: string;
    price: number;
    event_id: string;
    title?: string;
    event_date?: string;
    location?: string;
  };
  from_user?: {
    id: string;
    name: string;
    email: string;
  };
  to_user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface TransferStats {
  totalTransfers: number;
  completedTransfers: number;
  failedTransfers: number;
  cancelledTransfers: number;
  totalValue: number;
  monthlyTransfers: number;
  monthlyGrowth: number;
  averageTransferValue: number;
}

export default function TicketTransfersPage() {
  const [transfers, setTransfers] = useState<TicketTransfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<TicketTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Estados de filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed' | 'cancelled'>('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [sortBy, setSortBy] = useState<'transferred_at' | 'created_at' | 'status'>('transferred_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Estatísticas
  const [stats, setStats] = useState<TransferStats>({
    totalTransfers: 0,
    completedTransfers: 0,
    failedTransfers: 0,
    cancelledTransfers: 0,
    totalValue: 0,
    monthlyTransfers: 0,
    monthlyGrowth: 0,
    averageTransferValue: 0
  });

  useEffect(() => {
    fetchTransfers();
  }, []);

  useEffect(() => {
    filterTransfers();
  }, [transfers, searchTerm, filterStatus, filterDate, filterLocation, sortBy, sortOrder]);

  const fetchTransfers = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Buscando transferências de ingressos...');

      // Buscar transferências com dados relacionados
      const { data: transfersData, error: transfersError } = await supabase
        .from('ticket_transfers')
        .select(`
          *,
          ticket:tickets(
            id,
            price,
            event_id
          ),
          from_user:profiles!ticket_transfers_from_user_id_fkey(
            id,
            name,
            email
          ),
          to_user:profiles!ticket_transfers_to_user_id_fkey(
            id,
            name,
            email
          )
        `)
        .order('transferred_at', { ascending: false });

      // Buscar eventos relacionados aos tickets
      if (transfersData && transfersData.length > 0) {
        const eventIds = [...new Set(transfersData.map(t => t.ticket?.event_id).filter(Boolean))];
        
        if (eventIds.length > 0) {
          const { data: eventsData, error: eventsError } = await supabase
            .from('events')
            .select('id, title, start_date, location')
            .in('id', eventIds);

          if (!eventsError && eventsData) {
            const eventsMap = eventsData.reduce((acc, event) => {
              acc[event.id] = event;
              return acc;
            }, {} as Record<string, any>);

            // Enriquecer os dados das transferências com informações dos eventos
            const enrichedTransfers = transfersData.map(transfer => ({
              ...transfer,
              ticket: transfer.ticket ? {
                ...transfer.ticket,
                title: eventsMap[transfer.ticket.event_id]?.title || 'Evento não encontrado',
                event_date: eventsMap[transfer.ticket.event_id]?.start_date || 'Data não disponível',
                location: eventsMap[transfer.ticket.event_id]?.location || 'Local não disponível'
              } : null
            }));

            console.log('📊 Transferências enriquecidas com dados dos eventos:', enrichedTransfers?.length || 0);
            setTransfers(enrichedTransfers || []);
            setLastUpdated(new Date());
            calculateStats(enrichedTransfers || []);
            return;
          }
        }
      }

      if (transfersError) {
        console.log('⚠️ Erro ao buscar transferências:', transfersError);
        setTransfers([]);
        return;
      }

      console.log('📊 Transferências encontradas:', transfersData?.length || 0);
      setTransfers(transfersData || []);
      setLastUpdated(new Date());

      // Calcular estatísticas
      calculateStats(transfersData || []);

    } catch (error) {
      console.error('❌ Erro ao buscar transferências:', error);
      setTransfers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (transfersData: TicketTransfer[]) => {
    const totalTransfers = transfersData.length;
    const completedTransfers = transfersData.filter(t => t.status === 'completed').length;
    const failedTransfers = transfersData.filter(t => t.status === 'failed').length;
    const cancelledTransfers = transfersData.filter(t => t.status === 'cancelled').length;

    // Calcular valor total apenas das transferências concluídas com preço válido
    const totalValue = transfersData
      .filter(t => t.status === 'completed' && t.ticket?.price && !isNaN(Number(t.ticket.price)))
      .reduce((acc, t) => acc + Number(t.ticket?.price || 0), 0);

    const averageTransferValue = completedTransfers > 0 ? totalValue / completedTransfers : 0;

    // Calcular transferências mensais com validação de data
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const monthlyTransfers = transfersData.filter(t => {
      try {
        const transferDate = new Date(t.transferred_at);
        return !isNaN(transferDate.getTime()) && transferDate >= currentMonth && t.status === 'completed';
      } catch {
        return false;
      }
    }).length;

    const previousMonthTransfers = transfersData.filter(t => {
      try {
        const transferDate = new Date(t.transferred_at);
        return !isNaN(transferDate.getTime()) && transferDate >= previousMonth && transferDate < currentMonth && t.status === 'completed';
      } catch {
        return false;
      }
    }).length;

    const monthlyGrowth = previousMonthTransfers > 0 ? 
      ((monthlyTransfers - previousMonthTransfers) / previousMonthTransfers) * 100 : 0;

    console.log('📊 Estatísticas calculadas:', {
      totalTransfers,
      completedTransfers,
      failedTransfers,
      cancelledTransfers,
      totalValue,
      monthlyTransfers,
      monthlyGrowth,
      averageTransferValue
    });

    setStats({
      totalTransfers,
      completedTransfers,
      failedTransfers,
      cancelledTransfers,
      totalValue,
      monthlyTransfers,
      monthlyGrowth,
      averageTransferValue
    });
  };

  const filterTransfers = () => {
    let filtered = [...transfers];

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(transfer => 
        transfer.from_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.to_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.from_user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.to_user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.ticket?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.ticket?.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.transfer_reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(transfer => transfer.status === filterStatus);
    }

    // Filtro por data
    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      filtered = filtered.filter(transfer => {
        const transferDate = new Date(transfer.transferred_at);
        return transferDate.toDateString() === filterDateObj.toDateString();
      });
    }

    // Filtro por local
    if (filterLocation) {
      filtered = filtered.filter(transfer => 
        transfer.ticket?.location?.toLowerCase().includes(filterLocation.toLowerCase())
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'transferred_at':
          aValue = new Date(a.transferred_at);
          bValue = new Date(b.transferred_at);
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.transferred_at);
          bValue = new Date(b.transferred_at);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTransfers(filtered);
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
      doc.text('RELATÓRIO DE TRANSFERÊNCIAS', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} • Total: ${filteredTransfers.length} transferências`, 20, 28);
      
      // Resetar cor do texto
      doc.setTextColor(0, 0, 0);
      
      // Resumo Executivo
      doc.setFontSize(18);
      doc.text('Resumo Executivo', 20, 45);
      
      doc.setFontSize(12);
      let yPosition = 55;
      
      doc.text(`• Total de Transferências: ${stats.totalTransfers}`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Transferências Concluídas: ${stats.completedTransfers}`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Transferências Falharam: ${stats.failedTransfers}`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Transferências Canceladas: ${stats.cancelledTransfers}`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Valor Total: R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPosition);
      yPosition += 8;
      doc.text(`• Transferências Mensais: ${stats.monthlyTransfers}`, 20, yPosition);
      
      // Dados das Transferências
      yPosition += 15;
      doc.setFontSize(16);
      doc.text('Detalhes das Transferências', 20, yPosition);
      
      if (filteredTransfers.length > 0) {
        yPosition += 10;
        
        const tableData = filteredTransfers.map(transfer => [
          transfer.from_user?.name || 'N/A',
          transfer.to_user?.name || 'N/A',
          transfer.ticket?.title || 'N/A',
          transfer.status,
          new Date(transfer.transferred_at).toLocaleDateString('pt-BR'),
          transfer.transfer_reason || 'N/A'
        ]);
        
        autoTable(doc, {
          head: [['De', 'Para', 'Ingresso', 'Status', 'Data', 'Motivo']],
          body: tableData,
          startY: yPosition,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 20 }
        });
      }
      
      doc.save(`transferencias-ingressos-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'failed':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'cancelled':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
          <p className="text-gray-600 dark:text-gray-400">Carregando transferências...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transferências de Ingressos</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Visualize e gerencie todas as transferências de ingressos • 
            Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchTransfers}
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

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total de Transferências</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(stats.totalTransfers)}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
              <Ticket className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Transferências Concluídas</p>
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(stats.completedTransfers)}
              </p>
              <p className="text-sm text-green-600 font-medium">
                {stats.totalTransfers > 0 ? ((stats.completedTransfers / stats.totalTransfers) * 100).toFixed(1) : 0}% do total
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Valor Total</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.totalValue)}
              </p>
              <p className="text-sm text-purple-600 font-medium">
                Média: {formatCurrency(stats.averageTransferValue)}
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl">
              <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Transferências Mensais</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatNumber(stats.monthlyTransfers)}
              </p>
              <p className={`text-sm font-medium ${stats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(stats.monthlyGrowth)}
              </p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email, evento, local ou motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todos os Status</option>
              <option value="completed">Concluídas</option>
              <option value="failed">Falharam</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Local
            </label>
            <input
              type="text"
              placeholder="Filtrar por local..."
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="transferred_at">Data da Transferência</option>
              <option value="created_at">Data de Criação</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ordem
            </label>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transferências ({filteredTransfers.length})
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredTransfers.length > 0 && (
                <>
                  Mostrando {filteredTransfers.length} de {transfers.length} transferências
                </>
              )}
            </div>
          </div>
        </div>

        {filteredTransfers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nenhuma transferência encontrada
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterStatus !== 'all' || filterDate 
                ? 'Tente ajustar os filtros de busca'
                : 'Não há transferências de ingressos registradas'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    De
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Para
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Ingresso
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Local
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Data da Transferência
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Motivo
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {transfer.from_user?.name || 'Usuário não encontrado'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {transfer.from_user?.email || 'Email não disponível'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                          <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {transfer.to_user?.name || 'Usuário não encontrado'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {transfer.to_user?.email || 'Email não disponível'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
                          <Ticket className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {transfer.ticket?.title || 'Ingresso não encontrado'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {transfer.ticket?.price ? formatCurrency(transfer.ticket.price) : 'Preço não disponível'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                          <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {transfer.ticket?.location || 'Local não disponível'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {transfer.ticket?.event_date ? formatDate(transfer.ticket.event_date) : 'Data não disponível'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                        {getStatusIcon(transfer.status)}
                        <span className="ml-2 capitalize">
                          {transfer.status === 'completed' ? 'Concluída' :
                           transfer.status === 'failed' ? 'Falhou' :
                           transfer.status === 'cancelled' ? 'Cancelada' : transfer.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">
                          {formatDate(transfer.transferred_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 dark:text-white max-w-xs truncate">
                        {transfer.transfer_reason || 'Nenhum motivo especificado'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => console.log('Visualizar detalhes da transferência:', transfer.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                        title="Visualizar detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumo dos Filtros */}
      {filteredTransfers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumo dos Filtros Aplicados</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Transferências Filtradas</p>
              <p className="text-2xl font-bold text-blue-600">{formatNumber(filteredTransfers.length)}</p>
              <p className="text-sm text-gray-500">
                de {formatNumber(transfers.length)} total
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Valor Total Filtrado</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(filteredTransfers
                  .filter(t => t.status === 'completed' && t.ticket?.price)
                  .reduce((acc, t) => acc + (t.ticket?.price || 0), 0)
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Taxa de Sucesso</p>
              <p className="text-2xl font-bold text-emerald-600">
                {filteredTransfers.length > 0 ? 
                  ((filteredTransfers.filter(t => t.status === 'completed').length / filteredTransfers.length) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
