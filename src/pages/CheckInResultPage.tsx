import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, XCircle, Calendar, MapPin, User } from 'lucide-react';

type StatusKind = 'success' | 'duplicate' | 'not_found';

interface TicketData {
  id: string;
  name: string;
  email?: string;
  event_title?: string;
  event_date?: string;
  event_location?: string;
  ticket_type?: string;
  ticket_area?: string;
  ticket_price?: number;
  ticket_price_feminine?: number;
  qr_code?: string;
  purchased_at?: string;
  is_checked_in?: boolean;
  checked_in_at?: string | null;
  ticket_id?: string;
  event_id?: string;
  organizer_id?: string;
  ticket_user_id?: string;
  source?: string;
  // Novos campos do ticket_types_with_batches
  ticket_type_id?: string;
  ticket_description?: string;
  ticket_batch_name?: string;
}

const statusStyles: Record<StatusKind, { pageBg: string; btnBg: string; accent: string; icon: React.ReactNode; title: string; subtitle: string } > = {
  success: {
    pageBg: 'bg-gradient-to-br from-green-500 via-green-600 to-green-700',
    btnBg: 'bg-white text-green-700 hover:bg-green-50',
    accent: 'text-green-100',
    icon: <CheckCircle className="h-7 w-7 text-white" />,
    title: 'Acesso liberado',
    subtitle: 'Participante confirmado com sucesso'
  },
  duplicate: {
    pageBg: 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800',
    btnBg: 'bg-white text-amber-800 hover:bg-amber-50',
    accent: 'text-amber-100',
    icon: <AlertTriangle className="h-7 w-7 text-white" />,
    title: 'Check-in realizado',
    subtitle: 'Este ingresso já havia sido validado anteriormente'
  },
  not_found: {
    pageBg: 'bg-gradient-to-br from-red-500 via-red-600 to-red-700',
    btnBg: 'bg-white text-red-800 hover:bg-red-50',
    accent: 'text-red-100',
    icon: <XCircle className="h-7 w-7 text-white" />,
    title: 'Usuário não encontrado',
    subtitle: 'Não foi possível localizar os dados deste QR Code'
  }
};

