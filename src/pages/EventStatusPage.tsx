import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import ProfessionalLoader from '../components/ProfessionalLoader';
import { supabase } from '../lib/supabase';

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

const EventStatusPage = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [tab, setTab] = useState<'em_processo' | 'pendente' | 'confirmado'>('em_processo');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    try {
      setIsLoading(true);
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          event:events(
            title,
            date,
            time,
            location,
            city,
            state,
            image_url
          ),
          status,
          total_amount
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapear os pedidos para o formato necessário
      const formattedOrders: Pedido[] = orders?.map(order => ({
        id: order.id,
        title: order.event.title,
        date: order.event.date,
        time: order.event.time,
        location: order.event.location,
        city: order.event.city,
        state: order.event.state,
        image: order.event.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjM2OEE3Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTYwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FdmVudG88L3RleHQ+Cjwvc3ZnPgo=',
        status: order.status,
        value: order.total_amount
      })) || [];

      setPedidos(formattedOrders);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-start justify-center pt-6">
        <div className="text-center">
          <ProfessionalLoader size="lg" className="mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

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
                    <span>{formatDate(pedido.date)} às {pedido.time}</span>
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