import React, { useState, useEffect } from 'react';
import { Tag, TrendingUp, Users, Calendar, Edit3, Trash2, Plus, BarChart3, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CouponManagement from './CouponManagement';

interface Coupon {
    id: string;
    event_id: string;
    code: string;
    description: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_uses: number | null;
    max_uses_per_user: number;
    current_uses: number;
    valid_from: string;
    valid_until: string;
    minimum_purchase_amount: number | null;
    is_active: boolean;
    created_at: string;
    event?: {
        title: string;
    };
}

interface CouponStats {
    total_coupons: number;
    active_coupons: number;
    total_uses: number;
    total_discount_given: number;
}

const OrganizerCoupons: React.FC = () => {
    const { user } = useAuth();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [stats, setStats] = useState<CouponStats>({
        total_coupons: 0,
        active_coupons: 0,
        total_uses: 0,
        total_discount_given: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<string>('all');
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            loadCoupons();
            loadEvents();
        }
    }, [user]);

    const loadEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('id, title')
                .eq('organizer_id', user!.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEvents(data || []);
        } catch (error) {
            console.error('Erro ao carregar eventos:', error);
        }
    };

    const loadCoupons = async () => {
        try {
            setIsLoading(true);

            // Buscar cupons do organizador
            const { data: couponsData, error: couponsError } = await supabase
                .from('event_coupons')
                .select(`
          *,
          events!inner(title)
        `)
                .eq('organizer_id', user!.id)
                .order('created_at', { ascending: false });

            if (couponsError) throw couponsError;

            const formattedCoupons = (couponsData || []).map((c: any) => ({
                ...c,
                event: { title: c.events?.title || 'Evento não encontrado' }
            }));

            setCoupons(formattedCoupons);

            // Calcular estatísticas
            const totalCoupons = formattedCoupons.length;
            const activeCoupons = formattedCoupons.filter((c: Coupon) => c.is_active).length;
            const totalUses = formattedCoupons.reduce((sum: number, c: Coupon) => sum + c.current_uses, 0);

            // Buscar valor total de descontos dados
            const { data: usageData, error: usageError } = await supabase
                .from('coupon_usage')
                .select('discount_amount')
                .in('coupon_id', formattedCoupons.map((c: Coupon) => c.id));

            if (!usageError && usageData) {
                const totalDiscount = usageData.reduce((sum, u) => sum + (u.discount_amount || 0), 0);
                setStats({
                    total_coupons: totalCoupons,
                    active_coupons: activeCoupons,
                    total_uses: totalUses,
                    total_discount_given: totalDiscount
                });
            } else {
                setStats({
                    total_coupons: totalCoupons,
                    active_coupons: activeCoupons,
                    total_uses: totalUses,
                    total_discount_given: 0
                });
            }
        } catch (error) {
            console.error('Erro ao carregar cupons:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleActive = async (couponId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('event_coupons')
                .update({ is_active: !currentStatus })
                .eq('id', couponId);

            if (error) throw error;

            await loadCoupons();
        } catch (error) {
            console.error('Erro ao atualizar cupom:', error);
            alert('Erro ao atualizar cupom');
        }
    };

    const handleDeleteCoupon = async (couponId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este cupom? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('event_coupons')
                .delete()
                .eq('id', couponId);

            if (error) throw error;

            await loadCoupons();
        } catch (error) {
            console.error('Erro ao excluir cupom:', error);
            alert('Erro ao excluir cupom');
        }
    };

    const filteredCoupons = coupons.filter(coupon => {
        // Filtro de status
        if (filter === 'active' && !coupon.is_active) return false;
        if (filter === 'inactive' && coupon.is_active) return false;

        // Filtro de evento
        if (selectedEvent !== 'all' && coupon.event_id !== selectedEvent) return false;

        // Filtro de busca
        if (searchTerm && !coupon.code.toLowerCase().includes(searchTerm.toLowerCase())) return false;

        return true;
    });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Cupons de Desconto</h2>
                    <p className="text-gray-600">Gerencie todos os cupons dos seus eventos</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Novo Cupom
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total de Cupons</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total_coupons}</p>
                        </div>
                        <Tag className="h-8 w-8 text-pink-600" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Cupons Ativos</p>
                            <p className="text-2xl font-bold text-green-600">{stats.active_coupons}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total de Usos</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.total_uses}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-600" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Desconto Total</p>
                            <p className="text-2xl font-bold text-purple-600">
                                R$ {stats.total_discount_given.toFixed(2)}
                            </p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-purple-600" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por código..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />

                    <select
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                        <option value="all">Todos os Eventos</option>
                        {events.map(event => (
                            <option key={event.id} value={event.id}>{event.title}</option>
                        ))}
                    </select>

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                        <option value="all">Todos</option>
                        <option value="active">Ativos</option>
                        <option value="inactive">Inativos</option>
                    </select>
                </div>
            </div>

            {/* Coupons List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin h-12 w-12 border-4 border-pink-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-600 mt-4">Carregando cupons...</p>
                </div>
            ) : filteredCoupons.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Tag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nenhum cupom encontrado</p>
                    <p className="text-sm text-gray-500 mt-1">
                        {searchTerm || filter !== 'all' ? 'Tente ajustar os filtros' : 'Crie seu primeiro cupom'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evento</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desconto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usos</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validade</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredCoupons.map(coupon => (
                                    <tr key={coupon.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-mono font-bold text-pink-600">{coupon.code}</p>
                                                {coupon.description && (
                                                    <p className="text-sm text-gray-500">{coupon.description}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {coupon.event?.title}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-green-600">
                                                {coupon.discount_type === 'percentage'
                                                    ? `${coupon.discount_value}%`
                                                    : `R$ ${coupon.discount_value.toFixed(2)}`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <p className="font-semibold">{coupon.current_uses}</p>
                                                {coupon.max_uses && (
                                                    <p className="text-gray-500">de {coupon.max_uses}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {coupon.valid_until ? (
                                                new Date(coupon.valid_until) < new Date() ? (
                                                    <span className="text-red-600">Expirado</span>
                                                ) : (
                                                    new Date(coupon.valid_until).toLocaleDateString('pt-BR')
                                                )
                                            ) : (
                                                'Sem limite'
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleActive(coupon.id, coupon.is_active)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${coupon.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {coupon.is_active ? 'Ativo' : 'Inativo'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDeleteCoupon(coupon.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Modal - Placeholder for now */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Criar Novo Cupom</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Selecione um evento para criar um cupom ou crie cupons diretamente no formulário de criação/edição de eventos.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizerCoupons;
