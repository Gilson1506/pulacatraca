import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { registerEventView, getEventViewStats } from '@/services/eventViewsService';

/**
 * Gerar ou recuperar session ID do localStorage
 * Este ID é único por navegador e persiste entre sessões
 */
function getSessionId(): string {
    const key = 'event_session_id';
    let sessionId = localStorage.getItem(key);

    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(key, sessionId);
    }

    return sessionId;
}

/**
 * Hook para rastrear visualização de evento
 * Registra automaticamente quando o componente é montado
 * 
 * Deduplicação: IP + User Agent (permanente)
 * - Uma vez registrada, a view não é contada novamente para o mesmo IP+UA
 * - Delay de 2 segundos para evitar bots e garantir engajamento real
 * 
 * @param eventId - ID do evento a ser rastreado
 * @param enabled - Se false, não rastreia (útil para preview/admin)
 */
export function useEventViews(eventId: string | undefined, enabled: boolean = true) {
    const { user } = useAuth();
    const hasTracked = useRef(false);

    useEffect(() => {
        // Não rastrear se:
        // - Não há eventId
        // - Já foi rastreado
        // - Está desabilitado
        if (!eventId || hasTracked.current || !enabled) return;

        const trackView = async () => {
            try {
                const sessionId = getSessionId();

                const result = await registerEventView({
                    eventId,
                    userId: user?.id,
                    sessionId,
                    userAgent: navigator.userAgent
                });

                hasTracked.current = true;

                if (result.is_new_view) {
                    console.log('✅ View registrada para evento:', eventId);
                } else {
                    console.log('ℹ️ View já registrada anteriormente para este IP/UA');
                }
            } catch (error) {
                console.error('❌ Erro ao registrar view:', error);
                // Não bloquear a UX por erro no tracking
            }
        };

        // Delay de 2 segundos para:
        // 1. Evitar bots que saem imediatamente
        // 2. Garantir que é um usuário real interessado
        // 3. Reduzir carga no servidor
        const timer = setTimeout(trackView, 2000);

        return () => clearTimeout(timer);
    }, [eventId, user?.id, enabled]);
}

/**
 * Hook para obter estatísticas de views em tempo real
 * Útil para dashboards de organizadores
 * 
 * @param eventId - ID do evento
 * @param refreshInterval - Intervalo de atualização em ms (0 = sem auto-refresh)
 */
export function useEventViewStats(eventId: string | undefined, refreshInterval: number = 0) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!eventId) return;

        const fetchStats = async () => {
            try {
                setLoading(true);
                const data = await getEventViewStats(eventId);
                setStats(data);
                setError(null);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();

        // Auto-refresh se configurado
        if (refreshInterval > 0) {
            const interval = setInterval(fetchStats, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [eventId, refreshInterval]);

    return { stats, loading, error };
}
