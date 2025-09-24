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
    
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(checkoutData));
    console.log('✅ Dados do carrinho salvos no localStorage:', cartData);
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
    console.log('🗑️ Dados do carrinho removidos do localStorage');
  } catch (error) {
    console.error('❌ Erro ao limpar dados do carrinho:', error);
  }
};

/**
 * Verifica se existem dados válidos do carrinho
 */
export const hasValidCartData = (): boolean => {
  const data = getCartData();
  if (!data) return false;
  
  // Validar estrutura básica
  const { state } = data;
  return !!(
    state.event &&
    state.event.id &&
    state.event.title &&
    (state.selectedTickets?.length > 0 || state.ticket) &&
    state.totalAmount > 0
  );
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
