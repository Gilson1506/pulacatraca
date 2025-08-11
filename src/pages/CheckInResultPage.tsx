import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, XCircle, Calendar, MapPin, User } from 'lucide-react';

type StatusKind = 'success' | 'duplicate' | 'not_found';

const statusStyles: Record<StatusKind, { bg: string; gradient: string; title: string; icon: React.ReactNode; subtitle: string } > = {
  success: {
    bg: 'bg-green-600',
    gradient: 'bg-gradient-to-r from-green-500 to-green-600',
    title: 'Acesso liberado',
    icon: <CheckCircle className="h-7 w-7 text-white" />,
    subtitle: 'Participante confirmado com sucesso'
  },
  duplicate: {
    bg: 'bg-orange-700',
    gradient: 'bg-gradient-to-r from-orange-600 to-orange-700',
    title: 'Check-in duplicado',
    icon: <AlertTriangle className="h-7 w-7 text-white" />,
    subtitle: 'Este ingresso já havia sido validado anteriormente'
  },
  not_found: {
    bg: 'bg-red-700',
    gradient: 'bg-gradient-to-r from-red-600 to-red-700',
    title: 'Ingresso não encontrado',
    icon: <XCircle className="h-7 w-7 text-white" />,
    subtitle: 'Não foi possível localizar os dados deste QR Code'
  }
};

const CheckInResultPage: React.FC = () => {
  const location = useLocation() as any;
  const navigate = useNavigate();
  const status: StatusKind = location.state?.status || 'not_found';
  const ticket = location.state?.ticket || null;

  const s = statusStyles[status];

  const handleClose = () => {
    navigate('/checkin?openScanner=1');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className={`${s.gradient} text-white p-5 shadow relative`}>
        <div className="container mx-auto px-4 flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-3 flex items-center justify-center">
            {s.icon}
          </div>
          <div>
            <h1 className="text-xl font-bold">{s.title}</h1>
            <p className="text-white/90 text-sm">{s.subtitle}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow border border-gray-200 p-5">
          {ticket ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-pink-100 text-pink-700 w-10 h-10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Participante</div>
                  <div className="text-gray-900 font-semibold">{ticket.name}</div>
                  {ticket.email && <div className="text-xs text-gray-500">{ticket.email}</div>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Evento</div>
                  <div className="text-gray-900 font-semibold">{ticket.event_title || 'Evento'}</div>
                  <div className="text-xs text-gray-500">{ticket.event_date ? new Date(ticket.event_date).toLocaleString('pt-BR') : ''}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-gray-100 text-gray-700 w-10 h-10 rounded-full flex items-center justify-center">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Local</div>
                  <div className="text-gray-900 font-semibold">{ticket.event_location || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">Tipo de ingresso</div>
                  <div className="text-gray-900 font-semibold">{ticket.ticket_type || 'Ingresso'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600">Valor</div>
                  <div className="text-gray-900 font-semibold">R$ {(ticket.ticket_price ?? 0).toFixed(2).replace('.', ',')}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-700">
              Não há informações detalhadas para exibir.
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleClose}
              className={`w-full py-3 rounded-lg font-semibold text-white ${s.bg} hover:opacity-90 transition`}
            >
              Fechar e voltar ao scanner
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckInResultPage;