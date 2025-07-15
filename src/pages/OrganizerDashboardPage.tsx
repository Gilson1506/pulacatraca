import React, { useState } from 'react';
import {
  Calendar, BarChart3, CreditCard, QrCode, Settings, PlusCircle, AlertCircle, DollarSign, Users, Eye, Edit3, Share2, X, Download, Clock, CheckCircle, XCircle, Trash2, Send
} from 'lucide-react';
import { QrReader } from 'react-qr-reader';

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

// Mock Data
const mockEvents: Event[] = [
  {
    id: '1',
    name: 'Festival de Inverno 2025',
    date: '2025-08-15',
    time: '18:00',
    location: 'Centro de Convenções',
    description: 'Um festival incrível com os melhores artistas do inverno.',
    status: 'ativo',
    ticketsSold: 750,
    totalTickets: 1000,
    revenue: 37500,
    category: 'Música',
    image: 'https://via.placeholder.com/300x200'
  },
  {
    id: '2',
    name: 'Samba Prime Experience',
    date: '2025-09-05',
    time: '20:00',
    location: 'Sambódromo',
    description: 'Uma noite especial de samba com grandes nomes.',
    status: 'adiado',
    ticketsSold: 450,
    totalTickets: 800,
    revenue: 22500,
    category: 'Música'
  },
  {
    id: '3',
    name: 'Arraiá do Pula Catraca',
    date: '2025-07-20',
    time: '19:00',
    location: 'Parque Central',
    description: 'Festa junina tradicional com muita diversão.',
    status: 'cancelado',
    ticketsSold: 0,
    totalTickets: 500,
    revenue: 0,
    category: 'Festa Junina'
  }
];

const mockSales: Sale[] = [
  {
    id: '101',
    eventId: '1',
    eventName: 'Festival de Inverno 2025',
    buyerName: 'João Silva',
    buyerEmail: 'joao@email.com',
    ticketType: 'Pista',
    quantity: 2,
    amount: 120.00,
    date: '2025-07-10',
    status: 'confirmado',
    paymentMethod: 'Cartão de Crédito'
  },
  {
    id: '102',
    eventId: '1',
    eventName: 'Festival de Inverno 2025',
    buyerName: 'Maria Santos',
    buyerEmail: 'maria@email.com',
    ticketType: 'VIP',
    quantity: 1,
    amount: 200.00,
    date: '2025-07-12',
    status: 'pendente',
    paymentMethod: 'PIX'
  }
];

