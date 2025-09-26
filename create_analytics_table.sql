-- ============================================================================
-- CRIAÇÃO DA TABELA ANALYTICS PARA TRACKING DE EVENTOS
-- ============================================================================

-- Criar tabela analytics
CREATE TABLE IF NOT EXISTS public.analytics (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255) NOT NULL,
    page_url TEXT NOT NULL,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON public.analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON public.analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_page_url ON public.analytics(page_url);

-- Criar índice composto para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_analytics_user_session ON public.analytics(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_timestamp ON public.analytics(event_type, timestamp);

-- Comentários para documentação
COMMENT ON TABLE public.analytics IS 'Tabela para armazenar eventos de analytics e tracking de usuários';
COMMENT ON COLUMN public.analytics.event_type IS 'Tipo do evento (ex: page_view, purchase_intent, etc.)';
COMMENT ON COLUMN public.analytics.event_data IS 'Dados específicos do evento em formato JSON';
COMMENT ON COLUMN public.analytics.user_id IS 'ID do usuário (pode ser null para usuários não logados)';
COMMENT ON COLUMN public.analytics.session_id IS 'ID único da sessão do usuário';
COMMENT ON COLUMN public.analytics.page_url IS 'URL da página onde o evento ocorreu';
COMMENT ON COLUMN public.analytics.user_agent IS 'User agent do navegador';
COMMENT ON COLUMN public.analytics.timestamp IS 'Timestamp do evento';

-- Política RLS (Row Level Security)
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de analytics (qualquer usuário pode inserir)
CREATE POLICY "Permitir inserção de analytics" ON public.analytics
    FOR INSERT WITH CHECK (true);

-- Política para permitir leitura apenas para usuários autenticados
CREATE POLICY "Permitir leitura de analytics para usuários autenticados" ON public.analytics
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Função para limpeza automática de dados antigos (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
    -- Deletar registros mais antigos que 90 dias
    DELETE FROM public.analytics 
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Comentário na função
COMMENT ON FUNCTION cleanup_old_analytics() IS 'Função para limpeza automática de dados de analytics antigos (mais de 90 dias)';
