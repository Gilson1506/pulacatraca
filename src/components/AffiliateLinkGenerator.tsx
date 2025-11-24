// Componente para gerar links de afiliado

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Copy, Check, ExternalLink, TrendingUp } from 'lucide-react';

interface Event {
    id: string;
    title: string;
    image: string;
    start_date: string;
    status: string;
}

interface AffiliateLinkGeneratorProps {
    affiliateCode: string;
}

const AffiliateLinkGenerator = ({ affiliateCode }: AffiliateLinkGeneratorProps) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string>('');
    const [generatedLink, setGeneratedLink] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [clickStats, setClickStats] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            // Buscar eventos aprovados e futuros
            const { data, error } = await supabase
                .from('events')
                .select('id, title, image, start_date, status')
                .eq('status', 'approved')
                .gte('start_date', new Date().toISOString().split('T')[0])
                .order('start_date', { ascending: true })
                .limit(20);

            if (error) throw error;

            setEvents(data || []);

            // Buscar estatísticas de cliques para cada evento
            if (data && data.length > 0) {
                fetchClickStats(data.map(e => e.id));
            }
        } catch (err) {
            console.error('Erro ao buscar eventos:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClickStats = async (eventIds: string[]) => {
        try {
            // Buscar afiliado
            const { data: affiliate } = await supabase
                .from('affiliates')
                .select('id')
                .eq('affiliate_code', affiliateCode)
                .single();

            if (!affiliate) return;

            // Buscar contagem de cliques por evento
            const stats: { [key: string]: number } = {};

            for (const eventId of eventIds) {
                const { count } = await supabase
                    .from('affiliate_clicks')
                    .select('*', { count: 'exact', head: true })
                    .eq('affiliate_id', affiliate.id)
                    .eq('event_id', eventId);

                stats[eventId] = count || 0;
            }

            setClickStats(stats);
        } catch (err) {
            console.error('Erro ao buscar estatísticas:', err);
        }
    };

    const handleGenerateLink = (eventId: string) => {
        setSelectedEvent(eventId);
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/event/${eventId}?ref=${affiliateCode}`;
        setGeneratedLink(link);
        setCopied(false);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Erro ao copiar:', err);
            alert('Erro ao copiar link. Tente novamente.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Nenhum evento disponível no momento.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Lista de Eventos */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Eventos Disponíveis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedEvent === event.id
                                ? 'border-pink-500 bg-pink-50'
                                : 'border-gray-200 hover:border-pink-300'
                                }`}
                            onClick={() => handleGenerateLink(event.id)}
                        >
                            <div className="flex items-start gap-3">
                                {event.image && (
                                    <img
                                        src={event.image}
                                        alt={event.title}
                                        className="w-16 h-16 object-cover rounded"
                                    />
                                )}
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 text-sm">
                                        {event.title}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(event.start_date).toLocaleDateString('pt-BR')}
                                    </p>
                                    {clickStats[event.id] !== undefined && (
                                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                                            <TrendingUp className="h-3 w-3" />
                                            <span>{clickStats[event.id]} cliques</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Link Gerado */}
            {generatedLink && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Seu Link de Afiliado
                    </h3>

                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="text"
                            value={generatedLink}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                        />
                        <button
                            onClick={handleCopyLink}
                            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4" />
                                    Copiado!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4" />
                                    Copiar
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ExternalLink className="h-4 w-4" />
                        <a
                            href={generatedLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-600 hover:text-pink-700 underline"
                        >
                            Abrir link em nova aba
                        </a>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-900">
                            <strong>💡 Dica:</strong> Compartilhe este link nas suas redes sociais,
                            grupos ou com seus contatos. Quando alguém comprar um ingresso através
                            deste link, você ganhará uma comissão!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AffiliateLinkGenerator;
