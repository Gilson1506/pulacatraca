import { safeSetItem } from './cacheManager';

// Utilitário para gerenciar dados do carrinho no localStorage
export interface CartData {
  event: any;
  selectedTickets: any[];
  totalAmount: number;
  ticket?: any;
  quantity?: number;
  paymentMethod?: string;
  timestamp: number;
}

export interface StoredCheckoutData {
  returnTo: string;
  state: CartData;
}

const CART_STORAGE_KEY = 'checkout_data';
const CART_EXPIRY_HOURS = 24; // Dados expiram em 24 horas

/**
 * Salva dados do carrinho no localStorage com timestamp
 */
export const saveCartData = (data: Omit<CartData, 'timestamp'>): void => {
  try {
    const cartData: CartData = {
      ...data,
      timestamp: Date.now()
    };
    
    const checkoutData: StoredCheckoutData = {
      returnTo: '/checkout',
      state: cartData
    };
    
      const dataStr = JSON.stringify(checkoutData);
      if (!safeSetItem(CART_STORAGE_KEY, dataStr, { fallbackToSessionStorage: true, keyDescription: CART_STORAGE_KEY })) {
        console.warn('Carrinho salvo no sessionStorage como fallback.');
      } else {
        console.log('✅ Dados do carrinho salvos no localStorage:', cartData);
      }
  } catch (error) {
    console.error('❌ Erro ao salvar dados do carrinho:', error);
    throw new Error('Erro ao salvar dados do carrinho');
  }
};

/**
 * Recupera dados do carrinho do localStorage
 */
export const getCartData = (): StoredCheckoutData | null => {
  try {
    const storedData = localStorage.getItem(CART_STORAGE_KEY);
    if (!storedData) {
      return null;
    }
    
    const checkoutData: StoredCheckoutData = JSON.parse(storedData);
    
    // Verificar se os dados não expiraram
    const now = Date.now();
    const dataAge = now - checkoutData.state.timestamp;
    const maxAge = CART_EXPIRY_HOURS * 60 * 60 * 1000; // Converter horas para milissegundos
    
    if (dataAge > maxAge) {
      console.log('🗑️ Dados do carrinho expirados, removendo...');
      clearCartData();
      return null;
    }
    
    console.log('✅ Dados do carrinho recuperados:', checkoutData);
    return checkoutData;
  } catch (error) {
    console.error('❌ Erro ao recuperar dados do carrinho:', error);
    clearCartData(); // Limpar dados corrompidos
    return null;
  }
};

/**
 * Remove dados do carrinho do localStorage
 */
export const clearCartData = (): void => {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
    sessionStorage.removeItem(CART_STORAGE_KEY);
    console.log('🗑️ Dados do carrinho removidos do localStorage');
  } catch (error) {
    console.error('❌ Erro ao limpar dados do carrinho:', error);
  }
};

/**
 * Verifica se existem dados válidos do carrinho
 */
export const hasValidCartData = (): boolean => {
  try {
    const data = getCartData();
    if (!data || !data.state) {
      console.log('🔍 hasValidCartData: data ou state não encontrado');
      return false;
    }
    
    // Validar estrutura básica (validação mais flexível)
    const { state } = data;
    const hasEvent = state.event && state.event.id;
    const hasTickets = (state.selectedTickets && state.selectedTickets.length > 0) || state.ticket;
    const hasAmount = state.totalAmount !== undefined && state.totalAmount !== null;
    
    console.log('🔍 hasValidCartData - Validação:', {
      hasEvent,
      hasTickets,
      hasAmount,
      eventId: state.event?.id,
      ticketsCount: state.selectedTickets?.length,
      totalAmount: state.totalAmount
    });
    
    // Aceitar se tiver evento e ingressos, mesmo que totalAmount seja 0 (pode ser ingresso gratuito)
    const isValid = hasEvent && hasTickets && hasAmount;
    
    console.log('🔍 hasValidCartData retornando:', isValid);
    return isValid;
  } catch (error) {
    console.error('❌ Erro em hasValidCartData:', error);
    return false;
  }
};

/**
 * Limpa dados antigos de carrinho (chamado na inicialização da app)
 */
export const cleanupOldCartData = (): void => {
  try {
    const storedData = localStorage.getItem(CART_STORAGE_KEY);
    if (!storedData) return;
    
    const checkoutData: StoredCheckoutData = JSON.parse(storedData);
    const now = Date.now();
    const dataAge = now - checkoutData.state.timestamp;
    const maxAge = CART_EXPIRY_HOURS * 60 * 60 * 1000;
    
    if (dataAge > maxAge) {
      console.log('🗑️ Limpando dados antigos do carrinho...');
      clearCartData();
    }
  } catch (error) {
    console.error('❌ Erro ao limpar dados antigos:', error);
    clearCartData();
  }
};
