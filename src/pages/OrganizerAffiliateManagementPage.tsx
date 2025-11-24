// Página de gerenciamento de afiliados para organizadores

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
    TrendingUp, DollarSign, Users, Settings, ArrowLeft,
    Loader2, CheckCircle, XCircle, Edit, Save
} from 'lucide-react';
import { formatCurrency } from '../config/affiliate';

interface EventWithSettings {
    id: string;
    title: string;
    image: string;
    start_date: string;
    commission_type?: string;
    commission_value?: number;
    max_commission?: number;
    is_active?: boolean;
}

interface AffiliateSale {
    id: string;
    sale_amount: number;
    commission_amount: number;
    commission_status: string;
    created_at: string;
    affiliates: {
        affiliate_code: string;
        profiles: {
            name: string;
            email: string;
        };
    };
    events: {
        title: string;
    };
}

const OrganizerAffiliateManagementPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<EventWithSettings[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
    const [editingEvent, setEditingEvent] = useState<string | null>(null);
    const [commissionSettings, setCommissionSettings] = useState<Record<string, {
        commission_type: string;
        commission_value: number;
        max_commission: number;
        is_active: boolean;
    }>>({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (user.role !== 'organizer' && user.role !== 'admin') {
            navigate('/');
            return;
        }

        fetchData();
    }, [user, navigate]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Buscar eventos do organizador
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select('id, title, image, start_date, status')
                .eq('organizer_id', user!.id)
                .eq('status', 'approved')
                .order('start_date', { ascending: false });

            if (eventsError) throw eventsError;

            // Buscar configurações de comissão para cada evento
            const eventIds = eventsData?.map(e => e.id) || [];

            if (eventIds.length > 0) {
                const { data: settingsData, error: settingsError } = await supabase
                    .from('affiliate_event_settings')
                    .select('*')
                    .in('event_id', eventIds);

                if (settingsError) throw settingsError;

                // Mapear configurações por evento
                const settingsMap: any = {};
                settingsData?.forEach(setting => {
                    settingsMap[setting.event_id] = setting;
                });

                // Combinar eventos com configurações
                const eventsWithSettings = eventsData?.map(event => ({
                    ...event,
                    commission_type: settingsMap[event.id]?.commission_type || 'percentage',
                    commission_value: settingsMap[event.id]?.commission_value || 10,
                    max_commission: settingsMap[event.id]?.max_commission || null,
                    is_active: settingsMap[event.id]?.is_active ?? true,
                }));

                setEvents(eventsWithSettings || []);

                // Buscar vendas de afiliados
                const { data: salesData, error: salesError } = await supabase
                    .from('affiliate_sales')
                    .select('*')
                    .in('event_id', eventIds)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (salesError) throw salesError;

                // Se houver vendas, buscar dados dos afiliados e profiles separadamente
                if (salesData && salesData.length > 0) {
                    const affiliateIds = [...new Set(salesData.map(s => s.affiliate_id))];

                    // Buscar afiliados
                    const { data: affiliatesData } = await supabase
                        .from('affiliates')
                        .select('id, affiliate_code, user_id')
                        .in('id', affiliateIds);

                    // Buscar profiles dos afiliados
                    const userIds = affiliatesData?.map(a => a.user_id) || [];
                    const { data: profilesData } = await supabase
                        .from('profiles')
                        .select('id, name, email')
                        .in('id', userIds);

                    // Combinar os dados
                    const salesWithDetails = salesData.map(sale => {
                        const affiliate = affiliatesData?.find(a => a.id === sale.affiliate_id);
                        const profile = profilesData?.find(p => p.id === affiliate?.user_id);
                        const event = eventsData?.find(e => e.id === sale.event_id);

                        return {
                            ...sale,
                            affiliates: affiliate ? {
                                affiliate_code: affiliate.affiliate_code,
                                profiles: profile || { name: 'N/A', email: 'N/A' }
                            } : null,
                            events: event ? { title: event.title } : null
                        };
                    });

                    setSales(salesWithDetails);
                } else {
                    setSales([]);
                }
            }
        } catch (err) {
            console.error('Erro ao buscar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditEvent = (eventId: string, event: EventWithSettings) => {
        setEditingEvent(eventId);
        setCommissionSettings({
            ...commissionSettings,
            [eventId]: {
                commission_type: event.commission_type || 'percentage',
                commission_value: event.commission_value || 10,
                max_commission: event.max_commission || 0,
                is_active: event.is_active ?? true,
            },
        });
    };

    const handleSaveSettings = async (eventId: string) => {
        try {
            const settings = commissionSettings[eventId];

            // Verificar se já existe configuração
            const { data: existing } = await supabase
                .from('affiliate_event_settings')
                .select('id')
                .eq('event_id', eventId)
                .single();

            if (existing) {
                // Atualizar
                const { error } = await supabase
                    .from('affiliate_event_settings')
                    .update({
                        commission_type: settings.commission_type,
                        commission_value: settings.commission_value,
                        max_commission: settings.max_commission || null,
                        is_active: settings.is_active,
                    })
                    .eq('event_id', eventId);

                if (error) throw error;
            } else {
                // Criar
                const { error } = await supabase
                    .from('affiliate_event_settings')
                    .insert({
                        event_id: eventId,
                        commission_type: settings.commission_type,
                        commission_value: settings.commission_value,
                        max_commission: settings.max_commission || null,
                        is_active: settings.is_active,
                    });

                if (error) throw error;
            }

            setModalMessage('Configurações salvas com sucesso!');
            setShowSuccessModal(true);
            setEditingEvent(null);
            fetchData();
        } catch (err: any) {
            console.error('Erro ao salvar:', err);
            setModalMessage(err.message || 'Erro ao salvar configurações');
            setShowErrorModal(true);
        }
    };

    const handleApproveCommission = async (saleId: string) => {
        if (!confirm('Aprovar esta comissão?')) return;

        try {
            const { error } = await supabase
                .from('affiliate_sales')
                .update({ commission_status: 'approved' })
                .eq('id', saleId);

            if (error) throw error;

            setModalMessage('Comissão aprovada com sucesso!');
            setShowSuccessModal(true);
            fetchData();
        } catch (err: any) {
            console.error('Erro ao aprovar:', err);
            setModalMessage(err.message || 'Erro ao aprovar comissão');
            setShowErrorModal(true);
        }
    };

    const handleRejectCommission = async (saleId: string) => {
        if (!confirm('Rejeitar esta comissão?')) return;

        try {
            const { error } = await supabase
                .from('affiliate_sales')
                .update({ commission_status: 'rejected' })
                .eq('id', saleId);

            if (error) throw error;

            setModalMessage('Comissão rejeitada com sucesso!');
            setShowSuccessModal(true);
            fetchData();
        } catch (err: any) {
            console.error('Erro ao rejeitar:', err);
            setModalMessage(err.message || 'Erro ao rejeitar comissão');
            setShowErrorModal(true);
        }
    };

    const filteredSales = selectedEvent
        ? sales.filter(s => s.events?.title === events.find(e => e.id === selectedEvent)?.title)
        : sales;

    const stats = {
        totalSales: sales.reduce((sum, s) => sum + s.sale_amount, 0),
        totalCommission: sales.reduce((sum, s) => sum + s.commission_amount, 0),
        pendingCommission: sales
            .filter(s => s.commission_status === 'pending')
            .reduce((sum, s) => sum + s.commission_amount, 0),
        approvedCommission: sales
            .filter(s => s.commission_status === 'approved')
            .reduce((sum, s) => sum + s.commission_amount, 0),
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/organizer-dashboard')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Voltar para Dashboard
                    </button>

                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Gerenciar Afiliados e Promotores
                    </h1>
                    <p className="text-gray-600">
                        Configure comissões e acompanhe vendas geradas por afiliados
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Vendas de Afiliados</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(stats.totalSales)}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-400" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Comissão Total</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(stats.totalCommission)}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-400" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pendente Aprovação</p>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {formatCurrency(stats.pendingCommission)}
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-yellow-400" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Aprovado</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {formatCurrency(stats.approvedCommission)}
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-400" />
                        </div>
                    </div>
                </div>

                {/* Configurações de Comissão por Evento */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings className="h-6 w-6 text-pink-600" />
                        Configurar Comissões por Evento
                    </h2>

                    <div className="space-y-4">
                        {events.map((event) => (
                            <div key={event.id} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        {event.image && (
                                            <img
                                                src={event.image}
                                                alt={event.title}
                                                className="w-16 h-16 object-cover rounded"
                                            />
                                        )}
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{event.title}</h3>
                                            <p className="text-sm text-gray-500">
                                                {new Date(event.start_date).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>

                                    {editingEvent !== event.id ? (
                                        <button
                                            onClick={() => handleEditEvent(event.id, event)}
                                            className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-700"
                                        >
                                            <Edit className="h-4 w-4" />
                                            Editar
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleSaveSettings(event.id)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 hover:scale-105 transform transition-all duration-200 shadow-lg hover:shadow-xl animate-pulse-slow"
                                        >
                                            <Save className="h-4 w-4" />
                                            Salvar
                                        </button>
                                    )}
                                </div>

                                {editingEvent === event.id ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Tipo de Comissão
                                            </label>
                                            <select
                                                value={commissionSettings[event.id]?.commission_type}
                                                onChange={(e) =>
                                                    setCommissionSettings({
                                                        ...commissionSettings,
                                                        [event.id]: {
                                                            ...commissionSettings[event.id],
                                                            commission_type: e.target.value,
                                                        },
                                                    })
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            >
                                                <option value="percentage">Percentual (%)</option>
                                                <option value="fixed">Valor Fixo (R$)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Valor da Comissão
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={commissionSettings[event.id]?.commission_value}
                                                onChange={(e) =>
                                                    setCommissionSettings({
                                                        ...commissionSettings,
                                                        [event.id]: {
                                                            ...commissionSettings[event.id],
                                                            commission_value: parseFloat(e.target.value),
                                                        },
                                                    })
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Comissão Máxima (R$)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={commissionSettings[event.id]?.max_commission || ''}
                                                onChange={(e) =>
                                                    setCommissionSettings({
                                                        ...commissionSettings,
                                                        [event.id]: {
                                                            ...commissionSettings[event.id],
                                                            max_commission: parseFloat(e.target.value) || 0,
                                                        },
                                                    })
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                placeholder="Opcional"
                                            />
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={commissionSettings[event.id]?.is_active}
                                                onChange={(e) =>
                                                    setCommissionSettings({
                                                        ...commissionSettings,
                                                        [event.id]: {
                                                            ...commissionSettings[event.id],
                                                            is_active: e.target.checked,
                                                        },
                                                    })
                                                }
                                                className="mr-2"
                                            />
                                            <label className="text-sm text-gray-700">
                                                Comissão ativa para este evento
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-600">
                                        <p>
                                            <strong>Tipo:</strong>{' '}
                                            {event.commission_type === 'percentage' ? 'Percentual' : 'Valor Fixo'}
                                        </p>
                                        <p>
                                            <strong>Valor:</strong>{' '}
                                            {event.commission_type === 'percentage'
                                                ? `${event.commission_value}%`
                                                : formatCurrency(event.commission_value || 0)}
                                        </p>
                                        {event.max_commission && (
                                            <p>
                                                <strong>Máximo:</strong> {formatCurrency(event.max_commission)}
                                            </p>
                                        )}
                                        <p>
                                            <strong>Status:</strong>{' '}
                                            <span className={event.is_active ? 'text-green-600' : 'text-red-600'}>
                                                {event.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Vendas de Afiliados */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="h-6 w-6 text-pink-600" />
                            Vendas de Afiliados
                        </h2>

                        <select
                            value={selectedEvent || ''}
                            onChange={(e) => setSelectedEvent(e.target.value || null)}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="">Todos os eventos</option>
                            {events.map((event) => (
                                <option key={event.id} value={event.id}>
                                    {event.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {filteredSales.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            Nenhuma venda de afiliado registrada
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Afiliado
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Evento
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Data
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Venda
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Comissão
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredSales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="text-sm">
                                                    <div className="font-medium text-gray-900">
                                                        {sale.affiliates?.profiles?.name || 'N/A'}
                                                    </div>
                                                    <div className="text-gray-500">
                                                        {sale.affiliates?.affiliate_code}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {sale.events?.title}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {formatCurrency(sale.sale_amount)}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-green-600">
                                                {formatCurrency(sale.commission_amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sale.commission_status === 'approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : sale.commission_status === 'pending'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-100 text-red-800'
                                                        }`}
                                                >
                                                    {sale.commission_status === 'approved'
                                                        ? 'Aprovado'
                                                        : sale.commission_status === 'pending'
                                                            ? 'Pendente'
                                                            : 'Rejeitado'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {sale.commission_status === 'pending' && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleApproveCommission(sale.id)}
                                                            className="p-1 text-green-600 hover:text-green-700"
                                                            title="Aprovar"
                                                        >
                                                            <CheckCircle className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectCommission(sale.id)}
                                                            className="p-1 text-red-600 hover:text-red-700"
                                                            title="Rejeitar"
                                                        >
                                                            <XCircle className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Sucesso */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl transform animate-scaleIn">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                                <CheckCircle className="h-12 w-12 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                Sucesso!
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {modalMessage}
                            </p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Erro */}
            {showErrorModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl transform animate-scaleIn">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <XCircle className="h-12 w-12 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                Erro!
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {modalMessage}
                            </p>
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.85; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out;
                }
                .animate-pulse-slow {
                    animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export default OrganizerAffiliateManagementPage;
