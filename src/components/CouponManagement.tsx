import React, { useState } from 'react';
import { X, Plus, Trash2, Edit3, Percent, DollarSign, Calendar, Users, Tag } from 'lucide-react';

interface CouponData {
    id: string;
    code: string;
    description: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_uses: number | null;
    max_uses_per_user: number;
    valid_from: string;
    valid_until: string;
    applicable_to_all_tickets: boolean;
    applicable_ticket_types: string[];
    minimum_purchase_amount: number | null;
    is_active: boolean;
}

interface CouponManagementProps {
    coupons: CouponData[];
    onCouponsChange: (coupons: CouponData[]) => void;
    availableTicketTypes: { id: string; title: string }[];
}

const CouponManagement: React.FC<CouponManagementProps> = ({
    coupons,
    onCouponsChange,
    availableTicketTypes
}) => {
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<CouponData | null>(null);
    const [formData, setFormData] = useState<Partial<CouponData>>({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        max_uses: null,
        max_uses_per_user: 1,
        valid_from: '',
        valid_until: '',
        applicable_to_all_tickets: true,
        applicable_ticket_types: [],
        minimum_purchase_amount: null,
        is_active: true
    });

    const handleOpenModal = (coupon?: CouponData) => {
        if (coupon) {
            setEditingCoupon(coupon);
            setFormData(coupon);
        } else {
            setEditingCoupon(null);
            setFormData({
                code: '',
                description: '',
                discount_type: 'percentage',
                discount_value: 0,
                max_uses: null,
                max_uses_per_user: 1,
                valid_from: '',
                valid_until: '',
                applicable_to_all_tickets: true,
                applicable_ticket_types: [],
                minimum_purchase_amount: null,
                is_active: true
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCoupon(null);
    };

    const handleSaveCoupon = () => {
        // Validações
        if (!formData.code || !formData.code.trim()) {
            alert('Código do cupom é obrigatório');
            return;
        }

        if (!formData.discount_value || formData.discount_value <= 0) {
            alert('Valor do desconto deve ser maior que zero');
            return;
        }

        if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
            alert('Desconto percentual não pode ser maior que 100%');
            return;
        }

        // Validar código único
        const codeExists = coupons.some(
            c => c.code.toUpperCase() === formData.code!.toUpperCase() && c.id !== editingCoupon?.id
        );
        if (codeExists) {
            alert('Já existe um cupom com este código');
            return;
        }

        const newCoupon: CouponData = {
            id: editingCoupon?.id || `coupon_${Date.now()}`,
            code: formData.code!.toUpperCase().trim(),
            description: formData.description || '',
            discount_type: formData.discount_type!,
            discount_value: Number(formData.discount_value),
            max_uses: formData.max_uses ? Number(formData.max_uses) : null,
            max_uses_per_user: Number(formData.max_uses_per_user) || 1,
            valid_from: formData.valid_from || '',
            valid_until: formData.valid_until || '',
            applicable_to_all_tickets: formData.applicable_to_all_tickets!,
            applicable_ticket_types: formData.applicable_ticket_types || [],
            minimum_purchase_amount: formData.minimum_purchase_amount ? Number(formData.minimum_purchase_amount) : null,
            is_active: formData.is_active !== undefined ? formData.is_active : true
        };

        if (editingCoupon) {
            // Atualizar cupom existente
            onCouponsChange(coupons.map(c => c.id === editingCoupon.id ? newCoupon : c));
        } else {
            // Adicionar novo cupom
            onCouponsChange([...coupons, newCoupon]);
        }

        handleCloseModal();
    };

    const handleDeleteCoupon = (couponId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este cupom?')) {
            onCouponsChange(coupons.filter(c => c.id !== couponId));
        }
    };

    const handleToggleActive = (couponId: string) => {
        onCouponsChange(
            coupons.map(c =>
                c.id === couponId ? { ...c, is_active: !c.is_active } : c
            )
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Cupons de Desconto</h3>
                    <p className="text-sm text-gray-600">Crie cupons para oferecer descontos aos compradores</p>
                </div>
                <button
                    type="button"
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Adicionar Cupom
                </button>
            </div>

            {/* Lista de Cupons */}
            {coupons.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Tag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nenhum cupom criado ainda</p>
                    <p className="text-sm text-gray-500 mt-1">Clique em "Adicionar Cupom" para criar o primeiro</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {coupons.map(coupon => (
                        <div
                            key={coupon.id}
                            className={`border rounded-lg p-4 ${coupon.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono font-bold text-lg text-pink-600">{coupon.code}</span>
                                        {!coupon.is_active && (
                                            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                                                Inativo
                                            </span>
                                        )}
                                    </div>
                                    {coupon.description && (
                                        <p className="text-sm text-gray-600">{coupon.description}</p>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenModal(coupon)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                        title="Editar"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteCoupon(coupon.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                        title="Excluir"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    {coupon.discount_type === 'percentage' ? (
                                        <Percent className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <DollarSign className="h-4 w-4 text-green-600" />
                                    )}
                                    <span className="font-semibold text-green-700">
                                        {coupon.discount_type === 'percentage'
                                            ? `${coupon.discount_value}% de desconto`
                                            : `R$ ${coupon.discount_value.toFixed(2)} de desconto`}
                                    </span>
                                </div>

                                {coupon.max_uses && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Users className="h-4 w-4" />
                                        <span>Limite: {coupon.max_uses} usos</span>
                                    </div>
                                )}

                                {(coupon.valid_from || coupon.valid_until) && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {coupon.valid_from && `De ${new Date(coupon.valid_from).toLocaleDateString('pt-BR')}`}
                                            {coupon.valid_from && coupon.valid_until && ' '}
                                            {coupon.valid_until && `até ${new Date(coupon.valid_until).toLocaleDateString('pt-BR')}`}
                                        </span>
                                    </div>
                                )}

                                <div className="pt-2 border-t">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={coupon.is_active}
                                            onChange={() => handleToggleActive(coupon.id)}
                                            className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                        />
                                        <span className="text-sm text-gray-700">Cupom ativo</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Criação/Edição */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
                                </h3>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Código */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Código do Cupom *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                                        placeholder="Ex: PROMO10, BLACKFRIDAY"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono"
                                        maxLength={50}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Apenas letras maiúsculas e números</p>
                                </div>

                                {/* Descrição */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Descrição
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Ex: Desconto especial para Black Friday"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        rows={2}
                                    />
                                </div>

                                {/* Tipo e Valor do Desconto */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tipo de Desconto *
                                        </label>
                                        <select
                                            value={formData.discount_type}
                                            onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        >
                                            <option value="percentage">Percentual (%)</option>
                                            <option value="fixed">Valor Fixo (R$)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Valor do Desconto *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.discount_value}
                                            onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                                            min="0"
                                            max={formData.discount_type === 'percentage' ? 100 : undefined}
                                            step={formData.discount_type === 'percentage' ? 1 : 0.01}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                </div>

                                {/* Limites de Uso */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Limite Total de Usos
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.max_uses || ''}
                                            onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? Number(e.target.value) : null })}
                                            placeholder="Ilimitado"
                                            min="1"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Usos por Usuário
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.max_uses_per_user}
                                            onChange={(e) => setFormData({ ...formData, max_uses_per_user: Number(e.target.value) })}
                                            min="1"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                </div>

                                {/* Período de Validade */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Válido de
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={formData.valid_from}
                                            onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Válido até
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={formData.valid_until}
                                            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                </div>

                                {/* Valor Mínimo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Valor Mínimo de Compra
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.minimum_purchase_amount || ''}
                                        onChange={(e) => setFormData({ ...formData, minimum_purchase_amount: e.target.value ? Number(e.target.value) : null })}
                                        placeholder="Sem mínimo"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                </div>

                                {/* Aplicabilidade */}
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.applicable_to_all_tickets}
                                            onChange={(e) => setFormData({ ...formData, applicable_to_all_tickets: e.target.checked })}
                                            className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Aplicar a todos os tipos de ingresso</span>
                                    </label>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Cupom ativo</span>
                                    </label>
                                </div>
                            </div>

                            {/* Botões */}
                            <div className="flex gap-3 mt-6 pt-6 border-t">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveCoupon}
                                    className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                                >
                                    {editingCoupon ? 'Salvar Alterações' : 'Criar Cupom'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponManagement;
