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

  const getModalConfig = () => {
    switch (type) {
      case 'success':
        return {
          gradient: 'from-green-400 via-green-500 to-green-600',
          bgGradient: 'from-green-50 to-green-100',
          borderColor: 'border-green-300',
          icon: <CheckCircle className="h-20 w-20 text-white drop-shadow-lg" />,
          iconBg: 'bg-gradient-to-br from-green-400 to-green-600',
          title: '🎉 Check-in Realizado!',
          titleColor: 'text-green-800',
          messageColor: 'text-green-700',
          buttonGradient: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
          animation: 'animate-bounce-slow',
          particles: true,
          sound: '🔔'
        };
      case 'already_checked':
        return {
          gradient: 'from-yellow-400 via-yellow-500 to-orange-500',
          bgGradient: 'from-yellow-50 to-orange-100',
          borderColor: 'border-yellow-300',
          icon: <AlertTriangle className="h-20 w-20 text-white drop-shadow-lg" />,
          iconBg: 'bg-gradient-to-br from-yellow-400 to-orange-500',
          title: '⚠️ Check-in Já Realizado',
          titleColor: 'text-yellow-800',
          messageColor: 'text-yellow-700',
          buttonGradient: 'from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600',
          animation: 'animate-pulse-slow',
          particles: false,
          sound: '⚠️'
        };
      case 'error':
        return {
          gradient: 'from-red-400 via-red-500 to-red-600',
          bgGradient: 'from-red-50 to-red-100',
          borderColor: 'border-red-300',
          icon: <XCircle className="h-20 w-20 text-white drop-shadow-lg" />,
          iconBg: 'bg-gradient-to-br from-red-400 to-red-600',
          title: '❌ Erro no Check-in',
          titleColor: 'text-red-800',
          messageColor: 'text-red-700',
          buttonGradient: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
          animation: 'animate-shake',
          particles: false,
          sound: '🚫'
        };
      default:
        return {
          gradient: 'from-gray-400 via-gray-500 to-gray-600',
          bgGradient: 'from-gray-50 to-gray-100',
          borderColor: 'border-gray-300',
          icon: <XCircle className="h-20 w-20 text-white drop-shadow-lg" />,
          iconBg: 'bg-gradient-to-br from-gray-400 to-gray-600',
          title: 'ℹ️ Resultado',
          titleColor: 'text-gray-800',
          messageColor: 'text-gray-700',
          buttonGradient: 'from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700',
          animation: '',
          particles: false,
          sound: 'ℹ️'
        };
    }
  };

  const config = getModalConfig();

  return (
    <>
      {/* Overlay com animação */}
      <div 
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleOverlayClick}
      >
        <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm" />
        
        {/* Particles de sucesso */}
        {config.particles && isAnimating && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              >
                <Sparkles className="h-4 w-4 text-green-400 opacity-70" />
              </div>
            ))}
          </div>
        )}

        {/* Modal Container */}
        <div className="flex items-center justify-center min-h-screen p-4">
          <div 
            className={`relative w-full max-w-lg transform transition-all duration-300 ${
              isAnimating 
                ? 'scale-100 translate-y-0 opacity-100' 
                : 'scale-95 translate-y-4 opacity-0'
            }`}
          >
            {/* Modal Background com gradiente */}
            <div className={`bg-gradient-to-br ${config.bgGradient} rounded-3xl shadow-2xl border-2 ${config.borderColor} overflow-hidden`}>
              
              {/* Header com ícone animado */}
              <div className="relative px-8 pt-8 pb-6">
                {/* Botão fechar */}
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200 group"
                >
                  <X className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
                </button>

                {/* Ícone principal */}
                <div className="flex justify-center mb-6">
                  <div className={`p-4 rounded-full ${config.iconBg} shadow-lg ${config.animation} relative`}>
                    {config.icon}
                    
                    {/* Círculos de animação */}
                    <div className={`absolute inset-0 rounded-full ${config.iconBg} opacity-30 animate-ping`} />
                    <div className={`absolute inset-2 rounded-full ${config.iconBg} opacity-20 animate-ping`} style={{ animationDelay: '0.5s' }} />
                  </div>
                </div>

                {/* Título */}
                <h2 className={`text-3xl font-bold text-center mb-3 ${config.titleColor}`}>
                  {config.title}
                </h2>

                {/* Mensagem principal */}
                <p className={`text-lg text-center ${config.messageColor} font-medium`}>
                  {message}
                </p>
              </div>

              {/* Detalhes do participante */}
              {data && (
                <div className="px-8 pb-6">
                  <div className="bg-white bg-opacity-70 rounded-2xl p-6 shadow-inner backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Detalhes do Check-in
                    </h3>
                    
                    <div className="grid gap-4">
                      {data.participant_name && (
                        <div className="flex items-center p-3 bg-white bg-opacity-50 rounded-xl">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Participante</p>
                            <p className="font-semibold text-gray-900">{data.participant_name}</p>
                          </div>
                        </div>
                      )}

                      {data.participant_email && (
                        <div className="flex items-center p-3 bg-white bg-opacity-50 rounded-xl">
                          <div className="p-2 bg-purple-100 rounded-lg mr-3">
                            <Mail className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">E-mail</p>
                            <p className="font-semibold text-gray-900">{data.participant_email}</p>
                          </div>
                        </div>
                      )}

                      {data.participant_document && (
                        <div className="flex items-center p-3 bg-white bg-opacity-50 rounded-xl">
                          <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                            <FileText className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Documento</p>
                            <p className="font-semibold text-gray-900">{data.participant_document}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {data.ticket_type && (
                          <div className="flex items-center p-3 bg-white bg-opacity-50 rounded-xl">
                            <div className="p-2 bg-green-100 rounded-lg mr-3">
                              <Ticket className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Ingresso</p>
                              <p className="font-semibold text-gray-900">{data.ticket_type}</p>
                            </div>
                          </div>
                        )}

                        {data.checkin_date && (
                          <div className="flex items-center p-3 bg-white bg-opacity-50 rounded-xl">
                            <div className="p-2 bg-orange-100 rounded-lg mr-3">
                              <Clock className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Data</p>
                              <p className="font-semibold text-gray-900 text-sm">
                                {new Date(data.checkin_date).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {data.event_title && (
                        <div className="flex items-center p-3 bg-white bg-opacity-50 rounded-xl">
                          <div className="p-2 bg-pink-100 rounded-lg mr-3">
                            <Calendar className="h-4 w-4 text-pink-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Evento</p>
                            <p className="font-semibold text-gray-900">{data.event_title}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer com botão melhorado */}
              <div className="px-8 pb-8">
                <button
                  onClick={handleClose}
                  className={`w-full py-4 px-6 bg-gradient-to-r ${config.buttonGradient} text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50`}
                >
                  <span className="flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Entendido
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos customizados */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(120deg); }
          66% { transform: translateY(5px) rotate(240deg); }
        }
        
        .animate-shake {
          animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s infinite;
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default CheckInModal;