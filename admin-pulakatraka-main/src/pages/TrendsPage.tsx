import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, MapPin, Star, ArrowUpRight, ArrowDownRight, Target, Zap, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Category {
  name: string;
  growth: number;
  events: number;
  avgTickets: number;
  trend: 'up' | 'down';
}

interface Location {
  city: string;
  events: number;
  growth: number;
  revenue: number;
}

interface Prediction {
  category: string;
  prediction: string;
  confidence: number;
  factors: string[];
}

interface TrendingData {
  categories: Category[];
  locations: Location[];
  predictions: Prediction[];
}

interface SupabaseEvent {
  id: string;
  category: string;
  city: string;
  date: string;
}

interface SupabaseSale {
  id: string;
  quantity: number;
  total_amount: number;
  created_at: string;
  event?: {
    category: string;
    city: string;
  };
}

interface CategoryStats {
  name: string;
  currentEvents: number;
  previousEvents: number;
  currentTickets: number;
  totalRevenue: number;
}

interface LocationStats {
  city: string;
  events: number;
  revenue: number;
  previousEvents: number;
}

export default function TrendsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('3months');
  const [selectedView, setSelectedView] = useState('categories');
  const [isLoading, setIsLoading] = useState(true);
  const [trendingData, setTrendingData] = useState<TrendingData>({
    categories: [],
    locations: [],
    predictions: []
  });

  useEffect(() => {
    fetchTrendingData();
  }, [selectedPeriod]);

  const fetchTrendingData = async () => {
    try {
      setIsLoading(true);

      // Buscar dados de eventos para calcular tendências por categoria
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('date', getPeriodStartDate());

      if (eventsError) throw eventsError;

      // Buscar dados de vendas para calcular receita
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          event:events(category, city)
        `)
        .gte('created_at', getPeriodStartDate());

      if (salesError) throw salesError;

      // Calcular tendências por categoria
      const categoryStats = calculateCategoryStats(events, sales);
      
      // Calcular tendências por localização
      const locationStats = calculateLocationStats(events, sales);

      // Gerar previsões baseadas nos dados
      const predictions = generatePredictions(categoryStats, locationStats);

      setTrendingData({
        categories: categoryStats,
        locations: locationStats,
        predictions
      });
    } catch (error) {
      console.error('Erro ao buscar dados de tendências:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPeriodStartDate = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case '1month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case '3months':
        return new Date(now.setMonth(now.getMonth() - 3)).toISOString();
      case '6months':
        return new Date(now.setMonth(now.getMonth() - 6)).toISOString();
      case '1year':
        return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
      default:
        return new Date(now.setMonth(now.getMonth() - 3)).toISOString();
    }
  };

  const calculateCategoryStats = (events: SupabaseEvent[], sales: SupabaseSale[]): Category[] => {
    const categories = events.reduce((acc: { [key: string]: CategoryStats }, event) => {
      const category = event.category || 'Outros';
      if (!acc[category]) {
        acc[category] = {
          name: category,
          currentEvents: 0,
          previousEvents: 0,
          currentTickets: 0,
          totalRevenue: 0
        };
      }
      acc[category].currentEvents++;
      return acc;
    }, {});

    // Calcular vendas por categoria
    sales.forEach(sale => {
      const category = sale.event?.category || 'Outros';
      if (categories[category]) {
        categories[category].currentTickets += sale.quantity || 0;
        categories[category].totalRevenue += sale.total_amount || 0;
      }
    });

    return Object.values(categories).map(cat => {
      const trend: 'up' | 'down' = cat.currentEvents >= cat.previousEvents ? 'up' : 'down';
      return {
        name: cat.name,
        growth: calculateGrowth(cat.currentEvents, cat.previousEvents),
        events: cat.currentEvents,
        avgTickets: Math.round(cat.currentTickets / (cat.currentEvents || 1)),
        trend
      };
    });
  };

  const calculateLocationStats = (events: SupabaseEvent[], sales: SupabaseSale[]): Location[] => {
    const locations = events.reduce((acc: { [key: string]: LocationStats }, event) => {
      const city = event.city || 'Outros';
      if (!acc[city]) {
        acc[city] = {
          city,
          events: 0,
          revenue: 0,
          previousEvents: 0
        };
      }
      acc[city].events++;
      return acc;
    }, {});

    // Calcular receita por cidade
    sales.forEach(sale => {
      const city = sale.event?.city || 'Outros';
      if (locations[city]) {
        locations[city].revenue += sale.total_amount || 0;
      }
    });

    return Object.values(locations)
      .map(loc => ({
        city: loc.city,
        events: loc.events,
        growth: calculateGrowth(loc.events, loc.previousEvents),
        revenue: loc.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return 100;
    return Math.round(((current - previous) / previous) * 100);
  };

  const generatePredictions = (categories: Category[], locations: Location[]): Prediction[] => {
    const predictions: Prediction[] = [];

    // Encontrar categoria com maior crescimento
    const topCategory = [...categories].sort((a, b) => b.growth - a.growth)[0];
    if (topCategory) {
      predictions.push({
        category: topCategory.name,
        prediction: `Crescimento projetado de ${Math.round(topCategory.growth * 1.2)}% nos próximos 3 meses`,
        confidence: Math.min(85, Math.round(60 + topCategory.growth / 2)),
        factors: [
          'Alta demanda atual',
          'Crescimento consistente',
          'Tendência de mercado positiva'
        ]
      });
    }

    // Encontrar cidade com maior crescimento
    const topLocation = [...locations].sort((a, b) => b.growth - a.growth)[0];
    if (topLocation) {
      predictions.push({
        category: `Mercado: ${topLocation.city}`,
        prediction: 'Emergência como novo polo de eventos',
        confidence: Math.min(80, Math.round(55 + topLocation.growth / 2)),
        factors: [
          'Crescimento acelerado',
          'Alta receita por evento',
          'Demanda local forte'
        ]
      });
    }

    // Adicionar previsão geral do mercado
    predictions.push({
      category: 'Tendência Geral',
      prediction: 'Expansão do mercado de eventos',
      confidence: 75,
      factors: [
        'Retomada pós-pandemia',
        'Novos formatos de eventos',
        'Investimentos no setor'
      ]
    });

    return predictions;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact'
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Tendências e Previsões</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Análise de mercado e previsões para o setor de eventos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="1month">Último mês</option>
            <option value="3months">Últimos 3 meses</option>
            <option value="6months">Últimos 6 meses</option>
            <option value="1year">Último ano</option>
          </select>
        </div>
      </div>

      {/* Trend Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-green-100 dark:border-green-800 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Categorias em Alta</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">3</p>
              <div className="flex items-center space-x-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">+38% média</span>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 lg:p-4 rounded-xl">
              <TrendingUp className="w-6 lg:w-8 h-6 lg:h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-red-100 dark:border-red-800 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Categorias em Baixa</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">2</p>
              <div className="flex items-center space-x-1 mt-2">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">-10% média</span>
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-3 lg:p-4 rounded-xl">
              <TrendingDown className="w-6 lg:w-8 h-6 lg:h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-100 dark:border-blue-800 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Mercados Emergentes</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">5</p>
              <div className="flex items-center space-x-1 mt-2">
                <Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Novas cidades</span>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 lg:p-4 rounded-xl">
              <MapPin className="w-6 lg:w-8 h-6 lg:h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-100 dark:border-purple-800 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Previsão Confiança</p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">78%</p>
              <div className="flex items-center space-x-1 mt-2">
                <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">Alta precisão</span>
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 lg:p-4 rounded-xl">
              <Target className="w-6 lg:w-8 h-6 lg:h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setSelectedView('categories')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedView === 'categories' 
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Categorias
            </button>
            <button
              onClick={() => setSelectedView('locations')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedView === 'locations' 
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Localizações
            </button>
            <button
              onClick={() => setSelectedView('predictions')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedView === 'predictions' 
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Previsões
            </button>
          </div>
        </div>
      </div>

      {/* Content based on selected view */}
      {selectedView === 'categories' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Tendências por Categoria</h3>
          <div className="space-y-4">
            {trendingData.categories.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    category.trend === 'up' 
                      ? 'bg-green-100 dark:bg-green-900/50' 
                      : 'bg-red-100 dark:bg-red-900/50'
                  }`}>
                    {category.trend === 'up' ? (
                      <ArrowUpRight className={`w-5 h-5 ${
                        category.trend === 'up' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                    ) : (
                      <ArrowDownRight className={`w-5 h-5 ${
                        category.trend === 'up' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{category.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{category.events} eventos • {category.avgTickets} ingressos/evento</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    category.trend === 'up' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {category.growth > 0 ? '+' : ''}{category.growth}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">vs período anterior</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedView === 'locations' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Tendências por Localização</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingData.locations.map((location, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>{location.city}</span>
                  </h4>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">+{location.growth}%</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Eventos</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{location.events}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Receita</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(location.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedView === 'predictions' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Previsões de Mercado</h3>
            <div className="space-y-6">
              {trendingData.predictions.map((prediction, index) => (
                <div key={index} className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg">{prediction.category}</h4>
                      <p className="text-gray-700 dark:text-gray-300 mt-1">{prediction.prediction}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                        <span className="text-lg font-bold text-gray-900 dark:text-white">{prediction.confidence}%</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Confiança</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nível de Confiança</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{prediction.confidence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          prediction.confidence >= 80 ? 'bg-green-500' :
                          prediction.confidence >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${prediction.confidence}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fatores Influenciadores:</p>
                    <div className="flex flex-wrap gap-2">
                      {prediction.factors.map((factor, factorIndex) => (
                        <span 
                          key={factorIndex}
                          className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Market Insights */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 lg:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Insights do Mercado</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Oportunidade Emergente</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Eventos de E-sports mostram potencial de crescimento de 150% nos próximos 6 meses, 
                  especialmente em São Paulo e Rio de Janeiro.
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Alerta de Mercado</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Shows de música sertaneja apresentam saturação em algumas regiões. 
                  Considere diversificação para outros gêneros musicais.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}