import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  userName?: string;
  userEmail?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  userName, 
  userEmail 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-green-200 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <CheckCircle size={24} />
            <h2 className="text-xl font-bold pr-8">{title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">{message}</p>
          
          {userName && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-green-800 mb-2">📋 Dados Definidos:</h3>
              <div className="space-y-1">
                <p className="text-green-700"><strong>Nome:</strong> {userName}</p>
                {userEmail && (
                  <p className="text-green-700"><strong>Email:</strong> {userEmail}</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-blue-500 text-lg">ℹ️</div>
              <div>
                <p className="text-blue-800 text-sm font-medium mb-1">
                  Próximos Passos
                </p>
                <ul className="text-blue-600 text-xs space-y-1">
                  <li>• O QR Code agora está disponível</li>
                  <li>• Você pode baixar o PDF do ingresso</li>
                  <li>• O ingresso está pronto para uso no evento</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg"
          >
            Continuar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.3s ease; }
      `}</style>
    </div>
  );
};

export default SuccessModal;