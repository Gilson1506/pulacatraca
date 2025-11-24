// Hook para rastreamento de afiliados

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    setAffiliateCookie,
    getAffiliateCookie,
    hasAffiliateCookie
} from '../utils/affiliateCookies';
import { trackAffiliateClick } from '../services/affiliateTracking';

interface UseAffiliateTrackingReturn {
    affiliateCode: string | null;
    hasAffiliate: boolean;
    isTracking: boolean;
    trackClick: (eventId: string) => Promise<void>;
}

/**
 * Hook para rastrear referências de afiliado
 * 
 * Detecta parâmetro ?ref= na URL, salva no cookie e registra clique
 * 
 * @example
 * ```tsx
 * const { affiliateCode, trackClick } = useAffiliateTracking();
 * 
 * useEffect(() => {
 *   if (eventId) {
 *     trackClick(eventId);
 *   }
 * }, [eventId]);
 * ```
 */
export const useAffiliateTracking = (): UseAffiliateTrackingReturn => {
    const location = useLocation();
    const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
    const [isTracking, setIsTracking] = useState(false);

    useEffect(() => {
        // Verificar se há código de afiliado na URL
        const searchParams = new URLSearchParams(location.search);
        const refParam = searchParams.get('ref');

        if (refParam) {
            // Novo código de afiliado detectado
            console.log('🔗 Código de afiliado detectado:', refParam);

            // Salvar no cookie
            setAffiliateCookie(refParam);
            setAffiliateCode(refParam);

            console.log('✅ Cookie de afiliado salvo:', refParam);
        } else {
            // Verificar se já existe cookie
            const existingCode = getAffiliateCookie();
            if (existingCode) {
                console.log('🍪 Cookie de afiliado existente:', existingCode);
                setAffiliateCode(existingCode);
            }
        }
    }, [location.search]);

    /**
     * Registra um clique no evento
     */
    const trackClick = async (eventId: string): Promise<void> => {
        if (!affiliateCode || isTracking) {
            return;
        }

        setIsTracking(true);

        try {
            const success = await trackAffiliateClick(eventId, affiliateCode, {
                userAgent: navigator.userAgent,
                referrer: document.referrer,
            });

            if (success) {
                console.log('✅ Clique rastreado com sucesso');
            } else {
                console.warn('⚠️ Falha ao rastrear clique');
            }
        } catch (err) {
            console.error('❌ Erro ao rastrear clique:', err);
        } finally {
            setIsTracking(false);
        }
    };

    return {
        affiliateCode,
        hasAffiliate: hasAffiliateCookie(),
        isTracking,
        trackClick,
    };
};

/**
 * Hook simplificado para apenas obter o código do afiliado
 */
export const useAffiliateCode = (): string | null => {
    const [code, setCode] = useState<string | null>(null);

    useEffect(() => {
        const affiliateCode = getAffiliateCookie();
        setCode(affiliateCode);
    }, []);

    return code;
};
