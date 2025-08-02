import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Calendar, User, Mail, FileText, Clock, Ticket, MapPin, Sparkles } from 'lucide-react';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'already_checked' | 'error';
  data?: {
    participant_name?: string;
    participant_email?: string;
    participant_document?: string;
    ticket_type?: string;
    event_title?: string;
    checkin_date?: string;
    qr_code?: string;
    event_id?: string;
    error_details?: string;
    search_attempted?: string;
    status?: string;
    ticket_id?: string;
  };
  message: string;
}

const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
  message
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 50);
    } else {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible) return null;

  const getModalStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: 'bg-gradient-to-br from-green-400 via-green-500 to-green-600',
          border: 'border-green-300',
          text: 'text-white',
          icon: CheckCircle,
          iconColor: 'text-white',
          animation: 'animate-pulse'
        };
      case 'already_checked':
        return {
          background: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600',
          border: 'border-yellow-300',
          text: 'text-white',
          icon: AlertTriangle,
          iconColor: 'text-white',
          animation: ''
        };
      case 'error':
        return {
          background: 'bg-gradient-to-br from-red-400 via-red-500 to-red-600',
          border: 'border-red-300',
          text: 'text-white',
          icon: XCircle,
          iconColor: 'text-white',
          animation: ''
        };
      default:
        return {
          background: 'bg-white',
          border: 'border-gray-300',
          text: 'text-gray-900',
          icon: CheckCircle,
          iconColor: 'text-green-500',
          animation: ''
        };
    }
  };

  const styles = getModalStyles();
  const IconComponent = styles.icon;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleOverlayClick}
    >
      <div 
        className={`relative w-full max-w-md ${styles.background} ${styles.border} border-2 rounded-2xl shadow-2xl transform transition-all duration-300 ${
          isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        } ${styles.animation}`}
      >
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            onClick={handleClose}
            className={`absolute top-4 right-4 p-1 rounded-full hover:bg-black hover:bg-opacity-20 transition-colors ${styles.text}`}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Ícone principal com animação */}
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full bg-white bg-opacity-20 ${type === 'success' ? 'animate-pulse' : ''}`}>
              <IconComponent className={`w-12 h-12 ${styles.iconColor}`} />
            </div>
          </div>

          {/* Título */}
          <h2 className={`text-2xl font-bold text-center mb-2 ${styles.text}`}>
            {type === 'success' && '🎉 Check-in Realizado!'}
            {type === 'already_checked' && '⚠️ Já Registrado'}
            {type === 'error' && '❌ Erro no Check-in'}
          </h2>

          {/* Mensagem */}
          <p className={`text-center text-lg ${styles.text} opacity-90`}>
            {message}
          </p>
        </div>

        {/* Detalhes do participante */}
        {data && (
          <div className="px-6 pb-6">
            <div className="bg-white bg-opacity-20 rounded-xl p-4 space-y-3">
              <h3 className={`font-bold text-lg ${styles.text} mb-3 flex items-center`}>
                <User className="w-5 h-5 mr-2" />
                Detalhes do Ingresso
              </h3>
              
              {/* Nome do participante */}
              {data.participant_name && (
                <div className="flex items-center space-x-3">
                  <User className={`w-4 h-4 ${styles.text} opacity-70`} />
                  <div>
                    <p className={`text-xs ${styles.text} opacity-70 uppercase tracking-wide`}>Nome</p>
                    <p className={`font-semibold ${styles.text}`}>{data.participant_name}</p>
                  </div>
                </div>
              )}

              {/* Email */}
              {data.participant_email && (
                <div className="flex items-center space-x-3">
                  <Mail className={`w-4 h-4 ${styles.text} opacity-70`} />
                  <div>
                    <p className={`text-xs ${styles.text} opacity-70 uppercase tracking-wide`}>Email</p>
                    <p className={`font-semibold ${styles.text}`}>{data.participant_email}</p>
                  </div>
                </div>
              )}

              {/* Documento */}
              {data.participant_document && (
                <div className="flex items-center space-x-3">
                  <FileText className={`w-4 h-4 ${styles.text} opacity-70`} />
                  <div>
                    <p className={`text-xs ${styles.text} opacity-70 uppercase tracking-wide`}>Documento</p>
                    <p className={`font-semibold ${styles.text}`}>{data.participant_document}</p>
                  </div>
                </div>
              )}

              {/* Tipo de ingresso */}
              {data.ticket_type && (
                <div className="flex items-center space-x-3">
                  <Ticket className={`w-4 h-4 ${styles.text} opacity-70`} />
                  <div>
                    <p className={`text-xs ${styles.text} opacity-70 uppercase tracking-wide`}>Tipo de Ingresso</p>
                    <p className={`font-semibold ${styles.text}`}>{data.ticket_type}</p>
                  </div>
                </div>
              )}

              {/* Nome do evento */}
              {data.event_title && (
                <div className="flex items-center space-x-3">
                  <MapPin className={`w-4 h-4 ${styles.text} opacity-70`} />
                  <div>
                    <p className={`text-xs ${styles.text} opacity-70 uppercase tracking-wide`}>Evento</p>
                    <p className={`font-semibold ${styles.text}`}>{data.event_title}</p>
                  </div>
                </div>
              )}

              {/* Data do check-in */}
              {data.checkin_date && (
                <div className="flex items-center space-x-3">
                  <Clock className={`w-4 h-4 ${styles.text} opacity-70`} />
                  <div>
                    <p className={`text-xs ${styles.text} opacity-70 uppercase tracking-wide`}>
                      {type === 'success' ? 'Check-in Realizado' : 'Check-in Anterior'}
                    </p>
                    <p className={`font-semibold ${styles.text}`}>
                      {new Date(data.checkin_date).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              )}

              {/* Status do check-in */}
              {type === 'success' && (
                <div className="flex items-center justify-center mt-4 p-3 bg-white bg-opacity-30 rounded-lg">
                  <Sparkles className={`w-5 h-5 ${styles.text} mr-2 animate-pulse`} />
                  <p className={`font-bold ${styles.text} text-lg`}>✅ CHECK-IN CONFIRMADO</p>
                </div>
              )}

              {type === 'already_checked' && (
                <div className="flex items-center justify-center mt-4 p-3 bg-white bg-opacity-30 rounded-lg">
                  <AlertTriangle className={`w-5 h-5 ${styles.text} mr-2`} />
                  <p className={`font-bold ${styles.text} text-lg`}>⚠️ JÁ REGISTRADO</p>
                </div>
              )}

              {/* Informações de erro detalhadas */}
              {type === 'error' && (
                <div className="mt-4 p-3 bg-white bg-opacity-30 rounded-lg">
                  <div className="flex items-center mb-2">
                    <XCircle className={`w-5 h-5 ${styles.text} mr-2`} />
                    <p className={`font-bold ${styles.text} text-lg`}>❌ ERRO DETECTADO</p>
                  </div>
                  
                  {/* QR Code tentado */}
                  {data?.qr_code && (
                    <div className="mb-2">
                      <p className={`text-xs ${styles.text} opacity-70 uppercase tracking-wide`}>QR Code Escaneado</p>
                      <p className={`font-mono text-sm ${styles.text} bg-black bg-opacity-20 p-2 rounded`}>
                        {data.qr_code.length > 30 ? `${data.qr_code.substring(0, 30)}...` : data.qr_code}
                      </p>
                    </div>
                  )}

                  {/* Status específico */}
                  {data?.status === 'user_not_defined' && (
                    <div className="mb-2 p-2 bg-orange-500 bg-opacity-30 rounded">
                      <p className={`text-xs ${styles.text} font-semibold`}>
                        ⚠️ Ingresso encontrado mas usuário não foi definido. 
                        O proprietário precisa preencher os dados primeiro.
                      </p>
                    </div>
                  )}

                  {/* Detalhes técnicos */}
                  {data?.error_details && (
                    <div className="mb-2">
                      <p className={`text-xs ${styles.text} opacity-70 uppercase tracking-wide`}>Detalhes Técnicos</p>
                      <p className={`text-xs ${styles.text} bg-black bg-opacity-20 p-2 rounded font-mono`}>
                        {data.error_details}
                      </p>
                    </div>
                  )}

                  {/* Busca tentada */}
                  {data?.search_attempted && (
                    <div className="mb-2">
                      <p className={`text-xs ${styles.text} opacity-70 uppercase tracking-wide`}>Busca Realizada</p>
                      <p className={`text-xs ${styles.text}`}>{data.search_attempted}</p>
                    </div>
                  )}

                  {/* Sugestões de solução */}
                  <div className="mt-3 p-2 bg-blue-500 bg-opacity-30 rounded">
                    <p className={`text-xs ${styles.text} font-semibold mb-1`}>💡 Possíveis Soluções:</p>
                    <ul className={`text-xs ${styles.text} space-y-1`}>
                      {data?.camera_error ? (
                        <>
                          <li>• Permita acesso à câmera nas configurações do navegador</li>
                          <li>• Verifique se outra aba/app não está usando a câmera</li>
                          <li>• Tente recarregar a página e permitir acesso</li>
                          <li>• Use a busca manual como alternativa</li>
                        </>
                      ) : (
                        <>
                          <li>• Verifique se o QR code está correto</li>
                          <li>• Confirme que o ingresso pertence a este evento</li>
                          <li>• Verifique se o usuário foi definido no ingresso</li>
                          <li>• Execute os scripts SQL no Supabase se necessário</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botão de fechar */}
        <div className="px-6 pb-6">
          <button
            onClick={handleClose}
            className={`w-full py-3 px-4 bg-white bg-opacity-20 hover:bg-opacity-30 ${styles.text} font-semibold rounded-xl transition-all duration-200 border border-white border-opacity-30`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckInModal;