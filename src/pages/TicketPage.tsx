import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, FileText, QrCode } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTicketWithUser } from '../lib/supabase';
import TicketUserForm from '../components/TicketUserForm';
import TicketPDF from '../components/TicketPDF';
import SystemNotConfigured from '../components/SystemNotConfigured';
import QRCode from 'qrcode';

interface TicketData {
  id: string;
  event_id: string;
  user_id: string;
  ticket_user_id?: string;
  status: 'valid' | 'used' | 'cancelled' | 'expired';
  purchase_date: string;
  price: number;
  qr_code: string;
  check_in_date?: string;
  event: {
    id: string;
    name: string;
    date: string;
    time: string;
    location: string;
    description: string;
    image?: string;
  };
  ticket_user?: {
    id: string;
    name: string;
    email: string;
    document?: string;
  };
}

const TicketPage: React.FC = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [systemNotConfigured, setSystemNotConfigured] = useState(false);

  useEffect(() => {
    if (ticketId && user) {
      loadTicket();
    }
  }, [ticketId, user]);

  const loadTicket = async () => {
    if (!ticketId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const ticketData = await getTicketWithUser(ticketId);
      setTicket(ticketData);
      
      // Gerar QR Code se o usuário já foi definido
      if (ticketData.ticket_user_id && ticketData.qr_code) {
        const qrUrl = await QRCode.toDataURL(ticketData.qr_code, {
          width: 200,
          margin: 2,
          color: {
            dark: '#1f2937',
            light: '#ffffff'
          }
        });
        setQrCodeUrl(qrUrl);
      }
    } catch (error: any) {
      console.error('Erro ao carregar ingresso:', error);
      
      if (error.message?.includes('Could not find a relationship') || 
          error.message?.includes('ticket_users')) {
        setSystemNotConfigured(true);
      } else if (error.message?.includes('not found')) {
        setError('Ingresso não encontrado ou você não tem permissão para acessá-lo.');
      } else {
        setError('Erro ao carregar ingresso. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUserDefined = (updatedTicket: TicketData) => {
    setTicket(updatedTicket);
    setShowUserForm(false);
    loadTicket(); // Recarregar para pegar o QR code atualizado
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      valid: { label: 'Válido', color: 'bg-green-100 text-green-800', icon: '✅' },
      used: { label: 'Utilizado', color: 'bg-gray-100 text-gray-800', icon: '✓' },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: '❌' },
      expired: { label: 'Expirado', color: 'bg-yellow-100 text-yellow-800', icon: '⏰' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.valid;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Restrito</h2>
          <p className="text-gray-600 mb-6">Você precisa estar logado para ver este ingresso.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  if (systemNotConfigured) {
    return <SystemNotConfigured />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando ingresso...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ingresso não encontrado</h2>
          <p className="text-gray-600 mb-6">
            {error || 'Este ingresso não existe ou você não tem permissão para acessá-lo.'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Ticket Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Event Banner */}
          {ticket.event.image && (
            <div className="h-48 bg-gradient-to-r from-pink-500 to-purple-600 relative overflow-hidden">
              <img
                src={ticket.event.image}
                alt={ticket.event.name}
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div className="absolute bottom-4 left-6 text-white">
                <h1 className="text-2xl font-bold mb-1">{ticket.event.name}</h1>
                <p className="text-pink-100">{formatDate(ticket.event.date)}</p>
              </div>
            </div>
          )}

          {/* Ticket Content */}
          <div className="p-8">
            {/* Event Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Detalhes do Evento</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-pink-500">🕐</span>
                    <span className="text-gray-700">{ticket.event.time}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-pink-500">📍</span>
                    <span className="text-gray-700">{ticket.event.location}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-pink-500">💰</span>
                    <span className="text-gray-700">€{ticket.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-pink-500">🎫</span>
                    {getStatusBadge(ticket.status)}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Informações da Compra</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-pink-500">🆔</span>
                    <span className="text-gray-700 font-mono text-sm">{ticket.id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-pink-500">📅</span>
                    <span className="text-gray-700">
                      {new Date(ticket.purchase_date).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {ticket.check_in_date && (
                    <div className="flex items-center gap-3">
                      <span className="text-pink-500">✅</span>
                      <span className="text-gray-700">
                        Check-in: {new Date(ticket.check_in_date).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* User Section */}
            <div className="border-t border-gray-200 pt-8">
              {!ticket.ticket_user_id ? (
                /* Usuário não definido - Mostrar botão */
                <div className="text-center py-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                    <div className="text-blue-500 text-4xl mb-3">👤</div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      Defina o usuário do ingresso
                    </h3>
                    <p className="text-blue-700 text-sm mb-4">
                      Para gerar o QR Code e finalizar seu ingresso, você precisa informar os dados de quem irá utilizá-lo.
                    </p>
                    <button
                      onClick={() => setShowUserForm(true)}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <User className="w-5 h-5 inline mr-2" />
                      Definir Usuário
                    </button>
                  </div>
                </div>
              ) : (
                /* Usuário definido - Mostrar dados e QR Code */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* User Info */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">👤 Dados do Usuário</h3>
                    <div className="bg-gray-50 rounded-xl p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-pink-500" />
                          <div>
                            <p className="text-sm text-gray-500">Nome</p>
                            <p className="font-semibold text-gray-900">{ticket.ticket_user?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-pink-500" />
                          <div>
                            <p className="text-sm text-gray-500">E-mail</p>
                            <p className="font-semibold text-gray-900">{ticket.ticket_user?.email}</p>
                          </div>
                        </div>
                        {ticket.ticket_user?.document && (
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-pink-500" />
                            <div>
                              <p className="text-sm text-gray-500">Documento</p>
                              <p className="font-semibold text-gray-900">{ticket.ticket_user.document}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">📱 QR Code</h3>
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center">
                      {qrCodeUrl ? (
                        <div>
                          <img
                            src={qrCodeUrl}
                            alt="QR Code do Ingresso"
                            className="w-48 h-48 mx-auto mb-4 border border-gray-200 rounded-lg"
                          />
                          <p className="text-sm text-gray-600 mb-2">Código de Validação</p>
                          <p className="font-mono text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded">
                            {ticket.qr_code}
                          </p>
                        </div>
                      ) : (
                        <div className="py-8">
                          <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500">Gerando QR Code...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {ticket.ticket_user_id && (
              <div className="border-t border-gray-200 pt-8 mt-8">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <TicketPDF 
                    ticket={ticket} 
                    onDownload={() => console.log('PDF baixado com sucesso!')}
                  />
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-50 px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                  >
                    <span className="text-lg">🖨️</span>
                    Imprimir
                  </button>
                </div>
                
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="text-green-500 text-lg">✅</div>
                    <div>
                      <p className="text-green-800 font-medium mb-1">Ingresso Pronto!</p>
                      <p className="text-green-600 text-sm">
                        Seu ingresso está completo. Apresente o QR Code na entrada do evento ou baixe o PDF para imprimir.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Form Modal */}
      {showUserForm && ticketId && (
        <TicketUserForm
          ticketId={ticketId}
          onSuccess={handleUserDefined}
          onCancel={() => setShowUserForm(false)}
        />
      )}
    </div>
  );
};

export default TicketPage; 