const CheckInResultPage: React.FC = () => {
  const location = useLocation() as any;
  const navigate = useNavigate();
  const ticket: TicketData | null = location.state?.ticket || null;
  
  // Determinar status baseado nos dados do ticket
  let status: StatusKind = 'not_found';
  
  if (ticket) {
    if (ticket.is_checked_in && ticket.checked_in_at) {
      status = 'duplicate';
    } else if (ticket.name && ticket.event_title) {
      status = 'success';
    } else {
      status = 'not_found';
    }
  }
  
  // Debug: mostrar dados recebidos
  console.log('🔍 [CheckInResultPage] Status determinado:', status);
  console.log('🔍 [CheckInResultPage] Ticket recebido:', ticket);
  console.log('🔍 [CheckInResultPage] Campos disponíveis:', ticket ? Object.keys(ticket) : 'Nenhum ticket');
  console.log('🔍 [CheckInResultPage] is_checked_in:', ticket?.is_checked_in);
  console.log('🔍 [CheckInResultPage] checked_in_at:', ticket?.checked_in_at);
  console.log('🔍 [CheckInResultPage] event_title:', ticket?.event_title);
  console.log('🔍 [CheckInResultPage] event_location:', ticket?.event_location);
  console.log('🔍 [CheckInResultPage] ticket_type:', ticket?.ticket_type);
  console.log('🔍 [CheckInResultPage] ticket_area:', ticket?.ticket_area);
  console.log('🔍 [CheckInResultPage] ticket_price:', ticket?.ticket_price);
  console.log('🔍 [CheckInResultPage] ticket_price_feminine:', ticket?.ticket_price_feminine);

  const s = statusStyles[status];

  const handleClose = () => {
    navigate('/checkin?openScanner=1');
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${s.pageBg}`}> 
      <div className="w-full max-w-2xl">
        {/* Cabeçalho compacto dentro do card */}
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 rounded-full p-3 flex items-center justify-center shadow-sm">
            {s.icon}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white drop-shadow-sm">{s.title}</h1>
            <p className={`${s.accent} text-sm`}>{s.subtitle}</p>
          </div>
        </div>

        {/* Card com efeito "fumê" (glass) */}
        <div className="rounded-2xl border border-white/30 bg-white/80 backdrop-blur-md shadow-xl p-5">
          {ticket ? (
            <div className="space-y-4">
              {/* Participante - Destaque principal */}
              <div className="bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
                <div className="flex items-center gap-3">
                  <div className="bg-pink-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-pink-600 font-medium">Participante</div>
                    <div className="text-xl font-bold text-gray-900">{ticket.name}</div>
                    {ticket.email && <div className="text-sm text-gray-600 mt-1">{ticket.email}</div>}
                  </div>
                </div>
              </div>

              {/* Evento - Destaque secundário */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-blue-600 font-medium">Evento</div>
                    <div className="text-lg font-bold text-gray-900">
                      {ticket.event_title && ticket.event_title !== 'Evento' 
                        ? ticket.event_title 
                        : 'Nome do evento não informado'
                      }
                    </div>
                    {ticket.event_date && ticket.event_date !== new Date().toISOString() && (
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(ticket.event_date).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Local - Destaque secundário */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-green-600 font-medium">Local</div>
                    <div className="text-lg font-bold text-gray-900">
                      {ticket.event_location && ticket.event_location !== 'Local não informado' 
                        ? ticket.event_location 
                        : 'Local não informado'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações do Ingresso - Grid melhorado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="text-sm text-purple-600 font-medium mb-2">Tipo de Ingresso</div>
                  <div className="text-lg font-bold text-gray-900">
                    {ticket.ticket_type && ticket.ticket_type !== 'Ingresso' 
                      ? ticket.ticket_type 
                      : 'Tipo não informado'
                    }
                  </div>
                  {ticket.ticket_area && ticket.ticket_area !== 'Área não informada' && (
                    <div className="text-sm text-gray-600 mt-2 bg-white/50 px-2 py-1 rounded-lg inline-block">
                      Área: {ticket.ticket_area}
                    </div>
                  )}
                  {ticket.ticket_batch_name && (
                    <div className="text-sm text-gray-600 mt-2 bg-white/50 px-2 py-1 rounded-lg inline-block">
                      Lote: {ticket.ticket_batch_name}
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <div className="text-sm text-orange-600 font-medium mb-2">Valor do Ingresso</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {ticket.ticket_price === 0 ? (
                      <span className="text-green-600">🎫 GRATUITO</span>
                    ) : ticket.ticket_price && ticket.ticket_price > 0 ? (
                      `R$ ${ticket.ticket_price.toFixed(2).replace('.', ',')}`
                    ) : (
                      <span className="text-gray-500">Valor não informado</span>
                    )}
                  </div>
                  {ticket.ticket_price_feminine && ticket.ticket_price_feminine !== (ticket.ticket_price ?? 0) && (ticket.ticket_price ?? 0) > 0 && (
                    <div className="text-sm text-gray-600 mt-2 bg-white/50 px-2 py-1 rounded-lg">
                      Feminino: R$ {ticket.ticket_price_feminine.toFixed(2).replace('.', ',')}
                    </div>
                  )}
                  {ticket.ticket_price && ticket.ticket_price > 0 && (
                    <div className="text-sm text-gray-600 mt-2 bg-white/50 px-2 py-1 rounded-lg">
                      Preço padrão: R$ {ticket.ticket_price.toFixed(2).replace('.', ',')}
                    </div>
                  )}
                </div>
              </div>

              {/* Descrição do Ingresso - Se disponível */}
              {ticket.ticket_description && (
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-lg">ℹ️</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-indigo-600 font-medium">Descrição do Ingresso</div>
                      <div className="text-lg font-bold text-gray-900">
                        {ticket.ticket_description}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Informação adicional para check-in duplicado */}
              {ticket.is_checked_in && ticket.checked_in_at && (
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-lg">⏰</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-amber-600 font-medium">Check-in Realizado Anteriormente</div>
                      <div className="text-lg font-bold text-gray-900">
                        {new Date(ticket.checked_in_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="text-sm text-amber-600 mt-2">
                        Este ingresso já foi validado anteriormente
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={handleClose}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl ${s.btnBg} transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-3`}
                >
                  <span>🔄</span>
                  Voltar ao Scanner
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-white/90 mb-4">Não há informações detalhadas para exibir.</div>
              <button
                onClick={handleClose}
                className={`w-full py-3 rounded-lg font-semibold shadow-lg ${s.btnBg} transition`}
              >
                Voltar ao scanner
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckInResultPage;