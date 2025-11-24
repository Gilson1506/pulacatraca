// Serviço para validação e gerenciamento de cupons
import { supabase } from '../lib/supabase';

export interface CouponValidationResult {
    isValid: boolean;
    error?: string;
    coupon?: any;
    discountAmount?: number;
}

export const validateCoupon = async (
    code: string,
    eventId: string,
    userId: string,
    subtotalAmount: number
): Promise<CouponValidationResult> => {
    try {
        // 1. Buscar cupom
        const { data: coupon, error } = await supabase
            .from('event_coupons')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('event_id', eventId)
            .eq('is_active', true)
            .single();

        if (error || !coupon) {
            return {
                isValid: false,
                error: 'Cupom inválido ou não encontrado'
            };
        }

        // 2. Validar validade temporal
        const now = new Date();
        if (coupon.valid_from && new Date(coupon.valid_from) > now) {
            return {
                isValid: false,
                error: 'Cupom ainda não está válido'
            };
        }

        if (coupon.valid_until && new Date(coupon.valid_until) < now) {
            return {
                isValid: false,
                error: 'Cupom expirado'
            };
        }

        // 3. Validar limite de usos totais
        if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
            return {
                isValid: false,
                error: 'Cupom esgotado'
            };
        }

        // 4. Validar uso por usuário
        const { count, error: countError } = await supabase
            .from('coupon_usage')
            .select('*', { count: 'exact', head: true })
            .eq('coupon_id', coupon.id)
            .eq('user_id', userId);

        if (countError) {
            console.error('Erro ao verificar uso do cupom:', countError);
            return {
                isValid: false,
                error: 'Erro ao validar cupom'
            };
        }

        if ((count || 0) >= coupon.max_uses_per_user) {
            return {
                isValid: false,
                error: 'Você já usou este cupom o máximo de vezes permitido'
            };
        }

        // 5. Validar valor mínimo de compra
        if (coupon.minimum_purchase_amount !== null && subtotalAmount < coupon.minimum_purchase_amount) {
            return {
                isValid: false,
                error: `Valor mínimo de compra: R$ ${coupon.minimum_purchase_amount.toFixed(2)}`
            };
        }

        // 6. Calcular desconto
        let discountAmount = 0;
        if (coupon.discount_type === 'percentage') {
            discountAmount = subtotalAmount * (coupon.discount_value / 100);
        } else {
            discountAmount = coupon.discount_value;
        }

        // Garantir que o desconto não seja maior que o subtotal
        discountAmount = Math.min(discountAmount, subtotalAmount);

        return {
            isValid: true,
            coupon,
            discountAmount
        };
    } catch (error) {
        console.error('Erro ao validar cupom:', error);
        return {
            isValid: false,
            error: 'Erro ao validar cupom'
        };
    }
};

export const registerCouponUsage = async (
    couponId: string,
    userId: string,
    orderId: string,
    originalAmount: number,
    discountAmount: number,
    finalAmount: number
) => {
    try {
        // 1. Registrar uso
        const { error: usageError } = await supabase
            .from('coupon_usage')
            .insert({
                coupon_id: couponId,
                user_id: userId,
                order_id: orderId,
                original_amount: originalAmount,
                discount_amount: discountAmount,
                final_amount: finalAmount
            });

        if (usageError) {
            console.error('Erro ao registrar uso do cupom:', usageError);
            throw usageError;
        }

        // 2. Incrementar contador de usos
        const { error: incrementError } = await supabase
            .rpc('increment_coupon_uses', { p_coupon_id: couponId });

        if (incrementError) {
            console.error('Erro ao incrementar contador de usos:', incrementError);
            // Não lançar erro aqui para não bloquear a compra
        }

        return true;
    } catch (error) {
        console.error('Erro ao registrar uso do cupom:', error);
        throw error;
    }
};
