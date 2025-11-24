// Serviço de rastreamento de afiliados

import { supabase } from '../lib/supabase';
import { calculateCommission, AFFILIATE_CONFIG } from '../config/affiliate';

interface ClickMetadata {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
}

interface Affiliate {
    id: string;
    user_id: string;
    affiliate_code: string;
    status: string;
    total_sales: number;
    total_commission: number;
    pending_commission: number;
    paid_commission: number;
}

interface CommissionSettings {
    commission_type: string;
    commission_value: number;
    max_commission?: number;
    is_active: boolean;
}

interface SaleData {
    transactionId?: string;
    ticketId?: string;
    saleAmount: number;
}

/**
 * Busca afiliado pelo código
 */
export const getAffiliateByCode = async (
    code: string
): Promise<Affiliate | null> => {
    try {
        const { data, error } = await supabase
            .from('affiliates')
            .select('*')
            .eq('affiliate_code', code)
            .eq('status', 'active')
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Não encontrado
                return null;
            }
            throw error;
        }

        return data;
    } catch (err) {
        console.error('Erro ao buscar afiliado:', err);
        return null;
    }
};

/**
 * Registra um clique no link de afiliado
 */
export const trackAffiliateClick = async (
    affiliateCode: string,
    eventId: string,
    metadata: ClickMetadata = {}
): Promise<boolean> => {
    try {
        // Buscar afiliado
        const affiliate = await getAffiliateByCode(affiliateCode);

        if (!affiliate) {
            console.warn('Afiliado não encontrado ou inativo:', affiliateCode);
            return false;
        }

        // Registrar clique
        const { error } = await supabase
            .from('affiliate_clicks')
            .insert({
                affiliate_id: affiliate.id,
                event_id: eventId,
                ip_address: metadata.ipAddress || null,
                user_agent: metadata.userAgent || navigator.userAgent,
                referrer: metadata.referrer || document.referrer || null,
                converted: false,
            });

        if (error) {
            console.error('Erro ao registrar clique:', error);
            return false;
        }

        console.log('✅ Clique registrado para afiliado:', affiliateCode);
        return true;
    } catch (err) {
        console.error('Erro ao rastrear clique:', err);
        return false;
    }
};

/**
 * Busca configuração de comissão do evento
 */
export const getEventCommissionSettings = async (
    eventId: string
): Promise<CommissionSettings | null> => {
    try {
        const { data, error } = await supabase
            .from('affiliate_event_settings')
            .select('*')
            .eq('event_id', eventId)
            .eq('is_active', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Usar configuração padrão
                return {
                    commission_type: AFFILIATE_CONFIG.COMMISSION_TYPE.PERCENTAGE,
                    commission_value: AFFILIATE_CONFIG.DEFAULT_COMMISSION_PERCENTAGE,
                    is_active: true,
                };
            }
            throw error;
        }

        return {
            commission_type: data.commission_type,
            commission_value: data.commission_value,
            max_commission: data.max_commission,
            is_active: data.is_active,
        };
    } catch (err) {
        console.error('Erro ao buscar configuração de comissão:', err);
        // Retornar padrão em caso de erro
        return {
            commission_type: AFFILIATE_CONFIG.COMMISSION_TYPE.PERCENTAGE,
            commission_value: AFFILIATE_CONFIG.DEFAULT_COMMISSION_PERCENTAGE,
            is_active: true,
        };
    }
};

/**
 * Cria registro de venda de afiliado
 */
export const createAffiliateSale = async (
    affiliateCode: string,
    eventId: string,
    saleData: SaleData
): Promise<boolean> => {
    try {
        // Buscar afiliado
        const affiliate = await getAffiliateByCode(affiliateCode);

        if (!affiliate) {
            console.warn('Afiliado não encontrado ou inativo:', affiliateCode);
            return false;
        }

        // Buscar configuração de comissão
        const commissionSettings = await getEventCommissionSettings(eventId);

        if (!commissionSettings || !commissionSettings.is_active) {
            console.warn('Comissão não ativa para este evento');
            return false;
        }

        // Calcular comissão
        const commissionAmount = calculateCommission(
            saleData.saleAmount,
            commissionSettings.commission_type,
            commissionSettings.commission_value,
            commissionSettings.max_commission
        );

        // Criar registro de venda
        const { error: saleError } = await supabase
            .from('affiliate_sales')
            .insert({
                affiliate_id: affiliate.id,
                event_id: eventId,
                transaction_id: saleData.transactionId || null,
                ticket_id: saleData.ticketId || null,
                sale_amount: saleData.saleAmount,
                commission_amount: commissionAmount,
                commission_status: 'pending',
            });

        if (saleError) {
            console.error('Erro ao criar venda de afiliado:', saleError);
            return false;
        }

        // Atualizar totais do afiliado
        const { error: updateError } = await supabase
            .from('affiliates')
            .update({
                total_sales: affiliate.total_sales + saleData.saleAmount,
                total_commission: affiliate.total_commission + commissionAmount,
                pending_commission: affiliate.pending_commission + commissionAmount,
            })
            .eq('id', affiliate.id);

        if (updateError) {
            console.error('Erro ao atualizar totais do afiliado:', updateError);
        }

        // Marcar clique como convertido (se existir)
        await supabase
            .from('affiliate_clicks')
            .update({
                converted: true,
                transaction_id: saleData.transactionId || null,
            })
            .eq('affiliate_id', affiliate.id)
            .eq('event_id', eventId)
            .eq('converted', false)
            .order('created_at', { ascending: false })
            .limit(1);

        console.log('✅ Venda de afiliado registrada:', {
            affiliate: affiliateCode,
            sale: saleData.saleAmount,
            commission: commissionAmount,
        });

        return true;
    } catch (err) {
        console.error('Erro ao criar venda de afiliado:', err);
        return false;
    }
};

/**
 * Busca estatísticas de cliques do afiliado
 */
export const getAffiliateClickStats = async (
    affiliateId: string
): Promise<{
    totalClicks: number;
    convertedClicks: number;
    conversionRate: number;
}> => {
    try {
        const { data: allClicks, error: allError } = await supabase
            .from('affiliate_clicks')
            .select('id', { count: 'exact', head: true })
            .eq('affiliate_id', affiliateId);

        const { data: converted, error: convertedError } = await supabase
            .from('affiliate_clicks')
            .select('id', { count: 'exact', head: true })
            .eq('affiliate_id', affiliateId)
            .eq('converted', true);

        if (allError || convertedError) {
            throw allError || convertedError;
        }

        const totalClicks = allClicks || 0;
        const convertedClicks = converted || 0;
        const conversionRate = totalClicks > 0
            ? (convertedClicks / totalClicks) * 100
            : 0;

        return {
            totalClicks,
            convertedClicks,
            conversionRate: Math.round(conversionRate * 100) / 100,
        };
    } catch (err) {
        console.error('Erro ao buscar estatísticas de cliques:', err);
        return {
            totalClicks: 0,
            convertedClicks: 0,
            conversionRate: 0,
        };
    }
};

/**
 * Busca vendas recentes do afiliado
 */
export const getAffiliateSales = async (
    affiliateId: string,
    limit: number = 10
): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('affiliate_sales')
            .select(`
        *,
        events:event_id (
          title,
          image
        )
      `)
            .eq('affiliate_id', affiliateId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data || [];
    } catch (err) {
        console.error('Erro ao buscar vendas do afiliado:', err);
        return [];
    }
};
