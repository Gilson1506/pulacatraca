import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  userName?: string;
  userEmail?: string;
  userDocument?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  userName, 
  userEmail,
  userDocument 
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
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">✓</span>
                </div>
                <h3 className="font-bold text-green-800">UTILIZADOR CONFIRMADO</h3>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Nome:</span>
                    <span className="font-semibold text-gray-800">{userName}</span>
                  </div>
                  {userEmail && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Email:</span>
                      <span className="font-medium text-gray-700 text-sm">{userEmail}</span>
                    </div>
                  )}
                  {userDocument && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Documento:</span>
                      <span className="font-medium text-gray-700 text-sm">{userDocument}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">📋</span>
              </div>
              <h3 className="font-bold text-blue-800">PRÓXIMOS PASSOS</h3>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-700 text-sm font-medium">QR Code liberado e ativo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-blue-700 text-sm">Baixar PDF disponível</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-purple-700 text-sm">Ingresso pronto para o evento</span>
                </div>
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