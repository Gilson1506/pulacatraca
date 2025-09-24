import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AnalyticsEvent {
  event_type: string;
  event_data: any;
  user_id?: string;
  session_id: string;
  page_url: string;
  user_agent: string;
  timestamp: string;
}

// Gerar ID de sessão único
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

export const useAnalytics = () => {
  
  const trackEvent = async (eventType: string, eventData: any = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const analyticsEvent: AnalyticsEvent = {
        event_type: eventType,
        event_data: eventData,
        user_id: user?.id,
        session_id: getSessionId(),
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };

      // Salvar no Supabase (se a tabela analytics existir)
      const { error } = await supabase
        .from('analytics')
        .insert([analyticsEvent]);

      if (error) {
        console.warn('Analytics não salvo no banco:', error);
      }

      // Também salvar localmente para fallback
      const localAnalytics = JSON.parse(localStorage.getItem('local_analytics') || '[]');
      localAnalytics.push(analyticsEvent);
      
      // Manter apenas os últimos 100 eventos localmente
      if (localAnalytics.length > 100) {
        localAnalytics.splice(0, localAnalytics.length - 100);
      }
      
      localStorage.setItem('local_analytics', JSON.stringify(localAnalytics));
      
      console.log('📊 Analytics:', eventType, eventData);
    } catch (error) {
      console.error('Erro no analytics:', error);
    }
  };

  // Eventos específicos para conversão
  const trackPurchaseFlow = {
    eventView: (eventId: string, eventTitle: string) => {
      trackEvent('event_view', { 
        event_id: eventId, 
        event_title: eventTitle,
        source: 'event_page'
      });
    },

    purchaseIntent: (eventId: string, ticketType: string, price: number) => {
      trackEvent('purchase_intent', { 
        event_id: eventId,
        ticket_type: ticketType,
        price: price,
        step: 'clicked_buy_button'
      });
    },

    authRequired: (eventId: string, userType: 'new' | 'returning') => {
      trackEvent('auth_required', { 
        event_id: eventId,
        user_type: userType,
        step: 'redirected_to_auth'
      });
    },

    authCompleted: (eventId: string, authType: 'login' | 'register') => {
      trackEvent('auth_completed', { 
        event_id: eventId,
        auth_type: authType,
        step: 'completed_auth'
      });
    },

    checkoutStarted: (eventId: string, ticketType: string, price: number) => {
      trackEvent('checkout_started', { 
        event_id: eventId,
        ticket_type: ticketType,
        price: price,
        step: 'entered_checkout'
      });
    },

    purchaseCompleted: (eventId: string, transactionId: string, totalAmount: number) => {
      trackEvent('purchase_completed', { 
        event_id: eventId,
        transaction_id: transactionId,
        total_amount: totalAmount,
        step: 'purchase_success'
      });
    },

    purchaseAbandoned: (eventId: string, step: string, reason?: string) => {
      trackEvent('purchase_abandoned', { 
        event_id: eventId,
        abandon_step: step,
        reason: reason
      });
    }
  };

  // Eventos gerais da aplicação
  const trackUserFlow = {
    pageView: (pageName: string) => {
      trackEvent('page_view', { 
        page_name: pageName,
        referrer: document.referrer
      });
    },

    searchEvent: (query: string, resultsCount: number) => {
      trackEvent('search', { 
        query: query,
        results_count: resultsCount
      });
    },

    shareEvent: (eventId: string, shareMethod: string) => {
      trackEvent('share', { 
        event_id: eventId,
        share_method: shareMethod
      });
    },

    filterUsed: (filterType: string, filterValue: string) => {
      trackEvent('filter_used', { 
        filter_type: filterType,
        filter_value: filterValue
      });
    }
  };

  // Analytics de performance
  const trackPerformance = {
    pageLoadTime: (pageName: string, loadTime: number) => {
      trackEvent('performance', { 
        page_name: pageName,
        load_time_ms: loadTime,
        metric: 'page_load'
      });
    },

    apiResponse: (endpoint: string, responseTime: number, status: number) => {
      trackEvent('api_performance', { 
        endpoint: endpoint,
        response_time_ms: responseTime,
        status_code: status
      });
    }
  };

  return {
    trackEvent,
    trackPurchaseFlow,
    trackUserFlow,
    trackPerformance
  };
};

// Hook para tracking automático de página
export const usePageTracking = (pageName: string) => {
  const { trackUserFlow, trackPerformance } = useAnalytics();

  useEffect(() => {
    const startTime = performance.now();
    
    // Track page view
    trackUserFlow.pageView(pageName);

    // Track page load performance
    const handleLoad = () => {
      const loadTime = performance.now() - startTime;
      trackPerformance.pageLoadTime(pageName, loadTime);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [pageName]);
};