// Dashboard Overview Component
const DashboardOverview = () => {
  const totalRevenue = mockEvents.reduce((sum, event) => sum + event.revenue, 0);
  const totalTicketsSold = mockEvents.reduce((sum, event) => sum + event.ticketsSold, 0);
  const activeEvents = mockEvents.filter(event => event.status === 'ativo').length;
  const pendingSales = mockSales.filter(sale => sale.status === 'pendente').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors">
          <PlusCircle className="h-5 w-5" />
          Novo Evento
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Receita Total</p>
              <p className="text-2xl font-bold">R$ {totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Ingressos Vendidos</p>
              <p className="text-2xl font-bold">{totalTicketsSold.toLocaleString()}</p>
            </div>
            <Users className="h-8 w-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Eventos Ativos</p>
              <p className="text-2xl font-bold">{activeEvents}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Vendas Pendentes</p>
              <p className="text-2xl font-bold">{pendingSales}</p>
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
            {mockEvents.slice(0, 3).map(event => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Events Component
const OrganizerEvents = () => {
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [filter, setFilter] = useState<'todos' | 'ativo' | 'adiado' | 'cancelado'>('todos');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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

  const handleStatusChange = (eventId: string, newStatus: 'ativo' | 'adiado' | 'cancelado') => {
    setEvents(prev => prev.map(event => 
      event.id === eventId ? { ...event, status: newStatus } : event
    ));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Meus Eventos</h2>
          <p className="text-gray-600">Gerencie todos os seus eventos em um só lugar</p>
        </div>
        <button 
          onClick={() => setShowEventModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
        >
          <PlusCircle className="h-5 w-5" />
          Novo Evento
        </button>
      </div>

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
          
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-3 ${viewMode === 'grid' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700'}`}
            >
              <div className="grid grid-cols-2 gap-1 w-4 h-4">
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
              </div>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-3 ${viewMode === 'list' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700'}`}
            >
              <div className="space-y-1">
                <div className="w-4 h-0.5 bg-current"></div>
                <div className="w-4 h-0.5 bg-current"></div>
                <div className="w-4 h-0.5 bg-current"></div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Events Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => (
            <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-gradient-to-br from-pink-500 to-purple-600 relative">
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-semibold text-lg">{event.name}</h3>
                  <p className="text-sm opacity-90">{event.date} • {event.time}</p>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>{event.location}</span>
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
                    onClick={() => setSelectedEvent(event)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <Eye className="h-4 w-4 inline mr-1" />
                    Ver
                  </button>
                  <button className="flex-1 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
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
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingressos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receita</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.map(event => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
                          <Calendar className="h-5 w-5 text-pink-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{event.name}</div>
                          <div className="text-sm text-gray-500">{event.location}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{event.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{event.ticketsSold}/{event.totalTickets}</td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600">R$ {event.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-700">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-700">
                          <Edit3 className="h-4 w-4" />
                        </button>
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
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">{selectedEvent.name}</h3>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <p className="text-sm text-gray-900">{selectedEvent.date}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                    <p className="text-sm text-gray-900">{selectedEvent.time}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                  <p className="text-sm text-gray-900">{selectedEvent.location}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <p className="text-sm text-gray-900">{selectedEvent.description}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEvent.status)}`}>
                      {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ingressos</label>
                    <p className="text-sm text-gray-900">{selectedEvent.ticketsSold}/{selectedEvent.totalTickets}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Receita</label>
                    <p className="text-sm font-medium text-green-600">R$ {selectedEvent.revenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors">
                  Editar Evento
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Compartilhar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sales Component
const OrganizerSales = () => {
  const [sales, setSales] = useState<Sale[]>(mockSales);
  const [filter, setFilter] = useState<'todos' | 'pendente' | 'confirmado' | 'cancelado'>('todos');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const filteredSales = sales.filter(sale => {
    const matchesFilter = filter === 'todos' || sale.status === filter;
    const matchesDate = !dateRange.start || !dateRange.end || 
      (sale.date >= dateRange.start && sale.date <= dateRange.end);
    return matchesFilter && matchesDate;
  });

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalSales = filteredSales.length;

  const updateSaleStatus = (saleId: string, newStatus: 'confirmado' | 'cancelado') => {
    setSales(prev => prev.map(sale => 
      sale.id === saleId ? { ...sale, status: newStatus } : sale
    ));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Controle de Vendas</h2>
          <p className="text-gray-600">Gerencie todas as vendas dos seus eventos</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Download className="h-5 w-5" />
          Exportar Relatório
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
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSales.map(sale => (
            <div key={sale.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-lg text-gray-900">{sale.eventName}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    sale.status === 'pendente' ? 'bg-orange-100 text-orange-800' :
                    sale.status === 'confirmado' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <div>
                    <p>Comprador: {sale.buyerName}</p>
                    <p>Email: {sale.buyerEmail}</p>
                  </div>
                  <div>
                    <p>Tipo de Ingresso: {sale.ticketType}</p>
                    <p>Quantidade: {sale.quantity}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-900">
                  <p>Valor Total: R$ {sale.amount.toLocaleString()}</p>
                  <p>Data: {sale.date}</p>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                {sale.status === 'pendente' && (
                  <>
                    <button 
                      onClick={() => updateSaleStatus(sale.id, 'confirmado')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Confirmar
                    </button>
                    <button 
                      onClick={() => updateSaleStatus(sale.id, 'cancelado')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                  </>
                )}
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                  <Share2 className="h-4 w-4 inline mr-1" />
                  Compartilhar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
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
      )}
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
  const [showQRScanner, setShowQRScanner] = useState(false); // Não abre automaticamente
  const [scanError, setScanError] = useState('');
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const handleQRCodeScan = (data: string | null) => {
    if (data) {
      setLastScan(data);
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
      setScanError('');
      setManualCode('');
      setShowQRScanner(false); // Fecha modal após check-in
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleQRCodeScan(manualCode.trim());
    } else {
      setScanError('Digite um código válido.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Check-ins</h2>
        <button
          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
          onClick={() => { setShowQRScanner(true); setScanError(''); setManualCode(''); }}
        >
          Abrir Scanner
        </button>
      </div>
      {/* QR Code Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 flex flex-col items-center relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setShowQRScanner(false)}
              aria-label="Fechar"
            >
              ×
            </button>
            <h3 className="text-xl font-bold mb-4">Escanear QR Code do Ingresso</h3>
            <div className="w-full max-w-xs aspect-square mb-4">
              <QrReader
                constraints={{ facingMode: 'environment' }}
                onResult={(result, error) => {
                  if (result) handleQRCodeScan(result.getText());
                  if (error) setScanError('Erro ao ler QR code.');
                }}
              />
            </div>
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
            {scanError && <div className="text-red-600 mb-2">{scanError}</div>}
            {lastScan && (
              <div className="mb-2 text-green-700 font-semibold">Último QR lido: {lastScan}</div>
            )}
            <div className="w-full text-center text-gray-500 text-sm mb-2">Aponte a câmera para o QR code do ingresso ou digite o código manualmente.<br/>Se solicitado, permita o acesso à câmera do dispositivo.</div>
          </div>
        </div>
      )}
      {/* Check-ins Display */}
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
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      checkIn.status === 'ok' ? 'bg-green-100 text-green-800' :
                      checkIn.status === 'duplicado' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {checkIn.status.charAt(0).toUpperCase() + checkIn.status.slice(1)}
                    </span>
                  </td>
                  {/* Remover coluna de ações */}
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
  const [name, setName] = useState('Organizador Exemplo');
  const [email, setEmail] = useState('organizador@teste.com');
  const [password, setPassword] = useState('');
  const [preferences, setPreferences] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você pode integrar com backend ou localStorage
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6">Configurações do Organizador</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
          <input
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Deixe em branco para não alterar"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferências</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            value={preferences}
            onChange={e => setPreferences(e.target.value)}
            placeholder="Ex: Receber notificações, modo escuro, etc."
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
        >
          Salvar Configurações
        </button>
        {success && <div className="text-green-600 mt-2">Configurações salvas!</div>}
      </form>
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ active, setActive }: { active: string, setActive: (v: string) => void }) => (
  <aside className="bg-white shadow-md rounded-lg p-4 w-full md:w-64 mb-6 md:mb-0">
    <nav className="flex md:flex-col gap-2">
      <button onClick={() => setActive('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded ${active==='dashboard'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Dashboard</button>
      <button onClick={() => setActive('events')} className={`flex items-center gap-2 px-4 py-2 rounded ${active==='events'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Eventos</button>
      <button onClick={() => setActive('sales')} className={`flex items-center gap-2 px-4 py-2 rounded ${active==='sales'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Vendas</button>
      <button onClick={() => setActive('finance')} className={`flex items-center gap-2 px-4 py-2 rounded ${active==='finance'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Financeiro</button>
      <button onClick={() => setActive('checkin')} className={`flex items-center gap-2 px-4 py-2 rounded ${active==='checkin'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Check-in</button>
      <button onClick={() => setActive('settings')} className={`flex items-center gap-2 px-4 py-2 rounded ${active==='settings'?'bg-pink-600 text-white':'hover:bg-pink-50 text-gray-700'}`}>Configurações</button>
    </nav>
  </aside>
);

// Main Organizer Dashboard Page
const OrganizerDashboardPage = () => {
  const [active, setActive] = useState('dashboard');
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      <Sidebar active={active} setActive={setActive} />
      <main className="flex-1 p-4 md:p-8">
        {active === 'dashboard' && <DashboardOverview />}
        {active === 'events' && <OrganizerEvents />}
        {active === 'sales' && <OrganizerSales />}
        {active === 'finance' && <OrganizerBankAccounts />}
        {active === 'checkin' && <OrganizerCheckIns />}
        {active === 'settings' && <OrganizerSettings />}
      </main>
    </div>
  );
};

export default OrganizerDashboardPage;