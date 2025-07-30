import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Footer from '../components/Footer';
import LoadingButton from '../components/LoadingButton';
import { QrCode, BarChart3, User, MessageCircle, LogOut, ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';

function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// 🎫 Interface para Ingressos
interface UserTicket {
  id: string;
  event_id: string;
  code: string;
  ticket_type: string;
  status: 'pending' | 'active' | 'used' | 'cancelled';
  created_at: string;
  used_at: string | null;
  user_id: string | null;
  event: {
    title: string;
    description: string;
    date: string;
    location: string;
    banner_url: string | null;
    price: number;
  };
}

// 📋 Interface para Histórico de Pedidos
interface UserOrder {
  id: string;
  event_id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  amount: number;
  payment_method: string | null;
  event: {
    title: string;
    description: string;
    date: string;
    location: string;
    banner_url: string | null;
  };
}

// 📋 Componente para exibir Histórico de Pedidos
const OrdersSection = ({ userEmail }: { userEmail: string }) => {
  const [userOrders, setUserOrders] = useState<UserOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserOrders();
  }, []);

  const fetchUserOrders = async () => {
    try {
      setIsLoading(true);
      console.log('📋 Buscando histórico de pedidos...');

      // Buscar o usuário atual
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Erro ao obter usuário:', authError);
        return;
      }

      // Primeiro tentar com buyer_id
      let ordersData = null;
      let error = null;

      console.log('🔄 Tentando buscar com buyer_id...');
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          event:events!inner(title, description, start_date, location, banner_url, price)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (ticketsError) {
        console.log('⚠️ buyer_id não existe, tentando com user_id...');
        // Fallback: buscar por user_id se buyer_id não existir
        const { data: userTicketsData, error: userTicketsError } = await supabase
          .from('tickets')
          .select(`
            *,
            event:events!inner(title, description, start_date, location, banner_url, price)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (userTicketsError) {
          console.log('⚠️ Tentando buscar de transactions...');
          // Fallback final: buscar de transactions
          const { data: transactionsData, error: transactionsError } = await supabase
            .from('transactions')
            .select(`
              *,
              event:events!inner(title, description, start_date, location, banner_url, price)
            `)
            .eq('buyer_id', user.id)
            .order('created_at', { ascending: false });

          ordersData = transactionsData;
          error = transactionsError;
        } else {
          ordersData = userTicketsData;
        }
      } else {
        ordersData = ticketsData;
      }

      if (error) {
        console.error('❌ Erro ao buscar pedidos:', error);
        return;
      }

      console.log('✅ Pedidos encontrados:', ordersData?.length || 0);
      setUserOrders(ordersData || []);

    } catch (error) {
      console.error('❌ Erro inesperado ao buscar pedidos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'active': return 'bg-green-100 text-green-700';
      case 'used': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Aguardando Confirmação';
      case 'active': return 'Confirmado';
      case 'used': return 'Utilizado';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconhecido';
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
        <span className="ml-2 text-gray-600">Carregando histórico...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-pink-600 mb-2">Histórico</h2>
      <div className="border-b border-gray-200 mb-4" />
      {userOrders.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-400 font-medium">
          Nenhum pedido encontrado.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {userOrders.map((order) => (
            <div key={order.id} className="flex flex-col sm:flex-row items-center bg-white rounded-xl shadow border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Data (desktop only) */}
              <div className="hidden sm:flex flex-col items-center justify-center p-4 min-w-[80px]">
                <span className="text-pink-600 font-bold text-2xl leading-none">{new Date(order.created_at).getDate()}</span>
                <span className="text-xs font-semibold text-gray-700 uppercase">{new Date(order.created_at).toLocaleString('pt-BR', { month: 'short' })}</span>
                <span className="text-xs text-gray-400">{new Date(order.created_at).getFullYear()}</span>
              </div>
              {/* Imagem sempre primeiro no mobile */}
              <img 
                src={order.event.banner_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiByeD0iOCIgZmlsbD0iI0YzNjhBNyIvPgo8dGV4dCB4PSI0MCIgeT0iNDUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkV2ZW50bzwvdGV4dD4KPC9zdmc+'} 
                alt={order.event.title} 
                className="w-20 h-20 object-cover rounded-full mx-auto my-2 sm:mx-4 sm:my-0 order-1" 
              />
              {/* Detalhes */}
              <div className="flex-1 flex flex-col justify-center px-2 py-2 text-center sm:text-left order-2">
                <div className="font-bold text-lg text-gray-800 leading-tight">{order.event.title}</div>
                <div className="text-sm text-pink-700 font-semibold leading-tight">{order.event.location}</div>
                <div className="text-xs text-gray-500 leading-tight">
                  Código: {order.code} • R$ {(order.event.price || 0).toFixed(2)}
                </div>
              </div>
              {/* Status */}
              <div className="flex items-center justify-center sm:justify-end p-4 w-full sm:w-auto order-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>
              {/* Data (mobile only, abaixo do status) */}
              <div className="flex sm:hidden flex-row items-center justify-center gap-2 pb-2">
                <span className="text-pink-600 font-bold text-xl leading-none">{new Date(order.created_at).getDate()}</span>
                <span className="text-xs font-semibold text-gray-700 uppercase">{new Date(order.created_at).toLocaleString('pt-BR', { month: 'short' })}</span>
                <span className="text-xs text-gray-400">{new Date(order.created_at).getFullYear()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 🎫 Componente para exibir Ingressos
const TicketsSection = ({ userEmail }: { userEmail: string }) => {
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserTickets();
  }, []);

  const fetchUserTickets = async () => {
    try {
      setIsLoading(true);
      console.log('🎫 Buscando ingressos do usuário...');

      // Buscar o usuário atual
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Erro ao obter usuário:', authError);
        return;
      }

      // Primeiro tentar com buyer_id
      let ticketsData = null;
      let error = null;

      console.log('🔄 Tentando buscar ingressos com buyer_id...');
      const { data: buyerTicketsData, error: buyerTicketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          event:events!inner(title, description, start_date, location, banner_url, price)
        `)
        .eq('buyer_id', user.id)
        .in('status', ['active', 'used'])
        .order('created_at', { ascending: false });

      if (buyerTicketsError) {
        console.log('⚠️ buyer_id não existe, tentando com user_id...');
        // Fallback: buscar por user_id se buyer_id não existir
        const { data: userTicketsData, error: userTicketsError } = await supabase
          .from('tickets')
          .select(`
            *,
            event:events!inner(title, description, start_date, location, banner_url, price)
          `)
          .eq('user_id', user.id)
          .in('status', ['active', 'used'])
          .order('created_at', { ascending: false });

        ticketsData = userTicketsData;
        error = userTicketsError;
      } else {
        ticketsData = buyerTicketsData;
      }

      if (error) {
        console.error('❌ Erro ao buscar ingressos:', error);
        return;
      }

      console.log('✅ Ingressos encontrados:', ticketsData?.length || 0);
      setUserTickets(ticketsData || []);

    } catch (error) {
      console.error('❌ Erro inesperado ao buscar ingressos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'active': return 'bg-green-100 text-green-700';
      case 'used': return 'bg-gray-100 text-gray-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'active': return 'Confirmado';
      case 'used': return 'Usado';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconhecido';
    }
  };

  const now = new Date();
  const activeTickets = userTickets.filter(ticket => new Date(ticket.event.start_date) >= now);
  const pastTickets = userTickets.filter(ticket => new Date(ticket.event.start_date) < now);

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
        <span className="ml-2 text-gray-600">Carregando ingressos...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-pink-600 mb-2">Próximos eventos</h2>
        <div className="border-b border-gray-200 mb-4" />
        {activeTickets.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-400 font-medium">
            Nenhum ingresso disponível
          </div>
        ) : (
          <div className="flex flex-col gap-4">
                          {activeTickets.map((ticket) => (
                <div key={ticket.id} className="flex flex-col sm:flex-row items-center bg-white rounded-xl shadow border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Data (desktop only) */}
                  <div className="hidden sm:flex flex-col items-center justify-center p-4 min-w-[80px]">
                    <span className="text-pink-600 font-bold text-2xl leading-none">{new Date(ticket.event.start_date).getDate()}</span>
                    <span className="text-xs font-semibold text-gray-700 uppercase">{new Date(ticket.event.start_date).toLocaleString('pt-BR', { month: 'short' })}</span>
                    <span className="text-xs text-gray-400">{new Date(ticket.event.start_date).getFullYear()}</span>
                  </div>
                {/* Imagem sempre primeiro no mobile */}
                <img 
                  src={ticket.event.banner_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiByeD0iOCIgZmlsbD0iI0YzNjhBNyIvPgo8dGV4dCB4PSI0MCIgeT0iNDUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkV2ZW50bzwvdGV4dD4KPC9zdmc+'} 
                  alt={ticket.event.title} 
                  className="w-20 h-20 object-cover rounded-full mx-auto my-2 sm:mx-4 sm:my-0 order-1" 
                />
                {/* Detalhes */}
                <div className="flex-1 flex flex-col justify-center px-2 py-2 text-center sm:text-left order-2">
                  <div className="font-bold text-lg text-gray-800 leading-tight">{ticket.event.title}</div>
                  <div className="text-sm text-pink-700 font-semibold leading-tight">{ticket.event.location}</div>
                  <div className="text-xs text-gray-500 leading-tight">Código: {ticket.code}</div>
                </div>
                {/* Botão VER INGRESSO + Status */}
                <div className="flex flex-col items-center justify-center sm:justify-end p-4 w-full sm:w-auto order-3 gap-2">
                  <Link 
                    to={`/ingresso/${ticket.id}`} 
                    className="border border-pink-500 text-pink-600 font-bold rounded-lg px-6 py-2 hover:bg-pink-50 transition-colors text-xs shadow-sm w-full sm:w-auto text-center"
                  >
                    VER INGRESSO
                  </Link>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                    {getStatusText(ticket.status)}
                  </span>
                </div>
                                  {/* Data (mobile only, abaixo do status) */}
                  <div className="flex sm:hidden flex-row items-center justify-center gap-2 pb-2">
                    <span className="text-pink-600 font-bold text-xl leading-none">{new Date(ticket.event.start_date).getDate()}</span>
                    <span className="text-xs font-semibold text-gray-700 uppercase">{new Date(ticket.event.start_date).toLocaleString('pt-BR', { month: 'short' })}</span>
                    <span className="text-xs text-gray-400">{new Date(ticket.event.start_date).getFullYear()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-pink-600 mb-2">Eventos passados</h2>
        <div className="border-b border-gray-200 mb-4" />
        {pastTickets.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-400 font-medium">
            Nenhum ingresso disponível
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pastTickets.map((ticket) => (
              <div key={ticket.id} className="flex flex-col sm:flex-row items-center bg-white rounded-xl shadow border border-gray-200 overflow-hidden hover:shadow-md transition-shadow opacity-75">
                {/* Data (desktop only) */}
                <div className="hidden sm:flex flex-col items-center justify-center p-4 min-w-[80px]">
                  <span className="text-pink-600 font-bold text-2xl leading-none">{new Date(ticket.event.start_date).getDate()}</span>
                  <span className="text-xs font-semibold text-gray-700 uppercase">{new Date(ticket.event.start_date).toLocaleString('pt-BR', { month: 'short' })}</span>
                  <span className="text-xs text-gray-400">{new Date(ticket.event.start_date).getFullYear()}</span>
                </div>
                {/* Imagem sempre primeiro no mobile */}
                <img 
                  src={ticket.event.banner_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiByeD0iOCIgZmlsbD0iI0YzNjhBNyIvPgo8dGV4dCB4PSI0MCIgeT0iNDUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkV2ZW50bzwvdGV4dD4KPC9zdmc+'} 
                  alt={ticket.event.title} 
                  className="w-20 h-20 object-cover rounded-full mx-auto my-2 sm:mx-4 sm:my-0 order-1" 
                />
                {/* Detalhes */}
                <div className="flex-1 flex flex-col justify-center px-2 py-2 text-center sm:text-left order-2">
                  <div className="font-bold text-lg text-gray-800 leading-tight">{ticket.event.title}</div>
                  <div className="text-sm text-pink-700 font-semibold leading-tight">{ticket.event.location}</div>
                  <div className="text-xs text-gray-500 leading-tight">Código: {ticket.code}</div>
                </div>
                {/* Botão VER INGRESSO + Status */}
                <div className="flex flex-col items-center justify-center sm:justify-end p-4 w-full sm:w-auto order-3 gap-2">
                  <Link 
                    to={`/ingresso/${ticket.id}`} 
                    className="border border-gray-400 text-gray-600 font-bold rounded-lg px-6 py-2 hover:bg-gray-50 transition-colors text-xs shadow-sm w-full sm:w-auto text-center"
                  >
                    VER INGRESSO
                  </Link>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                    {getStatusText(ticket.status)}
                  </span>
                </div>
                {/* Data (mobile only, abaixo do status) */}
                <div className="flex sm:hidden flex-row items-center justify-center gap-2 pb-2">
                  <span className="text-pink-600 font-bold text-xl leading-none">{new Date(ticket.event.start_date).getDate()}</span>
                  <span className="text-xs font-semibold text-gray-700 uppercase">{new Date(ticket.event.start_date).toLocaleString('pt-BR', { month: 'short' })}</span>
                  <span className="text-xs text-gray-400">{new Date(ticket.event.start_date).getFullYear()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const dummyContent = (
  user: { name: string; email: string },
  handleBackToMenu: () => void,
  setActiveMenu: (key: string) => void,
  handleMenuSelect: (key: string) => void
) => ({
  tickets: <TicketsSection userEmail={user.email} />,
  orders: <OrdersSection userEmail={user.email} />,
  info: (
    <div className="w-full max-w-2xl mx-auto">
      {/* Botão de voltar */}
      <button
        onClick={handleBackToMenu}
        className="flex items-center gap-2 mb-6 text-gray-800 font-medium focus:outline-none bg-transparent border-none px-0 py-0 shadow-none hover:underline"
        style={{ boxShadow: 'none', border: 'none', background: 'none' }}
      >
        <ChevronRight className="h-5 w-5 rotate-180 text-gray-400" /> Voltar
      </button>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-pink-600 flex items-center justify-center text-white text-2xl font-bold uppercase">
            {getInitials(user.name)}
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{user.name}</div>
            <div className="text-gray-500 text-sm">{user.email}</div>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {/* Meu perfil */}
          <button className="w-full flex items-center justify-between py-4 group hover:bg-pink-50 transition rounded-xl px-2" onClick={() => setActiveMenu('edit-profile')}>
            <div>
              <div className="font-medium text-gray-900">Meu perfil</div>
              <div className="text-xs text-gray-500">Confira suas informações</div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-pink-600" />
          </button>
          {/* Alterar senha */}
          <button className="w-full flex items-center justify-between py-4 group hover:bg-pink-50 transition rounded-xl px-2" onClick={() => setActiveMenu('change-password')}>
            <div>
              <div className="font-medium text-gray-900">Alterar senha</div>
              <div className="text-xs text-gray-500">Atualize sua senha de acesso</div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-pink-600" />
          </button>
          {/* Telefone */}
          <button className="w-full flex items-center justify-between py-4 group hover:bg-pink-50 transition rounded-xl px-2" onClick={() => setActiveMenu('phone')}>
            <div>
              <div className="font-medium text-gray-900">Telefone</div>
              <div className="text-xs text-pink-500">Não verificado</div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-pink-600" />
          </button>
          {/* Excluir conta */}
          <button className="w-full flex items-center justify-between py-4 group hover:bg-pink-50 transition rounded-xl px-2" onClick={() => setActiveMenu('delete-account')}>
            <div>
              <div className="font-medium text-gray-900">Excluir conta</div>
              <div className="text-xs text-gray-500">Remover permanentemente</div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-pink-600" />
          </button>
          {/* Sair */}
          <button className="w-full flex items-center justify-between py-4 group hover:bg-pink-50 transition rounded-xl px-2" onClick={() => handleMenuSelect('logout')}>
            <div>
              <div className="font-medium text-gray-900">Sair</div>
              <div className="text-xs text-gray-500">Encerrar sessão</div>
            </div>
            <LogOut className="h-5 w-5 text-gray-400 group-hover:text-pink-600" />
          </button>
        </div>
      </div>
    </div>
  ),
  'edit-profile': (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <button
        onClick={() => setActiveMenu('info')}
        className="flex items-center gap-2 mb-6 text-gray-800 font-medium focus:outline-none bg-transparent border-none px-0 py-0 shadow-none hover:underline"
        style={{ boxShadow: 'none', border: 'none', background: 'none' }}
      >
        <ChevronRight className="h-5 w-5 rotate-180 text-gray-400" /> Voltar
      </button>
      <form className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 flex flex-col gap-4 w-full max-w-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Editar dados</h2>
        <input className="w-full border rounded px-3 py-2" placeholder="Nome completo" defaultValue={user.name} />
        <input className="w-full border rounded px-3 py-2" placeholder="Email" defaultValue={user.email} />
        <div className="flex gap-2">
          <select className="w-1/2 border rounded px-3 py-2">
            <option>Brasil</option>
            <option>Portugal</option>
            <option>Angola</option>
            <option>Moçambique</option>
            <option>Outro</option>
          </select>
          <input className="w-1/2 border rounded px-3 py-2" placeholder="Telefone" />
        </div>
        <div className="flex gap-2">
          <select className="w-1/2 border rounded px-3 py-2">
            <option>CPF</option>
            <option>RG</option>
            <option>Passaporte</option>
            <option>Outro</option>
          </select>
          <input className="w-1/2 border rounded px-3 py-2" placeholder="Número do documento" />
        </div>
        <input className="w-full border rounded px-3 py-2" placeholder="CEP" />
        <button type="submit" className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors mt-4">Salvar</button>
      </form>
    </div>
  ),
  'change-password': (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <button
        onClick={() => setActiveMenu('info')}
        className="flex items-center gap-2 mb-6 text-gray-800 font-medium focus:outline-none bg-transparent border-none px-0 py-0 shadow-none hover:underline"
        style={{ boxShadow: 'none', border: 'none', background: 'none' }}
      >
        <ChevronRight className="h-5 w-5 rotate-180 text-gray-400" /> Voltar
      </button>
      <form className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 flex flex-col gap-4 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Alterar senha</h2>
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="Senha atual" />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="Nova senha" />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="Confirmar nova senha" />
        <button type="submit" className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors mt-4">Salvar</button>
      </form>
    </div>
  ),
  phone: (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <button
        onClick={() => setActiveMenu('info')}
        className="flex items-center gap-2 mb-6 text-gray-800 font-medium focus:outline-none bg-transparent border-none px-0 py-0 shadow-none hover:underline"
        style={{ boxShadow: 'none', border: 'none', background: 'none' }}
      >
        <ChevronRight className="h-5 w-5 rotate-180 text-gray-400" /> Voltar
      </button>
      <form className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 flex flex-col gap-4 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Verificar telefone</h2>
        <input className="w-full border rounded px-3 py-2" type="tel" placeholder="Digite seu número de telefone" />
        <button type="submit" className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors mt-4">Enviar código</button>
        <input className="w-full border rounded px-3 py-2" type="text" placeholder="Código de verificação" />
        <button type="button" className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors">Verificar</button>
      </form>
    </div>
  ),
  'delete-account': (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 flex flex-col gap-6 w-full max-w-md items-center">
        <h2 className="text-2xl font-bold text-red-600 mb-2 text-center">Excluir conta</h2>
        <p className="text-gray-700 text-center">Tem certeza que deseja excluir sua conta? <br/>Esta ação é <span className='text-red-600 font-semibold'>irreversível</span> e todos os seus dados serão permanentemente removidos.</p>
        <div className="flex gap-4 justify-center mt-4">
          <button
            onClick={() => setActiveMenu('info')}
            className="flex items-center gap-2 text-gray-800 font-medium focus:outline-none bg-transparent border-none px-0 py-0 shadow-none hover:underline"
            style={{ boxShadow: 'none', border: 'none', background: 'none' }}
          >
            <ChevronRight className="h-5 w-5 rotate-180 text-gray-400" /> Cancelar
          </button>
          <button
            onClick={() => {/* ação de exclusão */}}
            className="flex items-center gap-2 text-red-600 font-medium focus:outline-none bg-transparent border-none px-0 py-0 shadow-none hover:underline"
            style={{ boxShadow: 'none', border: 'none', background: 'none' }}
          >
            Excluir conta
          </button>
        </div>
      </div>
    </div>
  ),
  support: (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <button
        onClick={() => setActiveMenu('info')}
        className="flex items-center gap-2 mb-6 text-gray-800 font-medium focus:outline-none bg-transparent border-none px-0 py-0 shadow-none hover:underline"
        style={{ boxShadow: 'none', border: 'none', background: 'none' }}
      >
        <ChevronRight className="h-5 w-5 rotate-180 text-gray-400" /> Voltar
      </button>
      <form className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 flex flex-col gap-4 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Suporte por SMS</h2>
        <input className="w-full border rounded px-3 py-2" type="tel" placeholder="Seu número de telefone" />
        <textarea className="w-full border rounded px-3 py-2" rows={4} placeholder="Digite sua mensagem"></textarea>
        <button type="submit" className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors mt-4">Enviar SMS</button>
      </form>
      <div className="w-full max-w-md mt-6">
        <h3 className="text-lg font-semibold mb-2">Mensagens</h3>
        <div className="bg-gray-50 rounded-lg p-4 min-h-[80px] flex flex-col gap-2">
          {(Array.isArray(window.__supportMessages) ? window.__supportMessages : []).map((msg: {id: number, text: string, from: string}) => (
            <div key={msg.id} className={`text-sm ${msg.from === 'system' ? 'text-gray-700' : 'text-pink-600'}`}>{msg.text}</div>
          ))}
        </div>
      </div>
    </div>
  ),
});

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState([
    // Mensagem automática inicial
    { id: 1, text: 'Olá! Como podemos ajudar?', from: 'system', read: false }
  ]);
  const [supportBadge, setSupportBadge] = useState(1); // Começa com 1 mensagem automática

  useEffect(() => {
    if (user && user.role === 'organizer') {
      navigate('/organizer-dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Verificar se há mensagem de sucesso da compra
  useEffect(() => {
    if (location.state?.message && location.state?.showSuccess) {
      setSuccessMessage(location.state.message);
      // Limpar o estado para não mostrar novamente
      window.history.replaceState({}, document.title);
      
      // Auto-ocultar após 10 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 10000);
    }
  }, [location.state]);

  // Sempre que abrir o suporte, cria nova mensagem automática e zera badge
  useEffect(() => {
    if (activeMenu === 'support') {
      setSupportMessages(prev => [
        ...prev,
        { id: prev.length + 1, text: 'Mensagem automática do sistema.', from: 'system', read: false }
      ]);
      setSupportBadge(0);
    }
  }, [activeMenu]);

  const handleMenuSelect = (key: string) => {
    if (key === 'logout') {
      logout();
      navigate('/');
      return;
    }
    if (key === 'home') {
      navigate('/');
      return;
    }
    // Se for suporte e badge zerado, incrementa badge ao receber resposta
    if (key === 'support' && supportBadge === 0) {
      // Simula resposta automática após 2s
      setTimeout(() => {
        setSupportMessages(prev => [
          ...prev,
          { id: prev.length + 1, text: 'Sua mensagem foi recebida! Em breve responderemos.', from: 'system', read: false }
        ]);
        setSupportBadge(b => b + 1);
      }, 2000);
    }
    setActiveMenu(key);
  };

  const handleBackToMenu = () => setActiveMenu(null);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso negado</h2>
          <p className="text-gray-600 mb-8">Você precisa estar logado para acessar esta página.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors"
          >
            Fazer login
          </button>
        </div>
      </div>
    );
  }

  const menuCards = [
    { key: 'tickets', label: 'Meus ingressos', icon: <QrCode className="h-8 w-8" />, color: 'from-pink-100 to-pink-50' },
    { key: 'orders', label: 'Meus pedidos', icon: <BarChart3 className="h-8 w-8" />, color: 'from-pink-100 to-pink-50' },
    { key: 'info', label: 'Meus dados', icon: <User className="h-8 w-8" />, color: 'from-pink-100 to-pink-50', showStatus: true },
    {
      key: 'support',
      label: 'Atendimento',
      icon: (
        <span className="relative">
          <MessageCircle className="h-8 w-8 animate-bounce" />
          {supportBadge > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold animate-pulse">
              {supportBadge}
            </span>
          )}
        </span>
      ),
      color: 'from-pink-100 to-pink-50'
    },
    { key: 'logout', label: 'Sair', icon: <LogOut className="h-8 w-8" />, color: 'from-pink-100 to-pink-50' },
    { key: 'home', label: 'Voltar para o site', icon: <ArrowLeft className="h-8 w-8" />, color: 'from-pink-100 to-pink-50' },
  ];

  // Mobile: menu ou conteúdo
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Modal de Sucesso da Compra */}
      {successMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Compra Realizada!</h3>
              <div className="text-sm text-gray-500 whitespace-pre-line text-left bg-gray-50 p-4 rounded-lg">
                {successMessage}
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="mt-6 w-full bg-pink-600 text-white py-3 rounded-lg font-bold hover:bg-pink-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <main className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center w-full">
        {/* Estado inicial: menu com perfil */}
        {(!activeMenu || (!isMobile && !activeMenu)) && (
          <>
            <div className="flex flex-col items-center mb-10 transition-all duration-300">
              <div className="w-20 h-20 rounded-full bg-pink-600 flex items-center justify-center text-white text-3xl font-bold uppercase mb-2 shadow-md">
                {getInitials(user.name)}
              </div>
              <div className="text-lg font-semibold text-gray-900 text-center">{user.name}</div>
            </div>
            <div
              className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 justify-center mx-auto"
            >
              {menuCards.map((item, idx) => (
                <React.Fragment key={item.key}>
                  <button
                    onClick={() => handleMenuSelect(item.key)}
                    className={
                      `group relative flex items-center md:flex-col md:items-center justify-between md:justify-center p-4 md:p-8 rounded-2xl border-2 border-pink-400 bg-gradient-to-br ${item.color} shadow-md hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-400 w-full md:min-w-[160px] md:min-h-[160px]`
                    }
                    tabIndex={0}
                    aria-label={item.label}
                  >
                    <span className="mr-4 md:mr-0 text-pink-600 group-hover:scale-110 transition-transform flex-shrink-0">{item.icon}</span>
                    <span className="font-semibold text-lg text-gray-800 mb-1 md:mb-0 text-left md:text-center flex-1">
                      {item.label}
                      {item.showStatus && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${user.email.includes('verificado') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{user.email.includes('verificado') ? 'Verificado' : 'Não verificado'}</span>
                      )}
                    </span>
                    {/* Animação de destaque */}
                    <span className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-pink-500 transition-all pointer-events-none"></span>
                  </button>
                  {/* Divider para mobile, exceto no último item */}
                  {idx < menuCards.length - 1 && (
                    <div className="block md:hidden w-[100vw] -ml-4 border-b border-pink-300" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </>
        )}
        {/* Conteúdo selecionado */}
        {activeMenu && (
          <div className="w-full max-w-4xl mx-auto">
            {/* Mobile: botão de voltar */}
            {isMobile && (
              <button
                onClick={handleBackToMenu}
                className="flex items-center gap-2 mb-6 text-pink-600 font-semibold text-base focus:outline-none"
              >
                <ArrowLeft className="h-5 w-5" /> Voltar ao menu
              </button>
            )}
            {/* Desktop: menu no topo */}
            {!isMobile && (
              <div className="flex justify-center gap-4 mb-8 animate-fade-in">
                {menuCards.filter(item => item.key !== 'logout' && item.key !== 'home').map(item => (
                  <button
                    key={item.key}
                    onClick={() => setActiveMenu(item.key)}
                    className={`flex flex-col items-center px-6 py-2 rounded-lg border-b-2 ${activeMenu === item.key ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500 hover:text-pink-600'} transition-colors`}
                  >
                    <span>{item.icon}</span>
                    <span className="text-xs mt-1 font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="bg-white rounded-xl shadow p-6 min-h-[200px] animate-fade-in">
              {/* Aqui você pode renderizar o conteúdo real de cada página */}
              {dummyContent(user, handleBackToMenu, setActiveMenu, handleMenuSelect)[activeMenu as keyof ReturnType<typeof dummyContent>] || <div>Conteúdo</div>}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;