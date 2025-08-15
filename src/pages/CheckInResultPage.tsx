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
    pageBg: 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700',
    btnBg: 'bg-white text-orange-800 hover:bg-orange-50',
    accent: 'text-orange-100',
    icon: <AlertTriangle className="h-7 w-7 text-white" />,
    title: 'Check-in duplicado',
    subtitle: 'Este ingresso já havia sido validado anteriormente'
  },
  not_found: {
    pageBg: 'bg-gradient-to-br from-red-500 via-red-600 to-red-700',
    btnBg: 'bg-white text-red-800 hover:bg-red-50',
    accent: 'text-red-100',
    icon: <XCircle className="h-7 w-7 text-white" />,
    title: 'Ingresso não encontrado',
    subtitle: 'Não foi possível localizar os dados deste QR Code'
  }
};

const CheckInResultPage: React.FC = () => {
  const location = useLocation() as any;
  const navigate = useNavigate();
  const status: StatusKind = location.state?.status || 'not_found';
  const ticket: TicketData | null = location.state?.ticket || null;

  const s = statusStyles[status];

  const handleClose = () => {
    navigate('/checkin?openScanner=1');
  };

  return (
    <div className={`min-h-screen ${s.pageBg} flex flex-col items-center justify-center p-4`}> 
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
              <div className="flex items-center gap-3">
                <div className="bg-pink-100 text-pink-700 w-10 h-10 rounded-full flex items-center justify-center shadow-sm">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Participante</div>
                  <div className="text-gray-900 font-semibold">{ticket.name}</div>
                  {ticket.email && <div className="text-xs text-gray-500">{ticket.email}</div>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center shadow-sm">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Evento</div>
                  <div className="text-gray-900 font-semibold">{ticket.event_title || 'Evento'}</div>
                  <div className="text-xs text-gray-500">{ticket.event_date ? new Date(ticket.event_date).toLocaleString('pt-BR') : ''}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-gray-100 text-gray-700 w-10 h-10 rounded-full flex items-center justify-center shadow-sm">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Local</div>
                  <div className="text-gray-900 font-semibold">{ticket.event_location || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/70 backdrop-blur rounded-lg p-3 border border-white/50">
                  <div className="text-xs text-gray-600">Tipo de ingresso</div>
                  <div className="text-gray-900 font-semibold">{ticket.ticket_type || 'Ingresso'}</div>
                  {ticket.ticket_area && (
                    <div className="text-xs text-gray-500 mt-1">{ticket.ticket_area}</div>
                  )}
                </div>
                <div className="bg-white/70 backdrop-blur rounded-lg p-3 border border-white/50">
                  <div className="text-xs text-gray-600">Valor</div>
                  <div className="text-gray-900 font-semibold">R$ {(ticket.ticket_price ?? 0).toFixed(2).replace('.', ',')}</div>
                  {ticket.ticket_price_feminine && ticket.ticket_price_feminine !== ticket.ticket_price && (
                    <div className="text-xs text-gray-500 mt-1">Feminino: R$ {ticket.ticket_price_feminine.toFixed(2).replace('.', ',')}</div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleClose}
                  className={`w-full py-3 rounded-lg font-semibold shadow-lg ${s.btnBg} transition flex items-center justify-center gap-2`}
                >
                  Voltar ao scanner
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