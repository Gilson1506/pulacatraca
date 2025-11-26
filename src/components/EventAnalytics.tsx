import React, { useEffect, useState } from 'react';
import { Eye, TrendingUp, Users, Calendar, BarChart3 } from 'lucide-react';
import { getEventViewStats, getEventViewsHistory } from '@/services/eventViewsService';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface EventAnalyticsProps {
    eventId: string;
}

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: 'blue' | 'green' | 'purple' | 'pink';
    subtitle?: string;
}

function MetricCard({ icon, label, value, color, subtitle }: MetricCardProps) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        pink: 'bg-pink-50 text-pink-600 border-pink-200'
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className={`inline-flex p-3 rounded-lg ${colors[color]} mb-3`}>
                {icon}
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value.toLocaleString('pt-BR')}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
    );
}

export default function EventAnalytics({ eventId }: EventAnalyticsProps) {
    const [stats, setStats] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAnalytics();
    }, [eventId]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const [statsData, historyData] = await Promise.all([
                getEventViewStats(eventId),
                getEventViewsHistory(eventId, 30)
            ]);

            setStats(statsData);
            setHistory(historyData);
        } catch (err) {
            console.error('Erro ao carregar analytics:', err);
            setError('Erro ao carregar estatísticas. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600">{error}</p>
                <button
                    onClick={loadAnalytics}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    if (!stats) return null;

    // Preparar dados para o gráfico
    const chartData = {
        labels: history.map(h => new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })),
        datasets: [{
            label: 'Visualizações',
            data: history.map(h => h.views),
            borderColor: 'rgb(236, 72, 153)',
            backgroundColor: 'rgba(236, 72, 153, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: 'rgb(236, 72, 153)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                    size: 14
                },
                bodyFont: {
                    size: 13
                },
                callbacks: {
                    label: function (context: any) {
                        return `${context.parsed.y} visualizações`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-pink-600" />
                <h2 className="text-2xl font-bold text-gray-900">Analytics do Evento</h2>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={<Eye className="w-5 h-5" />}
                    label="Total de Views"
                    value={stats.totalViews}
                    color="blue"
                    subtitle="Todas as visualizações"
                />
                <MetricCard
                    icon={<Users className="w-5 h-5" />}
                    label="Views Únicas"
                    value={stats.uniqueViews}
                    color="green"
                    subtitle="Visitantes únicos"
                />
                <MetricCard
                    icon={<Calendar className="w-5 h-5" />}
                    label="Hoje"
                    value={stats.viewsToday}
                    color="purple"
                    subtitle="Últimas 24 horas"
                />
                <MetricCard
                    icon={<TrendingUp className="w-5 h-5" />}
                    label="Esta Semana"
                    value={stats.viewsThisWeek}
                    color="pink"
                    subtitle="Últimos 7 dias"
                />
            </div>

            {/* Gráfico de Views ao Longo do Tempo */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Views nos Últimos 30 Dias
                </h3>
                <div className="h-64">
                    <Line data={chartData} options={chartOptions} />
                </div>
            </div>

            {/* Estatísticas Adicionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Este Mês</h4>
                    <p className="text-3xl font-bold text-blue-700">
                        {stats.viewsThisMonth.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">visualizações nos últimos 30 dias</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                    <h4 className="text-sm font-semibold text-green-900 mb-2">Taxa de Engajamento</h4>
                    <p className="text-3xl font-bold text-green-700">
                        {stats.totalViews > 0
                            ? ((stats.uniqueViews / stats.totalViews) * 100).toFixed(1)
                            : 0}%
                    </p>
                    <p className="text-xs text-green-600 mt-1">visitantes únicos / total</p>
                </div>
            </div>
        </div>
    );
}
