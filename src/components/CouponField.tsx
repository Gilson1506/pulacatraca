import React from 'react';
import { Tag, X, Loader2 } from 'lucide-react';

interface CouponFieldProps {
    couponCode: string;
    setCouponCode: (code: string) => void;
    appliedCoupon: any;
    couponError: string | null;
    isValidatingCoupon: boolean;
    onValidate: () => void;
    onRemove: () => void;
    disabled?: boolean;
}

const CouponField: React.FC<CouponFieldProps> = ({
    couponCode,
    setCouponCode,
    appliedCoupon,
    couponError,
    isValidatingCoupon,
    onValidate,
    onRemove,
    disabled = false
}) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
                <Tag className="h-5 w-5 text-pink-600" />
                <h3 className="text-lg font-semibold text-gray-900">Cupom de Desconto</h3>
            </div>

            {!appliedCoupon ? (
                <div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            onKeyPress={(e) => e.key === 'Enter' && onValidate()}
                            placeholder="Digite o código do cupom"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono uppercase"
                            disabled={disabled || isValidatingCoupon}
                            maxLength={50}
                        />
                        <button
                            onClick={onValidate}
                            disabled={!couponCode.trim() || isValidatingCoupon || disabled}
                            className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isValidatingCoupon ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Validando...
                                </>
                            ) : (
                                'Aplicar'
                            )}
                        </button>
                    </div>

                    {couponError && (
                        <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                            <X className="h-4 w-4" />
                            <span>{couponError}</span>
                        </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                        Digite o código do cupom para obter desconto na compra
                    </p>
                </div>
            ) : (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-lg text-green-800">
                                    {appliedCoupon.code}
                                </span>
                                <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                                    Aplicado
                                </span>
                            </div>

                            {appliedCoupon.description && (
                                <p className="text-sm text-green-700 mb-2">{appliedCoupon.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-sm">
                                <span className="font-semibold text-green-800">
                                    Desconto: {appliedCoupon.discount_type === 'percentage'
                                        ? `${appliedCoupon.discount_value}%`
                                        : `R$ ${appliedCoupon.discount_value.toFixed(2)}`}
                                </span>

                                {appliedCoupon.minimum_purchase_amount && (
                                    <span className="text-green-600">
                                        Mínimo: R$ {appliedCoupon.minimum_purchase_amount.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={onRemove}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover cupom"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponField;
