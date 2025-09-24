// Função para validar URL
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Configurações do Pagar.me
export const PAGARME_CONFIG = {
  // Chaves de API (usando VITE_ para compatibilidade)
  API_KEY: import.meta.env.VITE_PAGARME_PUBLIC_KEY || 'pk_test_3lXpvYAhbfZvG7V1',
  ENCRYPTION_KEY: import.meta.env.VITE_PAGARME_ENCRYPTION_KEY || 'ek_test_3lXpvYAhbfZvG7V1',
  
  // URL da API (fixa no código)
  BASE_URL: 'https://api.pagar.me/core/v5',
  
  // Configurações de ambiente
  ENVIRONMENT: import.meta.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  
  // Configurações de pagamento
  PAYMENT_CONFIG: {
         // Configurações de cartão
     CARD: {
       capture: true, // Captura automática
       postbackUrl: (() => {
         const webhookUrl = import.meta.env.VITE_WEBHOOK_URL || 'https://pulacatraca.vercel.app/api/webhook/pagarme';
         const isValid = isValidUrl(webhookUrl);
         console.log('🔍 Webhook URL validation:', { webhookUrl, isValid });
         return isValid ? webhookUrl : null;
       })(),
     },
    
    // Configurações de PIX
    PIX: {
      expirationDate: 24, // Horas para expirar
      additionalInformation: [
        {
          name: 'Sistema',
          value: 'Pulakatraca'
        }
      ]
    },
    

  },
  
  // Configurações de antifraude
  ANTIFRAUD: {
    enabled: true,
    provider: 'clearsale', // ou 'sift'
    sessionId: null, // Será gerado dinamicamente
    ip: null, // Será capturado dinamicamente
    location: null, // Será capturado dinamicamente
    device: null // Será capturado dinamicamente
  },
  
  // Configurações de webhook
  WEBHOOK: {
    enabled: true,
    events: [
      'order.paid',
      'order.payment_failed',
      'order.canceled',
      'order.created',
      'order.pending'
    ]
  }
};

// Configurações de validação
export const VALIDATION_CONFIG = {
  CARD: {
    minLength: 13,
    maxLength: 19,
    cvvLength: [3, 4],
    expiryFormat: 'MM/YY'
  },
  
  CPF: {
    length: 11,
    pattern: /^\d{11}$/
  },
  
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  PHONE: {
    pattern: /^\+?[1-9]\d{1,14}$/
  }
};

// Configurações de UI
export const UI_CONFIG = {
  THEME: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40'
  },
  
  LOADING: {
    text: 'Processando pagamento...',
    spinnerColor: '#007bff'
  },
  
  MESSAGES: {
    SUCCESS: 'Pagamento realizado com sucesso!',
    ERROR: 'Erro ao processar pagamento. Tente novamente.',
    VALIDATION: 'Por favor, verifique os dados informados.',
    PROCESSING: 'Processando seu pagamento...'
  }
};

export default PAGARME_CONFIG;

