import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Shield, X, ExternalLink, CheckCircle } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';
import { safeSetItem } from '../utils/cacheManager';

interface CookieConsentProps {
  /**
   * Atraso em segundos antes de mostrar o banner
   * @default 1
   */
  delaySeconds?: number;
  
  /**
   * Posição do banner na tela
   * @default 'bottom'
   */
  position?: 'bottom' | 'center' | 'top';
  
  /**
   * URL da política de privacidade
   * @default '/privacy-policy'
   */
  privacyPolicyUrl?: string;
  
  /**
   * Mostrar botão de rejeitar
   * @default true
   */
  showRejectButton?: boolean;
  
  /**
   * Callback quando usuário aceita cookies
   */
  onAccept?: () => void;
  
  /**
   * Callback quando usuário rejeita cookies
   */
  onReject?: () => void;
  
  /**
   * Texto customizado para o banner
   */
  customText?: {
    title?: string;
    description?: string;
    acceptButton?: string;
    rejectButton?: string;
    privacyLink?: string;
  };
}

const CookieConsent: React.FC<CookieConsentProps> = ({
  delaySeconds = 1,
  position = 'bottom',
  privacyPolicyUrl = '/privacy-policy',
  showRejectButton = true,
  onAccept,
  onReject,
  customText = {}
}) => {
  // Estados do componente
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Chave para localStorage
  const COOKIE_CONSENT_KEY = 'cookie-consent-status';
  
  // Textos padrão (podem ser customizados)
  const defaultTexts = {
    title: customText.title || '🍪 Usamos Cookies',
    description: customText.description || 
      'Este site utiliza cookies para melhorar sua experiência de navegação, personalizar conteúdo e analisar nosso tráfego. Ao continuar navegando, você concorda com o uso de cookies.',
    acceptButton: customText.acceptButton || 'Aceitar Cookies',
    rejectButton: customText.rejectButton || 'Rejeitar',
    privacyLink: customText.privacyLink || 'Política de Privacidade'
  };

  /**
   * Verifica se o usuário já deu consentimento
   */
  const hasUserConsented = (): boolean => {
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      return consent !== null; // Se existe qualquer valor, já houve uma escolha
    } catch (error) {
      console.error('Erro ao acessar localStorage:', error);
      return false;
    }
  };

  /**
   * Salva a escolha do usuário no localStorage
   */
  const saveConsentChoice = (accepted: boolean): void => {
    try {
      const consentData = {
        accepted,
        timestamp: new Date().toISOString(),
        version: '1.0' // Para futuras atualizações da política
      };
        safeSetItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData), { fallbackToSessionStorage: true, keyDescription: COOKIE_CONSENT_KEY });
      console.log(`📋 Consentimento salvo: ${accepted ? 'Aceito' : 'Rejeitado'}`);
    } catch (error) {
      console.error('Erro ao salvar consentimento:', error);
    }
  };

  /**
   * Manipula aceitação dos cookies
   */
  const handleAccept = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Salva escolha
      saveConsentChoice(true);
      
      // Simula um pequeno delay para melhor UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Callback personalizado
      if (onAccept) {
        onAccept();
      }
      
      console.log('✅ Cookies aceitos pelo usuário');
      
      // Esconde o banner
      setIsVisible(false);
      
    } catch (error) {
      console.error('Erro ao aceitar cookies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Manipula rejeição dos cookies
   */
  const handleReject = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Salva escolha
      saveConsentChoice(false);
      
      // Simula um pequeno delay para melhor UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Callback personalizado
      if (onReject) {
        onReject();
      }
      
      console.log('❌ Cookies rejeitados pelo usuário');
      
      // Esconde o banner
      setIsVisible(false);
      
    } catch (error) {
      console.error('Erro ao rejeitar cookies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Obtém classes CSS baseadas na posição
   */
  const getPositionClasses = (): string => {
    switch (position) {
      case 'top':
        return 'top-1 left-1 right-1 md:top-4 md:left-6 md:right-6';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-lg w-full mx-4';
      case 'bottom':
      default:
        return 'bottom-1 left-1 right-1 md:bottom-4 md:left-6 md:right-6 md:max-w-md md:left-auto';
    }
  };

  /**
   * Obtém configuração de animação baseada na posição
   */
  const getAnimationConfig = () => {
    switch (position) {
      case 'top':
        return {
          initial: { opacity: 0, y: -100, scale: 0.95 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -100, scale: 0.95 }
        };
      case 'center':
        return {
          initial: { opacity: 0, scale: 0.8, y: 20 },
          animate: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.8, y: 20 }
        };
      case 'bottom':
      default:
        return {
          initial: { opacity: 0, y: 100, scale: 0.95 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 100, scale: 0.95 }
        };
    }
  };

  // Effect para controlar exibição inicial
  useEffect(() => {
    // Verifica se usuário já consentiu
    if (hasUserConsented()) {
      console.log('📋 Usuário já deu consentimento, banner não será exibido');
      return;
    }

    // Timer para mostrar após delay
    const timer = setTimeout(() => {
      setIsVisible(true);
      console.log('🍪 Banner de cookies exibido');
    }, delaySeconds * 1000);

    // Cleanup
    return () => clearTimeout(timer);
  }, [delaySeconds]);

  // Função para obter dados do consentimento (útil para debugging)
  const getConsentData = () => {
    try {
      const data = localStorage.getItem(COOKIE_CONSENT_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };

  // Log dos dados de consentimento para debugging
  useEffect(() => {
    const consentData = getConsentData();
    if (consentData) {
      console.log('📊 Dados de consentimento:', consentData);
    }
  }, []);

  return (
    <>
      {/* Backdrop para posição center */}
      <AnimatePresence>
        {isVisible && position === 'center' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40"
            onClick={() => setIsVisible(false)}
          />
        )}
      </AnimatePresence>

      {/* Banner Principal */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            {...getAnimationConfig()}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.5
            }}
            className={`
              fixed z-50 ${getPositionClasses()}
              bg-gray-100/90 backdrop-blur-sm border border-gray-300/60 rounded-lg shadow-2xl
              ${position === 'center' ? 'shadow-3xl' : ''}
            `}
          >
            <div className="p-2 md:p-4"> {/* Reduzido de p-3 md:p-4 para p-2 md:p-4 */}
              
              {/* Header */}
              <div className="flex items-center justify-between mb-1 md:mb-2"> {/* Reduzido de mb-2 para mb-1 md:mb-2 */}
                <div className="flex items-center space-x-1 md:space-x-2"> {/* Reduzido de space-x-2 para space-x-1 md:space-x-2 */}
                  <div className="bg-blue-100 rounded-full p-1 md:p-2 flex items-center justify-center w-6 h-6 md:w-10 md:h-10"> {/* Reduzido de w-8 h-8 */}
                    <Cookie className="h-3 w-3 md:h-5 md:w-5 text-blue-600" /> {/* Reduzido de h-4 w-4 */}
                  </div>
                  <h3 className="text-sm md:text-lg font-bold text-gray-800"> {/* Reduzido de text-base */}
                    Política de Cookies
                  </h3>
                </div>
                
                <button
                  onClick={handleReject}
                  className="text-gray-600 hover:text-gray-800 p-1 rounded-sm hover:bg-gray-300/50 transition-colors"
                >
                  <X className="h-3 w-3 md:h-5 md:w-5" /> {/* Reduzido de h-4 w-4 */}
                </button>
              </div>

              {/* Description */}
              <p className="text-gray-700 mb-2 md:mb-3 text-xs md:text-sm leading-tight"> {/* Reduzido de mb-3 e added leading-tight */}
                Utilizamos cookies essenciais e analíticos para melhorar sua experiência. 
                Você pode gerenciar suas preferências a qualquer momento.
              </p>

              {/* Privacy Policy Link */}
              <div className="mb-2 md:mb-3"> {/* Reduzido de mb-3 */}
                <a
                  href={privacyPolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-xs md:text-sm font-medium transition-colors"
                >
                  <Shield className="h-2 w-2 md:h-4 md:w-4" /> {/* Reduzido de h-3 w-3 */}
                  <span>Política de Privacidade</span>
                  <ExternalLink className="h-2 w-2 md:h-3 md:w-3" />
                </a>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-1 md:gap-2"> {/* Reduzido de gap-2 */}
                <button
                  onClick={handleAccept}
                  disabled={isLoading}
                  className={`
                    flex-1 px-2 py-1 md:px-4 md:py-3 bg-pink-600 {/* Reduzido de px-3 py-2 */}
                    text-white font-bold rounded-sm
                    hover:bg-pink-700
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center
                    text-xs md:text-sm
                  `}
                >
                  {isLoading ? (
                    <ProfessionalLoader size="sm" />
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1" /> {/* Reduzido de h-4 w-4 */}
                      <span>Aceitar Cookies</span>
                    </>
                  )}
                </button>
                
                {showRejectButton && (
                  <button
                    onClick={handleReject}
                    disabled={isLoading}
                    className={`
                      flex-1 px-2 py-1 md:px-4 md:py-3 bg-gray-200 {/* Reduzido de px-3 py-2 */}
                      text-gray-800 font-bold rounded-sm
                      hover:bg-gray-300
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center justify-center
                      text-xs md:text-sm
                    `}
                  >
                    <X className="h-3 w-3 md:h-4 md:w-4 mr-1" /> {/* Reduzido de h-4 w-4 */}
                    <span>Rejeitar</span>
                  </button>
                )}
              </div>

              {/* Compliance Note */}
              <div className="mt-1 pt-1 border-t border-gray-300/60"> {/* Reduzido de mt-2 pt-2 */}
                <p className="text-xs text-gray-500 text-center">
                  Suas informações estão protegidas conforme a LGPD {/* Removido emoji 🔒 */}
                </p>
              </div>
            </div>

            {/* Subtle border animation */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-600/20 -z-10 blur-sm animate-pulse"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CookieConsent;

/**
 * Hook personalizado para verificar status de consentimento
 */
export const useCookieConsent = () => {
  const [consentStatus, setConsentStatus] = useState<{
    hasConsented: boolean;
    accepted: boolean | null;
    timestamp: string | null;
  }>({
    hasConsented: false,
    accepted: null,
    timestamp: null
  });

  useEffect(() => {
    try {
      const data = localStorage.getItem('cookie-consent-status');
      if (data) {
        const parsed = JSON.parse(data);
        setConsentStatus({
          hasConsented: true,
          accepted: parsed.accepted,
          timestamp: parsed.timestamp
        });
      }
    } catch (error) {
      console.error('Erro ao ler consentimento:', error);
    }
  }, []);

  const resetConsent = () => {
    try {
      localStorage.removeItem('cookie-consent-status');
      setConsentStatus({
        hasConsented: false,
        accepted: null,
        timestamp: null
      });
      console.log('🗑️ Consentimento resetado');
    } catch (error) {
      console.error('Erro ao resetar consentimento:', error);
    }
  };

  return {
    ...consentStatus,
    resetConsent
  };
};