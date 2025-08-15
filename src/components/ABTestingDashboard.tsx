import React, { useState } from 'react';
import { useABTesting } from '../hooks/useABTesting';
import { useAnalytics } from '../hooks/useAnalytics';
import { Activity, Settings, BarChart3, RefreshCw, X } from 'lucide-react';

interface ABTestingDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const ABTestingDashboard: React.FC<ABTestingDashboardProps> = ({ isOpen, onClose }) => {
  const { 
    userTests, 
    getActiveTests, 
    forceVariant, 
    resetAllTests,
    loading 
  } = useABTesting();
  
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<string>('');

  if (!isOpen) return null;

  // Mostrar apenas em desenvolvimento
  if (process.env.NODE_ENV === 'production') return null;

  const activeTests = getActiveTests();

  const handleForceVariant = () => {
    if (selectedTest && selectedVariant) {
      forceVariant(selectedTest, selectedVariant);
      setSelectedTest('');
      setSelectedVariant('');
    }
  };

  // Analytics locais
  const localAnalytics = JSON.parse(localStorage.getItem('local_analytics') || '[]');
  const abTestEvents = localAnalytics.filter((event: any) => 
    event.event_type.includes('ab_test')
  );

  const availableTests = [
    {
      id: 'auth_modal_vs_page',
      name: 'Modal vs Página de Autenticação',
      variants: [
        { id: 'modal', name: 'Modal de Login' },
        { id: 'page', name: 'Página de Auth' }
      ]
    },
    {
      id: 'checkout_flow',
      name: 'Fluxo de Checkout',
      variants: [
        { id: 'single_page', name: 'Página Única' },
        { id: 'multi_step', name: 'Multi-step' },
        { id: 'express_checkout', name: 'Checkout Expresso' }
      ]
    },
    {
      id: 'pricing_display',
      name: 'Exibição de Preços',
      variants: [
        { id: 'with_tax', name: 'Com Taxas Visíveis' },
        { id: 'clean_price', name: 'Preço Limpo' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center">
            <BarChart3 className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-bold">A/B Testing Dashboard</h2>
            <span className="ml-2 bg-yellow-500 text-yellow-900 px-2 py-1 rounded text-xs font-semibold">
              DEV ONLY
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          
          {/* Status dos Testes Ativos */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-green-500" />
              Testes Ativos ({activeTests.length})
            </h3>
            
            {activeTests.length > 0 ? (
              <div className="grid gap-4">
                {activeTests.map(test => (
                  <div key={test.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800">{test.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        test.isControl 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {test.isControl ? 'Controle' : 'Variante'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">
                      Variante Atual: <strong>{test.variant}</strong>
                    </p>
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer hover:text-gray-700">
                        Configuração
                      </summary>
                      <pre className="mt-2 bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                        {JSON.stringify(test.config, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Nenhum teste A/B ativo no momento
              </p>
            )}
          </div>

          {/* Controle Manual */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-blue-500" />
              Controle Manual
            </h3>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ Use apenas para desenvolvimento e testes. 
                Alterações forçadas podem afetar dados de analytics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar Teste
                </label>
                <select
                  value={selectedTest}
                  onChange={(e) => setSelectedTest(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Escolher teste...</option>
                  {availableTests.map(test => (
                    <option key={test.id} value={test.id}>
                      {test.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar Variante
                </label>
                <select
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  disabled={!selectedTest}
                >
                  <option value="">Escolher variante...</option>
                  {selectedTest && availableTests
                    .find(t => t.id === selectedTest)?.variants
                    .map(variant => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  onClick={handleForceVariant}
                  disabled={!selectedTest || !selectedVariant}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Forçar Variante
                </button>
              </div>
            </div>
          </div>

          {/* Analytics Rápidos */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">
              Analytics de Testes (Últimos eventos)
            </h3>
            
            {abTestEvents.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                {abTestEvents.slice(-10).reverse().map((event: any, index: number) => (
                  <div key={index} className="border-b border-gray-200 pb-2 mb-2 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">
                        {event.event_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {event.event_data.test_name} - {event.event_data.variant_name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Nenhum evento de A/B testing registrado
              </p>
            )}
          </div>

          {/* Ações de Reset */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 text-red-600">
              Zona de Perigo
            </h3>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm mb-4">
                Resetar todos os testes A/B irá recarregar a página e limpar todos os dados de teste.
              </p>
              <button
                onClick={resetAllTests}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Resetar Todos os Testes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook para abrir/fechar o dashboard (atalho de teclado)
export const useABTestingDashboardShortcut = () => {
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + A para abrir dashboard
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  return { isOpen, setIsOpen };
};

export default ABTestingDashboard;