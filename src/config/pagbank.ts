// src/config/pagbank.ts

export const PAGBANK_CONFIG = {
  // URLs da API
  SANDBOX_URL: 'https://sandbox.api.pagseguro.com',
  PRODUCTION_URL: 'https://api.pagseguro.com',
  
  // URLs do backend
  BACKEND_DEV: import.meta.env.VITE_PAGBANK_API_URL || 'http://localhost:3000',
  BACKEND_PROD: import.meta.env.VITE_PAGBANK_API_URL || 'https://backend-pagbank.onrender.com/api/payments'
  
  // Configurações de teste
  TEST_CONFIG: {
    // Cartão de teste do PagBank
    TEST_CARD: {
      number: '4111111111111111',
      exp_month: '03',
      exp_year: '2026',
      security_code: '123',
      holder_name: 'Jose da Silva',
      holder_tax_id: '12345678909'
    },
    
    // Cliente de teste
    TEST_CUSTOMER: {
      name: 'Jose da Silva',
      email: 'jose@teste.com',
      tax_id: '12345678909',
      phone: '11999999999'
    },
    
    // Item de teste
    TEST_ITEM: {
      name: 'Ingresso VIP Teste',
      quantity: 1,
      unit_amount: 5000 // R$ 50,00 em centavos
    }
  },
  
  // Configurações de pagamento
  PAYMENT_CONFIG: {
    // PIX
    PIX: {
      expiration_minutes: 60, // 1 hora
      currency: 'BRL'
    },
    
    // Cartão de crédito
    CREDIT_CARD: {
      default_installments: 1,
      capture: true,
      soft_descriptor: 'PulaKatraca',
      currency: 'BRL'
    }
  }
};

// Função para obter a URL do backend baseada no ambiente
export const getBackendUrl = (): string => {
  // Sempre usar a variável de ambiente se disponível
  return import.meta.env.VITE_PAGBANK_API_URL || 'http://localhost:3000';
};

// Função para obter a URL da API do PagBank baseada no ambiente
export const getPagBankApiUrl = (): string => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? PAGBANK_CONFIG.SANDBOX_URL : PAGBANK_CONFIG.PRODUCTION_URL;
};

export default PAGBANK_CONFIG;
