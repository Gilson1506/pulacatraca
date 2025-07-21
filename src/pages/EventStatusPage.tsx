import React, { useState } from 'react';
import { Calendar, MapPin, Users, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  city: string;
  state: string;
  image: string;
  status: 'ativo' | 'cancelado' | 'adiado' | 'finalizado';
  ticketsSold: number;
  totalTickets: number;
  revenue: number;
  checkIns: number;
}

interface Pedido {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  city: string;
  state: string;
  image: string;
  status: 'em_processo' | 'pendente' | 'confirmado';
  value: number;
}

const pedidosMock: Pedido[] = [
  {
    id: '1',
    title: 'O Embaixador Classic',
    date: '2025-08-15',
    time: '20:00',
    location: 'Arena Goiânia',
    city: 'Goiânia',
    state: 'GO',
    image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
    status: 'em_processo',
    value: 200.00
  },
  {
    id: '2',
    title: 'Festa Julina Sorocaba',
    date: '2025-07-15',
    time: '19:00',
    location: 'Arena Sorocaba',
    city: 'Sorocaba',
    state: 'SP',
    image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
    status: 'pendente',
    value: 150.00
  },
  {
    id: '3',
    title: 'Stand Up Comedy Night',
    date: '2025-06-20',
    time: '20:00',
    location: 'Teatro Municipal',
    city: 'São Paulo',
    state: 'SP',
    image: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
    status: 'confirmado',
    value: 99.90
  }
];

const EventStatusPage = () => {
  const [pedidos] = useState<Pedido[]>(pedidosMock);
  const [tab, setTab] = useState<'em_processo' | 'pendente' | 'confirmado'>('em_processo');

  const getStatusPedidoText = (status: string) => {
    switch (status) {
      case 'em_processo': return 'Em processo';
      case 'pendente': return 'Pendente';
      case 'confirmado': return 'Confirmado';
      default: return 'Desconhecido';
    }
  };

  const getStatusPedidoColor = (status: string) => {
    switch (status) {
      case 'em_processo': return 'bg-yellow-100 text-yellow-800';
      case 'pendente': return 'bg-blue-100 text-blue-800';
      case 'confirmado': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-6">Meus Pedidos</h2>
        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button onClick={() => setTab('em_processo')} className={`px-4 py-2 rounded-full font-semibold border transition-colors ${tab==='em_processo'?'bg-yellow-100 border-yellow-400 text-yellow-800':'border-gray-200 text-gray-600 hover:bg-yellow-50'}`}>Em processo</button>
          <button onClick={() => setTab('pendente')} className={`px-4 py-2 rounded-full font-semibold border transition-colors ${tab==='pendente'?'bg-blue-100 border-blue-400 text-blue-800':'border-gray-200 text-gray-600 hover:bg-blue-50'}`}>Pendente</button>
          <button onClick={() => setTab('confirmado')} className={`px-4 py-2 rounded-full font-semibold border transition-colors ${tab==='confirmado'?'bg-green-100 border-green-400 text-green-800':'border-gray-200 text-gray-600 hover:bg-green-50'}`}>Confirmado</button>
        </div>
        {/* Lista de Pedidos */}
        <div className="space-y-4">
          {pedidos.filter(p=>p.status===tab).length === 0 && (
            <div className="text-center text-gray-500 py-12">Nenhum pedido encontrado.</div>
          )}
          {pedidos.filter(p=>p.status===tab).map(pedido => (
            <div key={pedido.id} className="border border-gray-200 rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <img src={pedido.image} alt={pedido.title} className="w-20 h-20 object-cover rounded-lg mb-2 sm:mb-0 flex-shrink-0" />
              <div className="flex-1 w-full">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 break-words">{pedido.title}</h3>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-600 mb-1">
                  <div className="flex items-center space-x-1 mb-1 sm:mb-0">
                    <Calendar className="h-4 w-4" />
                    <span>{pedido.date} às {pedido.time}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{pedido.city}/{pedido.state}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusPedidoColor(pedido.status)}`}>{getStatusPedidoText(pedido.status)}</span>
              </div>
              <div className="text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-end gap-2 sm:gap-0 mt-2 sm:mt-0">
                <div className="text-lg font-bold text-pink-600 mb-0 sm:mb-1">{formatCurrency(pedido.value)}</div>
                <button className="text-xs text-pink-600 hover:text-pink-700 font-semibold">Ver detalhes</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventStatusPage;