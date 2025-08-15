import React from 'react';
import { X, AlertTriangle, Crown, Users, ShoppingCart } from 'lucide-react';

interface OrganizerWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizerName?: string;
}

const OrganizerWarningModal: React.FC<OrganizerWarningModalProps> = ({
  isOpen,
  onClose,
  organizerName = 'Organizador'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-4 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Acesso Restrito</h2>
              <p className="text-orange-100 text-sm">Organizador detectado</p>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Ícone do organizador */}
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-4">
              <Crown className="h-12 w-12 text-white" />
            </div>
          </div>

          {/* Mensagem principal */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-gray-700 mb-2">
              Olá, {organizerName}! 👋
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Como <strong className="text-orange-600">organizador</strong> deste evento, 
              você não pode comprar ingressos para o seu próprio evento.
            </p>
          </div>

          {/* Informações sobre privilégios */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
              <Crown className="h-4 w-4 text-yellow-500 mr-2" />
              Seus privilégios como organizador:
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span>Acesso total ao painel de controle</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>Sistema completo de check-in</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                <span>Relatórios e estatísticas em tempo real</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-pink-500 rounded-full mr-3"></div>
                <span>Gerenciamento completo de participantes</span>
              </li>
            </ul>
          </div>

          {/* Sugestão */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-start">
              <Users className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h5 className="font-medium text-yellow-800">Dica:</h5>
                <p className="text-yellow-700 text-sm mt-1">
                  Se você precisar de um ingresso, peça para alguém da sua equipe 
                  ou um participante fazer a compra para você.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-center">
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-2 rounded-lg font-medium hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center space-x-2"
          >
            <span>Entendi</span>
            <Crown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrganizerWarningModal;