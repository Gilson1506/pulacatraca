import type { NavigateFunction } from 'react-router-dom';
import type { StoredCheckoutData } from './cartStorage';

interface CheckoutState {
  event?: any;
  selectedTickets?: any[];
  totalAmount?: number;
  ticket?: any;
}

/**
 * Recupera o estado do checkout a partir do localStorage sem removê-lo.
 * Mantém os dados até que o CheckoutPage os processe.
 */
export const getCheckoutStateFromStorage = (): CheckoutState | null => {
  try {
    const checkoutRestoreData = localStorage.getItem('checkout_restore_data');
    if (checkoutRestoreData) {
      try {
        const parsed = JSON.parse(checkoutRestoreData);
        if (parsed && (parsed.event || parsed.selectedTickets || parsed.ticket)) {
          return parsed;
        }
      } catch (error) {
        console.error('❌ Erro ao parsear checkout_restore_data:', error);
        // Não remover aqui - deixar para o CheckoutPage lidar com dados corrompidos
      }
    }

    const checkoutData = localStorage.getItem('checkout_data');
    if (checkoutData) {
      try {
        const parsed: StoredCheckoutData = JSON.parse(checkoutData);
        if (parsed?.state && (parsed.state.event || parsed.state.selectedTickets || parsed.state.ticket)) {
          return {
            event: parsed.state.event,
            selectedTickets: parsed.state.selectedTickets,
            totalAmount: parsed.state.totalAmount,
            ticket: parsed.state.ticket,
          };
        }
      } catch (error) {
        console.error('❌ Erro ao parsear checkout_data:', error);
      }
    }
  } catch (error) {
    console.error('❌ Erro inesperado ao recuperar dados de checkout:', error);
  }

  return null;
};

export const navigateToCheckoutWithState = (
  navigate: NavigateFunction,
  options: { delay?: number; route?: string } = {},
) => {
  const { delay = 0, route = '/checkout' } = options;

  const executeNavigation = () => {
    const checkoutState = getCheckoutStateFromStorage();
    if (checkoutState) {
      navigate(route, { state: checkoutState });
    } else {
      navigate(route);
    }
  };

  if (delay > 0) {
    setTimeout(executeNavigation, delay);
  } else {
    executeNavigation();
  }
};

