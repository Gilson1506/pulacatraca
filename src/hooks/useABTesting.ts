import { useState, useEffect } from 'react';
import { useAnalytics } from './useAnalytics';
import { safeSetItem } from '../utils/cacheManager';

interface ABTest {
  id: string;
  name: string;
  variants: ABVariant[];
  enabled: boolean;
  trafficAllocation: number; // 0-100 percentage
  startDate: string;
  endDate?: string;
  targetMetric: string;
}

interface ABVariant {
  id: string;
  name: string;
  weight: number; // 0-100 percentage
  config: any;
}

interface ABTestResult {
  variant: ABVariant;
  isControl: boolean;
}

// Testes A/B disponíveis
const availableTests: ABTest[] = [
  {
    id: 'auth_modal_vs_page',
    name: 'Modal vs Página de Autenticação',
    variants: [
      {
        id: 'modal',
        name: 'Modal de Login',
        weight: 50,
        config: { useModal: true }
      },
      {
        id: 'page',
        name: 'Página de Auth',
        weight: 50,
        config: { useModal: false }
      }
    ],
    enabled: true,
    trafficAllocation: 100,
    startDate: '2024-01-01',
    targetMetric: 'auth_conversion'
  },
  {
    id: 'checkout_flow',
    name: 'Fluxo de Checkout',
    variants: [
      {
        id: 'single_page',
        name: 'Página Única',
        weight: 30,
        config: { steps: 1, layout: 'single' }
      },
      {
        id: 'multi_step',
        name: 'Multi-step',
        weight: 40,
        config: { steps: 3, layout: 'wizard' }
      },
      {
        id: 'express_checkout',
        name: 'Checkout Expresso',
        weight: 30,
        config: { steps: 1, layout: 'express', autofill: true }
      }
    ],
    enabled: true,
    trafficAllocation: 80,
    startDate: '2024-01-15',
    targetMetric: 'checkout_completion'
  },
  {
    id: 'event_card_design',
    name: 'Design dos Cards de Evento',
    variants: [
      {
        id: 'current',
        name: 'Design Atual',
        weight: 50,
        config: { 
          imageSize: 'standard',
          pricePosition: 'bottom',
          hoverEffect: 'scale'
        }
      },
      {
        id: 'large_image',
        name: 'Imagem Grande',
        weight: 50,
        config: { 
          imageSize: 'large',
          pricePosition: 'overlay',
          hoverEffect: 'lift'
        }
      }
    ],
    enabled: false,
    trafficAllocation: 50,
    startDate: '2024-02-01',
    targetMetric: 'event_click_rate'
  },
  {
    id: 'pricing_display',
    name: 'Exibição de Preços',
    variants: [
      {
        id: 'with_tax',
        name: 'Com Taxas Visíveis',
        weight: 50,
        config: { showTaxes: true, breakdown: true }
      },
      {
        id: 'clean_price',
        name: 'Preço Limpo',
        weight: 50,
        config: { showTaxes: false, breakdown: false }
      }
    ],
    enabled: true,
    trafficAllocation: 60,
    startDate: '2024-01-20',
    targetMetric: 'purchase_conversion'
  }
];

