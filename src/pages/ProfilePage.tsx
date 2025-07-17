import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route, NavLink, useMatch } from 'react-router-dom';
import { QrCode, User, Settings, Heart, LogOut, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Ticket {
  id: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  ticketType: string;
  quantity: number;
  qrCode: string;
  status: 'ativo' | 'usado' | 'expirado';
}

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Detecta rota ativa para highlight
  const matchTickets = useMatch('/profile/tickets');
  const matchOrders = useMatch('/profile/orders');
  const matchProfile = useMatch('/profile/info');
  const matchFavorites = useMatch('/profile/favorites');
  const matchSettings = useMatch('/profile/settings');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState('');
  // Estado para menu mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirecionar organizador para o dashboard
  useEffect(() => {
    if (user && user.isOrganizer) {
      navigate('/organizer-dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      if (location.state.newTickets) {
        setTickets(prev => [...prev, ...location.state.newTickets]);
      }
      // Limpar o state
      window.history.replaceState({}, document.title);
    }

    // Mock tickets existentes
    const mockTickets: Ticket[] = [
      {
        id: '1',
        eventName: 'Festa Julina Sorocaba',
        eventDate: '2025-07-15',
        eventLocation: 'Arena Sorocaba',
        ticketType: 'Pista',
        quantity: 2,
        qrCode: 'QR-ABC123',
        status: 'ativo'
      },
      {
        id: '2',
        eventName: 'Stand Up Comedy Night',
        eventDate: '2025-06-20',
        eventLocation: 'Teatro Municipal',
        ticketType: 'VIP',
        quantity: 1,
        qrCode: 'QR-XYZ789',
        status: 'usado'
      }
    ];

    setTickets(prev => prev.length === 0 ? mockTickets : prev);
  }, [location.state]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'usado': return 'bg-gray-100 text-gray-800';
      case 'expirado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ativo': return 'Ativo';
      case 'usado': return 'Usado';
      case 'expirado': return 'Expirado';
      default: return 'Desconhecido';
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Botão de abrir menu no mobile */}
      <div className="lg:hidden flex items-center justify-between px-4 mb-4">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-full bg-pink-100 text-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900">Meu Perfil</h2>
        <div></div>
      </div>
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{message}</p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            {/* Overlay para mobile */}
            {sidebarOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}></div>
            )}
            <aside className={`bg-white rounded-lg shadow-sm p-6 w-72 max-w-full z-50 fixed top-0 left-0 h-full transform transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:block`} style={{maxWidth: '90vw'}}>
              <div className="flex items-center justify-between mb-6 lg:mb-6">
                <div className="flex items-center space-x-4">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-pink-600 flex items-center justify-center text-white text-3xl font-bold uppercase">
                      {user.name ? user.name.charAt(0) : '?'}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                    <p className="text-gray-600">{user.email}</p>
                  </div>
                </div>
                {/* Botão de fechar no mobile */}
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 ml-2 rounded-full text-gray-500 hover:text-gray-800 focus:outline-none" aria-label="Fechar menu">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <nav className="space-y-2">
                <NavLink to="/profile/tickets" className={({isActive}) => `w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${isActive || matchTickets ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'}`} end onClick={() => setSidebarOpen(false)}>
                  <QrCode className="h-5 w-5" />
                  <span>Meus ingressos</span>
                </NavLink>
                <NavLink to="/profile/orders" className={({isActive}) => `w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${isActive || matchOrders ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setSidebarOpen(false)}>
                  <BarChart3 className="h-5 w-5" />
                  <span>Meus Pedidos</span>
                </NavLink>
                <NavLink to="/profile/info" className={({isActive}) => `w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${isActive || matchProfile ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setSidebarOpen(false)}>
                  <User className="h-5 w-5" />
                  <span>Perfil</span>
                </NavLink>
                <NavLink to="/profile/favorites" className={({isActive}) => `w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${isActive || matchFavorites ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setSidebarOpen(false)}>
                  <Heart className="h-5 w-5" />
                  <span>Favoritos</span>
                </NavLink>
                <NavLink to="/profile/settings" className={({isActive}) => `w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${isActive || matchSettings ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setSidebarOpen(false)}>
                  <Settings className="h-5 w-5" />
                  <span>Configurações</span>
                </NavLink>
                <button
                  onClick={() => { handleLogout(); setSidebarOpen(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </button>
              </nav>
            </aside>
            {/* Main Content */}
            <div className="lg:col-span-3">
              <Routes>
                <Route path="tickets" element={<ProfileTickets tickets={tickets} getStatusColor={getStatusColor} getStatusText={getStatusText} />} />
                <Route path="orders" element={<ProfileOrders />} />
                <Route path="info" element={<ProfileInfo user={user} />} />
                <Route path="favorites" element={<ProfileFavorites />} />
                <Route path="settings" element={<ProfileSettings />} />
                <Route path="*" element={<ProfileTickets tickets={tickets} getStatusColor={getStatusColor} getStatusText={getStatusText} />} />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componentes de cada seção do perfil

interface ProfileTicketsProps {
  tickets: Ticket[];
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}

function ProfileTickets({ tickets, getStatusColor, getStatusText }: ProfileTicketsProps) {
  const navigate = useNavigate();
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Meus Ingressos</h2>
      {tickets.length === 0 ? (
        <div className="text-center py-12">
          <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum ingresso encontrado</h3>
          <p className="text-gray-500 mb-6">Você ainda não comprou nenhum ingresso.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors"
          >
            Explorar eventos
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket: Ticket) => (
            <div key={ticket.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{ticket.eventName}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>{getStatusText(ticket.status)}</span>
                  </div>
                  <div className="text-gray-600 text-sm mb-1">{ticket.eventDate} • {ticket.eventLocation}</div>
                  <div className="text-gray-500 text-xs">Tipo: {ticket.ticketType} • Qtd: {ticket.quantity}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-gray-400">#{ticket.qrCode}</span>
                  <button className="text-pink-600 hover:underline text-xs">Ver QR Code</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProfileInfoProps {
  user: { name: string; email: string; avatar?: string; phone?: string };
}
function ProfileInfo({ user }: ProfileInfoProps) {
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
  });
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditing(false);
    setSuccess('Dados atualizados com sucesso!');
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Perfil</h2>
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-lg">
        {success && <div className="mb-4 p-2 bg-green-50 text-green-700 rounded">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500"
              disabled={!editing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500"
              disabled={!editing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500"
              disabled={!editing}
            />
          </div>
          <div className="flex gap-2 mt-4">
            {!editing ? (
              <button type="button" onClick={() => setEditing(true)} className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors">Editar</button>
            ) : (
              <>
                <button type="submit" className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors">Salvar</button>
                <button type="button" onClick={() => { setEditing(false); setForm({ name: user.name, email: user.email, phone: user.phone || '' }); }} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// Mock para pedidos
const mockOrders = [
  {
    id: 'A123',
    date: '2024-06-01',
    total: 120.00,
    status: 'Pago',
    items: [
      { name: 'Festa Julina Sorocaba', quantity: 2, price: 60.00 }
    ]
  },
  {
    id: 'B456',
    date: '2024-05-15',
    total: 200.00,
    status: 'Cancelado',
    items: [
      { name: 'Stand Up Comedy Night', quantity: 1, price: 200.00 }
    ]
  }
];

function ProfileOrders() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Meus Pedidos</h2>
      {mockOrders.length === 0 ? (
        <div className="text-gray-500">Você ainda não fez nenhum pedido.</div>
      ) : (
        <div className="space-y-4">
          {mockOrders.map(order => (
            <div key={order.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                <div>
                  <span className="font-semibold text-gray-900">Pedido #{order.id}</span>
                  <span className="ml-2 text-xs text-gray-500">{order.date}</span>
                </div>
                <div className="text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'Pago' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{order.status}</span>
                </div>
              </div>
              <ul className="text-sm text-gray-700 mb-2">
                {order.items.map((item, idx) => (
                  <li key={idx}>{item.quantity}x {item.name} <span className="text-gray-400">R$ {item.price.toFixed(2)}</span></li>
                ))}
              </ul>
              <div className="text-right font-bold text-gray-900">Total: R$ {order.total.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Mock para favoritos
const mockFavorites = [
  {
    id: 'E1',
    name: 'Festa Julina Sorocaba',
    date: '2025-07-15',
    location: 'Arena Sorocaba',
    image: 'https://via.placeholder.com/300x200?text=Festa+Julina'
  },
  {
    id: 'E2',
    name: 'Stand Up Comedy Night',
    date: '2025-06-20',
    location: 'Teatro Municipal',
    image: 'https://via.placeholder.com/300x200?text=Stand+Up'
  }
];

function ProfileFavorites() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Eventos Favoritos</h2>
      {mockFavorites.length === 0 ? (
        <div className="text-gray-500">Você ainda não favoritou nenhum evento.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {mockFavorites.map(event => (
            <div key={event.id} className="bg-white rounded-lg shadow-sm border p-3 flex flex-col">
              <img src={event.image} alt={event.name} className="rounded-md h-32 w-full object-cover mb-2" />
              <div className="font-semibold text-gray-900">{event.name}</div>
              <div className="text-xs text-gray-500 mb-1">{event.date} • {event.location}</div>
              <button className="mt-auto text-pink-600 hover:underline text-xs self-end">Remover</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileSettings() {
  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
    notifications: true,
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password && form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setSuccess('Configurações salvas com sucesso!');
    setTimeout(() => setSuccess(''), 2000);
    setForm(f => ({ ...f, password: '', confirmPassword: '' }));
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Configurações</h2>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 max-w-lg space-y-4">
        {success && <div className="p-2 bg-green-50 text-green-700 rounded">{success}</div>}
        {error && <div className="p-2 bg-red-50 text-red-700 rounded">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 focus:ring-pink-500 focus:border-pink-500"
            autoComplete="new-password"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="notifications"
            checked={form.notifications}
            onChange={handleChange}
            className="h-4 w-4 text-pink-600 border-gray-300 rounded"
            id="notifications"
          />
          <label htmlFor="notifications" className="text-sm text-gray-700">Receber notificações por e-mail</label>
        </div>
        <button type="submit" className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors">Salvar configurações</button>
      </form>
    </div>
  );
}

export default ProfilePage;