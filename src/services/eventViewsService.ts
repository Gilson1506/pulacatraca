import { supabase } from '@/lib/supabase';

export interface RegisterViewParams {
    eventId: string;
    userId?: string;
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface EventViewStats {
    totalViews: number;
    uniqueViews: number;
    lastViewedAt: string | null;
    viewsToday: number;
    viewsThisWeek: number;
    viewsThisMonth: number;
}

export interface ViewHistoryItem {
    date: string;
    views: number;
}

/**
 * Registrar visualização de evento
 * Usa deduplicação por IP + User Agent (permanente)
 */
export async function registerEventView(params: RegisterViewParams) {
    try {
        const { data, error } = await supabase.rpc('register_event_view', {
            p_event_id: params.eventId,
            p_user_id: params.userId || null,
            p_session_id: params.sessionId,
            p_ip_address: params.ipAddress || null,
            p_user_agent: params.userAgent || navigator.userAgent
        });

        if (error) {
            console.error('Erro ao registrar view:', error);
            throw error;
        }

        console.log('📊 View registrada:', data);
        return data;
    } catch (error) {
        console.error('❌ Erro ao registrar view:', error);
        // Não propagar erro para não quebrar a UX
        return { success: false, is_new_view: false, is_unique_view: false };
    }
}

/**
 * Obter estatísticas de views de um evento
 */
export async function getEventViewStats(eventId: string): Promise<EventViewStats> {
    try {
        const { data, error } = await supabase.rpc('get_event_view_stats', {
            p_event_id: eventId
        });

        if (error) throw error;

        return {
            totalViews: data.total_views || 0,
            uniqueViews: data.unique_views || 0,
            lastViewedAt: data.last_viewed_at,
            viewsToday: data.views_today || 0,
            viewsThisWeek: data.views_this_week || 0,
            viewsThisMonth: data.views_this_month || 0
        };
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        throw error;
    }
}

/**
 * Obter histórico de views por dia (para gráficos)
 */
export async function getEventViewsHistory(
    eventId: string,
    days: number = 30
): Promise<ViewHistoryItem[]> {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('event_views')
            .select('viewed_at')
            .eq('event_id', eventId)
            .gte('viewed_at', startDate.toISOString())
            .order('viewed_at', { ascending: true });

        if (error) throw error;

        // Agrupar por dia
        const viewsByDay: { [key: string]: number } = {};

        // Inicializar todos os dias com 0
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            const dateStr = date.toISOString().split('T')[0];
            viewsByDay[dateStr] = 0;
        }

        // Contar views por dia
        data?.forEach(view => {
            const date = new Date(view.viewed_at).toISOString().split('T')[0];
            if (viewsByDay.hasOwnProperty(date)) {
                viewsByDay[date]++;
            }
        });

        return Object.entries(viewsByDay)
            .map(([date, views]) => ({ date, views }))
            .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        throw error;
    }
}

/**
 * Obter top eventos por visualizações
 */
export async function getTopViewedEvents(limit: number = 10) {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('id, title, image, view_count, unique_view_count')
            .eq('status', 'approved')
            .order('view_count', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar top eventos:', error);
        throw error;
    }
}

/**
 * Obter eventos em alta (com mais views recentes)
 */
export async function getTrendingEvents(limit: number = 10, days: number = 7) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Buscar eventos com views recentes
        const { data: recentViews, error: viewsError } = await supabase
            .from('event_views')
            .select('event_id')
            .gte('viewed_at', startDate.toISOString());

        if (viewsError) throw viewsError;

        // Contar views por evento
        const viewCounts: { [key: string]: number } = {};
        recentViews?.forEach(view => {
            viewCounts[view.event_id] = (viewCounts[view.event_id] || 0) + 1;
        });

        // Ordenar por contagem
        const topEventIds = Object.entries(viewCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([id]) => id);

        if (topEventIds.length === 0) return [];

        // Buscar detalhes dos eventos
        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('id, title, image, view_count, unique_view_count, start_date')
            .in('id', topEventIds)
            .eq('status', 'approved');

        if (eventsError) throw eventsError;

        // Ordenar eventos pela contagem de views recentes
        return events?.sort((a, b) => {
            return (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0);
        }) || [];
    } catch (error) {
        console.error('Erro ao buscar eventos em alta:', error);
        throw error;
    }
}
