import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QrCode, Download, Calendar, MapPin, User, Settings, CreditCard, Heart, LogOut, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import EventStatusPage from './EventStatusPage';

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
  const [activeTab, setActiveTab] = useState('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState('');

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
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Success Message */}
          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{message}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-4 mb-6">
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

                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('tickets')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'tickets' ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <QrCode className="h-5 w-5" />
                    <span>Meus ingressos</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('events')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'events' ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span>Meus Pedidos</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'profile' ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span>Perfil</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('favorites')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'favorites' ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className="h-5 w-5" />
                    <span>Favoritos</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'settings' ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Settings className="h-5 w-5" />
                    <span>Configurações</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sair</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {activeTab === 'tickets' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-bold mb-6">Meus ingressos</h2>
                    
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
                        {tickets.map((ticket) => (
                          <div key={ticket.id} className="border border-gray-200 rounded-lg p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="text-lg font-semibold text-gray-900">{ticket.eventName}</h3>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                    {getStatusText(ticket.status)}
                                  </span>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(ticket.eventDate).toLocaleDateString('pt-BR')}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{ticket.eventLocation}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium">{ticket.ticketType}</span>
                                    <span>•</span>
                                    <span>{ticket.quantity} ingresso(s)</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-2">
                                <div className="bg-gray-100 p-3 rounded-lg">
                                  <QrCode className="h-12 w-12 text-gray-600" />
                                </div>
                                <button className="text-pink-600 hover:text-pink-700 text-sm font-medium flex items-center space-x-1">
                                  <Download className="h-4 w-4" />
                                  <span>Baixar</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'events' && <EventStatusPage />}

              {activeTab === 'profile' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-2xl font-bold mb-6">Perfil</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome completo
                      </label>
                      <input
                        type="text"
                        value={user.name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={user.email}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">País</label>
                      <input
                        type="text"
                        value={user.country || ''}
                        placeholder="Ex: Brasil"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                      <input
                        type="tel"
                        value={user.phone || ''}
                        placeholder="Ex: +55 11 91234-5678"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        readOnly
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de documento</label>
                        <input
                          type="text"
                          value={user.docType || ''}
                          placeholder="Ex: CPF, RG, Passaporte"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Número do documento</label>
                        <input
                          type="text"
                          value={user.docNumber || ''}
                          placeholder="Ex: 123.456.789-00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data de nascimento</label>
                        <input
                          type="date"
                          value={user.birthDate || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                        <input
                          type="text"
                          value={user.cep || ''}
                          placeholder="Ex: 01001-000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                          readOnly
                        />
                      </div>
                    </div>
                    <button className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors">
                      Editar perfil
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-2xl font-bold mb-6">Eventos favoritos</h2>
                  <div className="text-center py-12">
                    <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum evento favorito</h3>
                    <p className="text-gray-500">Favorite eventos para vê-los aqui.</p>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-2xl font-bold mb-6">Configurações</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Conta</h3>
                      <div className="space-y-3">
                        <button className="w-full px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-semibold hover:bg-yellow-200 transition-colors">
                          Alterar senha
                        </button>
                        <button className="w-full px-4 py-2 bg-red-100 text-red-800 rounded-lg font-semibold hover:bg-red-200 transition-colors">
                          Excluir conta
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-4">Notificações</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-3" defaultChecked />
                          <span>Notificações por email</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-3" defaultChecked />
                          <span>Notificações por WhatsApp</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-3" />
                          <span>Notificações push</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-4">Privacidade</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-3" defaultChecked />
                          <span>Perfil público</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-3" />
                          <span>Compartilhar dados para recomendações</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;