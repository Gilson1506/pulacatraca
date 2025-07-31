import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, X, Shield, Ticket, Clock, Bell } from 'lucide-react';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle?: string;
}

const LoginPromptModal: React.FC<LoginPromptModalProps> = ({ isOpen, onClose, eventTitle }) => {
  const navigate = useNavigate();
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

  if (!isVisible) return null;

  const handleLogin = () => {
    handleClose();
    setTimeout(() => navigate('/login'), 300);
  };

  const handleRegister = () => {
    handleClose();
    setTimeout(() => navigate('/register'), 300);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => onClose(), 300);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-all duration-300 ${
        isAnimating ? 'bg-opacity-60 backdrop-blur-sm' : 'bg-opacity-0'
      }`}
      onClick={handleOverlayClick}
    >
      <div className={`bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden transition-all duration-300 transform ${
        isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
      }`}>
        
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 px-6 py-5 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
          </div>
          
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors z-10 p-1 rounded-full hover:bg-white hover:bg-opacity-20"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="flex items-center relative z-10">
            <div className="bg-white bg-opacity-20 rounded-xl p-3 mr-4 backdrop-blur-sm">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Acesso Necessário</h2>
              <p className="text-pink-100 text-sm">Conecte-se para continuar sua compra</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Icon and main message */}
          <div className="text-center mb-6">
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-4 border border-pink-100">
              <LogIn className="h-10 w-10 text-pink-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Entre na sua conta
            </h3>
            {eventTitle && (
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700">
                  <Ticket className="h-4 w-4 inline mr-1 text-pink-500" />
                  Comprando ingresso para: 
                  <span className="font-semibold text-pink-600 block mt-1">{eventTitle}</span>
                </p>
              </div>
            )}
            <p className="text-gray-600 text-sm leading-relaxed">
              Para sua segurança e melhor experiência, faça login ou crie uma conta gratuita.
            </p>
          </div>

          {/* Benefits cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 text-center">
              <Shield className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-xs font-medium text-green-700">Compra Segura</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3 text-center">
              <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-xs font-medium text-blue-700">Histórico</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3 text-center">
              <Ticket className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <p className="text-xs font-medium text-purple-700">Meus Ingressos</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3 text-center">
              <Bell className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <p className="text-xs font-medium text-orange-700">Notificações</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              <LogIn className="h-5 w-5 mr-3" />
              Entrar na Minha Conta
            </button>
            
            <button
              onClick={handleRegister}
              className="w-full bg-white border-2 border-pink-500 text-pink-600 py-4 rounded-xl font-bold text-lg hover:bg-pink-50 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-[1.02]"
            >
              <UserPlus className="h-5 w-5 mr-3" />
              Criar Conta Gratuita
            </button>
          </div>

          {/* Footer info */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-center text-xs text-gray-500">
              🔒 Seus dados estão protegidos e seguros conosco
            </p>
            <p className="text-center text-xs text-gray-400 mt-1">
              Já tem conta? <button onClick={handleLogin} className="text-pink-600 hover:text-pink-700 font-medium underline">Faça login aqui</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPromptModal;
