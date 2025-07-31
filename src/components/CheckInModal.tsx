import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Calendar, User, Mail, FileText, Clock } from 'lucide-react';

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
  if (!isOpen) return null;

  const getModalStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: <CheckCircle className="h-16 w-16 text-green-500" />,
          iconBg: 'bg-green-100',
          title: 'Check-in Realizado!',
          titleColor: 'text-green-800',
          messageColor: 'text-green-700',
          buttonBg: 'bg-green-600 hover:bg-green-700',
          animation: 'animate-bounce'
        };
      case 'already_checked':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: <AlertTriangle className="h-16 w-16 text-yellow-500" />,
          iconBg: 'bg-yellow-100',
          title: 'Check-in Já Realizado',
          titleColor: 'text-yellow-800',
          messageColor: 'text-yellow-700',
          buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
          animation: 'animate-pulse'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: <XCircle className="h-16 w-16 text-red-500" />,
          iconBg: 'bg-red-100',
          title: 'Erro no Check-in',
          titleColor: 'text-red-800',
          messageColor: 'text-red-700',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          animation: 'animate-shake'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: <XCircle className="h-16 w-16 text-gray-500" />,
          iconBg: 'bg-gray-100',
          title: 'Resultado',
          titleColor: 'text-gray-800',
          messageColor: 'text-gray-700',
          buttonBg: 'bg-gray-600 hover:bg-gray-700',
          animation: ''
        };
    }
  };

  const styles = getModalStyles();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-full ${styles.iconBg}`}>
              <div className={styles.animation}>
                {styles.icon}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className={`p-6 rounded-xl ${styles.bg} ${styles.border} border-2`}>
            <h3 className={`text-2xl font-bold mb-2 ${styles.titleColor}`}>
              {styles.title}
            </h3>
            
            <p className={`text-lg mb-4 ${styles.messageColor}`}>
              {message}
            </p>

            {/* Participant Details */}
            {data && (
              <div className="space-y-3 bg-white bg-opacity-50 rounded-lg p-4">
                {data.participant_name && (
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Participante</p>
                      <p className="font-medium text-gray-900">{data.participant_name}</p>
                    </div>
                  </div>
                )}

                {data.participant_email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">E-mail</p>
                      <p className="font-medium text-gray-900">{data.participant_email}</p>
                    </div>
                  </div>
                )}

                {data.participant_document && (
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Documento</p>
                      <p className="font-medium text-gray-900">{data.participant_document}</p>
                    </div>
                  </div>
                )}

                {data.ticket_type && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Tipo de Ingresso</p>
                      <p className="font-medium text-gray-900">{data.ticket_type}</p>
                    </div>
                  </div>
                )}

                {data.event_title && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Evento</p>
                      <p className="font-medium text-gray-900">{data.event_title}</p>
                    </div>
                  </div>
                )}

                {data.checkin_date && (
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Data do Check-in</p>
                      <p className="font-medium text-gray-900">
                        {new Date(data.checkin_date).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className={`px-6 py-3 text-white font-medium rounded-lg transition-colors ${styles.buttonBg}`}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default CheckInModal;