import React, { useState, useEffect } from 'react';
import { useModal } from '../contexts/ModalContext';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ 
  phoneNumber = '5511968033591', 
  message = 'Olá! Gostaria de mais informações sobre os eventos.',
  position = 'bottom-left'
}) => {
  const { isModalOpen } = useModal();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detectar se é mobile por userAgent OU por largura de tela (breakpoint)
    const checkMobile = () => {
      const isUaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallViewport = typeof window !== 'undefined' ? window.innerWidth <= 1024 : false;
      setIsMobile(isUaMobile || isSmallViewport);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Esconder em mobile quando modal estiver aberto
  if (isMobile && isModalOpen) {
    return null;
  }

  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(message);
    
    let whatsappUrl;
    
    if (isMobile) {
      // Para mobile, usar wa.me (abre o app nativo)
      whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    } else {
      // Para desktop, tentar WhatsApp Web primeiro, depois fallback para wa.me
      whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
    }
    
    window.open(whatsappUrl, '_blank');
    
    // Fallback: se o WhatsApp Web não funcionar, tentar wa.me após 2 segundos
    if (!isMobile) {
      setTimeout(() => {
        const fallbackUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        // Verificar se a janela foi bloqueada
        try {
          const testWindow = window.open(fallbackUrl, '_blank');
          if (!testWindow || testWindow.closed || typeof testWindow.closed == 'undefined') {
            // Se foi bloqueado, mostrar instruções
            alert(`WhatsApp não abriu automaticamente. Por favor, copie este número: ${phoneNumber.replace('+', '')}`);
          }
        } catch (e) {
          console.log('Fallback não funcionou');
        }
      }, 2000);
    }
  };

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <button
        onClick={handleWhatsAppClick}
        className="group relative bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-500 ease-out transform hover:scale-110 hover:-translate-y-1 active:scale-95 active:translate-y-0 animate-bounce-slow"
        aria-label="Conversar no WhatsApp"
      >
        {/* Ícone do WhatsApp de alta qualidade */}
        <svg 
          className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12" 
          fill="currentColor" 
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
        </svg>

        {/* Efeito de ondas animadas com movimento */}
        <div className="absolute inset-0 rounded-full bg-pink-500 animate-wave-1"></div>
        <div className="absolute inset-0 rounded-full bg-pink-500 animate-wave-2"></div>
        <div className="absolute inset-0 rounded-full bg-pink-500 animate-wave-3"></div>

        {/* Tooltip com animação de slide */}
        <div className="absolute bottom-full left-0 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-out whitespace-nowrap">
          Fale conosco no WhatsApp
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      </button>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        
        @keyframes wave-1 {
          0% {
            transform: scale(1) rotate(0deg);
          }
          50% {
            transform: scale(1.2) rotate(180deg);
          }
          100% {
            transform: scale(1) rotate(360deg);
          }
        }
        
        @keyframes wave-2 {
          0% {
            transform: scale(1) rotate(0deg);
          }
          50% {
            transform: scale(1.3) rotate(-180deg);
          }
          100% {
            transform: scale(1) rotate(-360deg);
          }
        }
        
        @keyframes wave-3 {
          0% {
            transform: scale(1) rotate(0deg);
          }
          50% {
            transform: scale(1.1) rotate(90deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        
        .animate-wave-1 {
          animation: wave-1 4s ease-in-out infinite;
          opacity: 0.3;
        }
        
        .animate-wave-2 {
          animation: wave-2 4s ease-in-out infinite 1s;
          opacity: 0.2;
        }
        
        .animate-wave-3 {
          animation: wave-3 4s ease-in-out infinite 2s;
          opacity: 0.1;
        }
      `}</style>
    </div>
  );
};

export default WhatsAppButton;