export const useABTesting = () => {
  const [userTests, setUserTests] = useState<{ [testId: string]: ABTestResult }>({});
  const [loading, setLoading] = useState(true);
  const { trackEvent } = useAnalytics();

  // Gerar ID único para o usuário (persistente)
    const getUserId = () => {
      let userId = localStorage.getItem('ab_user_id') || sessionStorage.getItem('ab_user_id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (!safeSetItem('ab_user_id', userId, { fallbackToSessionStorage: true, keyDescription: 'ab_user_id' })) {
          try {
            sessionStorage.setItem('ab_user_id', userId);
          } catch {
            // Ignorar
          }
        }
      }
      return userId;
    };

  // Hash function para distribuição consistente
  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };

  // Determinar variante para um teste
  const getVariantForTest = (test: ABTest, userId: string): ABTestResult | null => {
    // Verificar se o teste está ativo
    if (!test.enabled) return null;
    
    const now = new Date();
    const startDate = new Date(test.startDate);
    const endDate = test.endDate ? new Date(test.endDate) : null;
    
    if (now < startDate || (endDate && now > endDate)) {
      return null;
    }

    // Verificar se o usuário está na alocação de tráfego
    const userHash = hashString(userId + test.id);
    const trafficBucket = userHash % 100;
    
    if (trafficBucket >= test.trafficAllocation) {
      return null; // Usuário não participa deste teste
    }

    // Determinar variante baseada no peso
    const variantHash = hashString(userId + test.id + 'variant');
    const variantBucket = variantHash % 100;
    
    let cumulativeWeight = 0;
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (variantBucket < cumulativeWeight) {
        return {
          variant,
          isControl: variant.id === test.variants[0].id
        };
      }
    }

    // Fallback para primeira variante
    return {
      variant: test.variants[0],
      isControl: true
    };
  };

  // Inicializar testes A/B
  useEffect(() => {
    const initializeTests = () => {
      const userId = getUserId();
      const testResults: { [testId: string]: ABTestResult } = {};

      // Verificar se já existem resultados salvos
      // Limitar tamanho dos dados de AB testing
        const savedTests = localStorage.getItem('ab_test_results') || sessionStorage.getItem('ab_test_results');
      if (savedTests && savedTests.length > 100 * 1024) { // 100KB máximo
        console.warn('🧹 Dados de AB testing muito grandes, limpando...');
        localStorage.removeItem('ab_test_results');
          sessionStorage.removeItem('ab_test_results');
        return null;
      }
      if (savedTests) {
        try {
          const parsed = JSON.parse(savedTests);
          Object.assign(testResults, parsed);
        } catch (error) {
          console.error('Erro ao carregar testes A/B salvos:', error);
        }
      }

      // Processar cada teste disponível
      availableTests.forEach(test => {
        // Se já temos resultado para este teste, manter
        if (testResults[test.id]) return;

        const result = getVariantForTest(test, userId);
        if (result) {
          testResults[test.id] = result;
          
          // Track participação no teste
          trackEvent('ab_test_enrolled', {
            test_id: test.id,
            test_name: test.name,
            variant_id: result.variant.id,
            variant_name: result.variant.name,
            is_control: result.isControl
          });
        }
      });

      setUserTests(testResults);
      
      // Salvar resultados
        try {
          let entries = Object.entries(testResults);
          const MAX_TESTS_STORED = 10;
          if (entries.length > MAX_TESTS_STORED) {
            entries = entries.slice(-MAX_TESTS_STORED);
          }
          const trimmedResults = Object.fromEntries(entries);

          let dataStr = JSON.stringify(trimmedResults);
          const MAX_RESULTS_PAYLOAD = 80 * 1024; // ~80KB
          while (dataStr.length > MAX_RESULTS_PAYLOAD && entries.length > 3) {
            entries = entries.slice(-(entries.length - 1));
            dataStr = JSON.stringify(Object.fromEntries(entries));
          }

          if (!safeSetItem('ab_test_results', dataStr, { fallbackToSessionStorage: true, keyDescription: 'ab_test_results' })) {
            console.warn('Resultados de AB testing salvos via fallback temporário.');
          }
        } catch (error) {
          console.error('Erro ao salvar AB test results:', error);
        }
      setLoading(false);
    };

    initializeTests();
  }, []);

  // Obter configuração de um teste específico
  const getTestConfig = (testId: string) => {
    const testResult = userTests[testId];
    return testResult ? testResult.variant.config : null;
  };

  // Verificar se está em uma variante específica
  const isVariant = (testId: string, variantId: string) => {
    const testResult = userTests[testId];
    return testResult?.variant.id === variantId;
  };

  // Verificar se é grupo de controle
  const isControl = (testId: string) => {
    const testResult = userTests[testId];
    return testResult?.isControl || false;
  };

  // Track conversão/métrica para um teste
  const trackConversion = (testId: string, metricValue: number = 1, additionalData: any = {}) => {
    const testResult = userTests[testId];
    if (!testResult) return;

    const test = availableTests.find(t => t.id === testId);
    if (!test) return;

    trackEvent('ab_test_conversion', {
      test_id: testId,
      test_name: test.name,
      variant_id: testResult.variant.id,
      variant_name: testResult.variant.name,
      is_control: testResult.isControl,
      metric_name: test.targetMetric,
      metric_value: metricValue,
      ...additionalData
    });
  };

  // Obter resumo dos testes ativos
  const getActiveTests = () => {
    return Object.keys(userTests).map(testId => {
      const test = availableTests.find(t => t.id === testId);
      const result = userTests[testId];
      
      return {
        id: testId,
        name: test?.name || 'Unknown Test',
        variant: result.variant.name,
        isControl: result.isControl,
        config: result.variant.config
      };
    });
  };

  // Funcionalidades específicas para testes comuns
  const shouldUseAuthModal = () => {
    return getTestConfig('auth_modal_vs_page')?.useModal !== false;
  };

  const getCheckoutLayout = () => {
    const config = getTestConfig('checkout_flow');
    return config || { steps: 1, layout: 'single' };
  };

  const getEventCardConfig = () => {
    const config = getTestConfig('event_card_design');
    return config || { 
      imageSize: 'standard',
      pricePosition: 'bottom',
      hoverEffect: 'scale'
    };
  };

  const getPricingConfig = () => {
    const config = getTestConfig('pricing_display');
    return config || { showTaxes: false, breakdown: false };
  };

  // Forçar participação em um teste (para desenvolvimento/debug)
  const forceVariant = (testId: string, variantId: string) => {
    const test = availableTests.find(t => t.id === testId);
    if (!test) return;

    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) return;

    const newResult: ABTestResult = {
      variant,
      isControl: variant.id === test.variants[0].id
    };

    const updatedTests = { ...userTests, [testId]: newResult };
    setUserTests(updatedTests);
      try {
        let entries = Object.entries(updatedTests);
        const MAX_TESTS_STORED = 10;
        if (entries.length > MAX_TESTS_STORED) {
          entries = entries.slice(-MAX_TESTS_STORED);
        }
        const trimmedResults = Object.fromEntries(entries);

        let dataStr = JSON.stringify(trimmedResults);
        const MAX_RESULTS_PAYLOAD = 80 * 1024;
        while (dataStr.length > MAX_RESULTS_PAYLOAD && entries.length > 3) {
          entries = entries.slice(-(entries.length - 1));
          dataStr = JSON.stringify(Object.fromEntries(entries));
        }

        if (!safeSetItem('ab_test_results', dataStr, { fallbackToSessionStorage: true, keyDescription: 'ab_test_results' })) {
          console.warn('Resultados de AB testing salvos via fallback temporário.');
        }
      } catch (error) {
        console.error('Erro ao salvar AB test results:', error);
      }

    trackEvent('ab_test_forced', {
      test_id: testId,
      variant_id: variantId,
      forced_by: 'developer'
    });
  };

  // Reset todos os testes (para desenvolvimento)
    const resetAllTests = () => {
    setUserTests({});
    localStorage.removeItem('ab_test_results');
    localStorage.removeItem('ab_user_id');
      sessionStorage.removeItem('ab_test_results');
      sessionStorage.removeItem('ab_user_id');
    window.location.reload();
  };

  return {
    loading,
    userTests,
    getTestConfig,
    isVariant,
    isControl,
    trackConversion,
    getActiveTests,
    shouldUseAuthModal,
    getCheckoutLayout,
    getEventCardConfig,
    getPricingConfig,
    forceVariant,
    resetAllTests
  };
};