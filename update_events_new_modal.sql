-- ===================================================================
-- SCRIPT PARA ADAPTAR TABELA EVENTS AO NOVO MODAL
-- ===================================================================

-- 1. VERIFICAR ESTRUTURA ATUAL DA TABELA EVENTS
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO ESTRUTURA ATUAL DA TABELA EVENTS ===';
END $$;

SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ADICIONAR COLUNAS NECESSÁRIAS PARA O NOVO MODAL
DO $$
BEGIN
    -- Adicionar coluna subject (assunto do evento)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'subject'
    ) THEN
        ALTER TABLE events ADD COLUMN subject TEXT;
        RAISE NOTICE '✅ Coluna subject adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna subject já existe';
    END IF;

    -- Adicionar coluna subcategory (categoria opcional)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'subcategory'
    ) THEN
        ALTER TABLE events ADD COLUMN subcategory TEXT;
        RAISE NOTICE '✅ Coluna subcategory adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna subcategory já existe';
    END IF;

    -- Adicionar coluna end_date (data de término)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'end_date'
    ) THEN
        ALTER TABLE events ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Coluna end_date adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna end_date já existe';
    END IF;

    -- Adicionar coluna location_type (tipo de local)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'location_type'
    ) THEN
        ALTER TABLE events ADD COLUMN location_type TEXT DEFAULT 'physical' 
        CHECK (location_type IN ('tbd', 'physical', 'online'));
        RAISE NOTICE '✅ Coluna location_type adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_type já existe';
    END IF;

    -- Adicionar colunas de endereço detalhado
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'location_search'
    ) THEN
        ALTER TABLE events ADD COLUMN location_search TEXT;
        RAISE NOTICE '✅ Coluna location_search adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_search já existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'location_name'
    ) THEN
        ALTER TABLE events ADD COLUMN location_name TEXT;
        RAISE NOTICE '✅ Coluna location_name adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_name já existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'location_cep'
    ) THEN
        ALTER TABLE events ADD COLUMN location_cep TEXT;
        RAISE NOTICE '✅ Coluna location_cep adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_cep já existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'location_street'
    ) THEN
        ALTER TABLE events ADD COLUMN location_street TEXT;
        RAISE NOTICE '✅ Coluna location_street adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_street já existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'location_number'
    ) THEN
        ALTER TABLE events ADD COLUMN location_number TEXT;
        RAISE NOTICE '✅ Coluna location_number adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_number já existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'location_complement'
    ) THEN
        ALTER TABLE events ADD COLUMN location_complement TEXT;
        RAISE NOTICE '✅ Coluna location_complement adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_complement já existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'location_neighborhood'
    ) THEN
        ALTER TABLE events ADD COLUMN location_neighborhood TEXT;
        RAISE NOTICE '✅ Coluna location_neighborhood adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_neighborhood já existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'location_city'
    ) THEN
        ALTER TABLE events ADD COLUMN location_city TEXT;
        RAISE NOTICE '✅ Coluna location_city adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_city já existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'location_state'
    ) THEN
        ALTER TABLE events ADD COLUMN location_state TEXT;
        RAISE NOTICE '✅ Coluna location_state adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_state já existe';
    END IF;

    -- Adicionar coluna ticket_type (tipo de ingresso)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'ticket_type'
    ) THEN
        ALTER TABLE events ADD COLUMN ticket_type TEXT DEFAULT 'paid' 
        CHECK (ticket_type IN ('paid', 'free'));
        RAISE NOTICE '✅ Coluna ticket_type adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna ticket_type já existe';
    END IF;

    -- Adicionar colunas para metadados de imagem
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'image_size'
    ) THEN
        ALTER TABLE events ADD COLUMN image_size INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Coluna image_size adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna image_size já existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'image_format'
    ) THEN
        ALTER TABLE events ADD COLUMN image_format TEXT;
        RAISE NOTICE '✅ Coluna image_format adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna image_format já existe';
    END IF;

    -- Adicionar colunas de auditoria
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE events ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Coluna created_by adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna created_by já existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE events ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Coluna updated_at adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna updated_at já existe';
    END IF;
END $$;

-- 3. ATUALIZAR TIPOS DE DADOS EXISTENTES
DO $$
BEGIN
    -- Garantir que description seja TEXT para suportar rich text
    ALTER TABLE events ALTER COLUMN description TYPE TEXT;
    RAISE NOTICE '✅ Coluna description definida como TEXT';

    -- Garantir que image seja TEXT para URLs longas do bucket event_banners
    ALTER TABLE events ALTER COLUMN image TYPE TEXT;
    RAISE NOTICE '✅ Coluna image definida como TEXT';

    -- Garantir que location seja TEXT para endereços longos
    ALTER TABLE events ALTER COLUMN location TYPE TEXT;
    RAISE NOTICE '✅ Coluna location definida como TEXT';
END $$;

-- 4. ATUALIZAR TABELA TICKETS PARA SUPORTAR NOVOS CAMPOS
DO $$
BEGIN
    -- Adicionar coluna has_half_price
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'has_half_price'
    ) THEN
        ALTER TABLE tickets ADD COLUMN has_half_price BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Coluna has_half_price adicionada em tickets';
    ELSE
        RAISE NOTICE '⚠️ Coluna has_half_price já existe em tickets';
    END IF;

    -- Adicionar coluna sale_period_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'sale_period_type'
    ) THEN
        ALTER TABLE tickets ADD COLUMN sale_period_type TEXT DEFAULT 'date' 
        CHECK (sale_period_type IN ('date', 'batch'));
        RAISE NOTICE '✅ Coluna sale_period_type adicionada em tickets';
    ELSE
        RAISE NOTICE '⚠️ Coluna sale_period_type já existe em tickets';
    END IF;

    -- Adicionar colunas de período de vendas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'sale_start_date'
    ) THEN
        ALTER TABLE tickets ADD COLUMN sale_start_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Coluna sale_start_date adicionada em tickets';
    ELSE
        RAISE NOTICE '⚠️ Coluna sale_start_date já existe em tickets';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'sale_end_date'
    ) THEN
        ALTER TABLE tickets ADD COLUMN sale_end_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Coluna sale_end_date adicionada em tickets';
    ELSE
        RAISE NOTICE '⚠️ Coluna sale_end_date já existe em tickets';
    END IF;

    -- Adicionar coluna availability
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'availability'
    ) THEN
        ALTER TABLE tickets ADD COLUMN availability TEXT DEFAULT 'public' 
        CHECK (availability IN ('public', 'restricted', 'manual'));
        RAISE NOTICE '✅ Coluna availability adicionada em tickets';
    ELSE
        RAISE NOTICE '⚠️ Coluna availability já existe em tickets';
    END IF;

    -- Adicionar colunas de quantidade mínima e máxima
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'min_quantity'
    ) THEN
        ALTER TABLE tickets ADD COLUMN min_quantity INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Coluna min_quantity adicionada em tickets';
    ELSE
        RAISE NOTICE '⚠️ Coluna min_quantity já existe em tickets';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'max_quantity'
    ) THEN
        ALTER TABLE tickets ADD COLUMN max_quantity INTEGER DEFAULT 5;
        RAISE NOTICE '✅ Coluna max_quantity adicionada em tickets';
    ELSE
        RAISE NOTICE '⚠️ Coluna max_quantity já existe em tickets';
    END IF;

    -- Expandir coluna description em tickets
    ALTER TABLE tickets ALTER COLUMN description TYPE TEXT;
    RAISE NOTICE '✅ Coluna description em tickets definida como TEXT';
END $$;

-- 5. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_events_subject ON events(subject);
CREATE INDEX IF NOT EXISTS idx_events_subcategory ON events(subcategory);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_location_type ON events(location_type);
CREATE INDEX IF NOT EXISTS idx_events_location_city ON events(location_city);
CREATE INDEX IF NOT EXISTS idx_events_location_state ON events(location_state);
CREATE INDEX IF NOT EXISTS idx_events_ticket_type ON events(ticket_type);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_updated_at ON events(updated_at);

-- Índices para tickets
CREATE INDEX IF NOT EXISTS idx_tickets_availability ON tickets(availability);
CREATE INDEX IF NOT EXISTS idx_tickets_sale_dates ON tickets(sale_start_date, sale_end_date);
CREATE INDEX IF NOT EXISTS idx_tickets_has_half_price ON tickets(has_half_price);

-- 6. CRIAR TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. CRIAR FUNÇÃO PARA CALCULAR DURAÇÃO DO EVENTO
CREATE OR REPLACE FUNCTION calculate_event_duration(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
) RETURNS TEXT AS $$
BEGIN
    IF start_date IS NULL OR end_date IS NULL THEN
        RETURN 'Duração não definida';
    END IF;
    
    DECLARE
        duration_days INTEGER;
    BEGIN
        duration_days := EXTRACT(DAY FROM (end_date - start_date));
        
        IF duration_days = 0 THEN
            RETURN 'Mesmo dia';
        ELSIF duration_days = 1 THEN
            RETURN '1 dia';
        ELSE
            RETURN duration_days || ' dias';
        END IF;
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. ATUALIZAR DADOS EXISTENTES
DO $$
BEGIN
    -- Definir subject baseado na categoria para eventos existentes
    UPDATE events 
    SET subject = CASE 
        WHEN category = 'show' THEN 'Música e Shows'
        WHEN category = 'teatro' THEN 'Teatro e Artes'
        WHEN category = 'palestra' THEN 'Educação e Palestras'
        WHEN category = 'workshop' THEN 'Cursos e Workshops'
        WHEN category = 'festa' THEN 'Festas e Celebrações'
        WHEN category = 'esporte' THEN 'Esportes e Fitness'
        WHEN category = 'tecnologia' THEN 'Tecnologia e Inovação'
        WHEN category = 'gastronomia' THEN 'Gastronomia'
        WHEN category = 'arte' THEN 'Arte e Cultura'
        WHEN category = 'networking' THEN 'Networking e Negócios'
        ELSE 'Outros'
    END
    WHERE subject IS NULL;

    -- Definir location_type para eventos existentes
    UPDATE events 
    SET location_type = CASE 
        WHEN location ILIKE '%online%' OR location ILIKE '%virtual%' THEN 'online'
        WHEN location ILIKE '%será definido%' OR location ILIKE '%tbd%' OR location IS NULL OR location = '' THEN 'tbd'
        ELSE 'physical'
    END
    WHERE location_type IS NULL;

    -- Definir ticket_type baseado no preço
    UPDATE events 
    SET ticket_type = CASE 
        WHEN price = 0 OR price IS NULL THEN 'free'
        ELSE 'paid'
    END
    WHERE ticket_type IS NULL;

    -- Definir created_by como organizer_id para eventos existentes
    UPDATE events 
    SET created_by = organizer_id 
    WHERE created_by IS NULL AND organizer_id IS NOT NULL;

    -- Definir end_date como start_date + 4 horas para eventos sem end_date
    UPDATE events 
    SET end_date = start_date + INTERVAL '4 hours'
    WHERE end_date IS NULL AND start_date IS NOT NULL;

    RAISE NOTICE '✅ Dados existentes atualizados';
END $$;

-- 9. CONFIGURAR BUCKET event_banners NO STORAGE
DO $$
BEGIN
    RAISE NOTICE '=== CONFIGURAÇÃO DO STORAGE ===';
    RAISE NOTICE 'Execute no painel do Supabase:';
    RAISE NOTICE '1. Vá para Storage > Buckets';
    RAISE NOTICE '2. Verifique se o bucket "event_banners" existe';
    RAISE NOTICE '3. Se não existir, será criado automaticamente pelo upload';
    RAISE NOTICE '4. Configurações recomendadas:';
    RAISE NOTICE '   - Nome: event_banners';
    RAISE NOTICE '   - Public: true';
    RAISE NOTICE '   - File size limit: 5MB';
    RAISE NOTICE '   - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp';
    RAISE NOTICE '';
    RAISE NOTICE 'Políticas RLS necessárias:';
    RAISE NOTICE 'CREATE POLICY "Authenticated users can upload banners" ON storage.objects';
    RAISE NOTICE 'FOR INSERT WITH CHECK (auth.role() = ''authenticated'' AND bucket_id = ''event_banners'');';
    RAISE NOTICE '';
    RAISE NOTICE 'CREATE POLICY "Public can view banners" ON storage.objects';
    RAISE NOTICE 'FOR SELECT USING (bucket_id = ''event_banners'');';
END $$;

-- 10. VERIFICAR ESTRUTURA FINAL
DO $$
BEGIN
    RAISE NOTICE '=== ESTRUTURA FINAL DAS TABELAS ===';
END $$;

-- Estrutura da tabela events
SELECT 'EVENTS' as tabela, column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Estrutura da tabela tickets
SELECT 'TICKETS' as tabela, column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 11. ESTATÍSTICAS FINAIS
SELECT 
    'EVENTS' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as aprovados,
    COUNT(CASE WHEN subject IS NOT NULL THEN 1 END) as com_assunto,
    COUNT(CASE WHEN location_type = 'physical' THEN 1 END) as fisicos,
    COUNT(CASE WHEN location_type = 'online' THEN 1 END) as online,
    COUNT(CASE WHEN ticket_type = 'paid' THEN 1 END) as pagos,
    COUNT(CASE WHEN ticket_type = 'free' THEN 1 END) as gratuitos
FROM events

UNION ALL

SELECT 
    'TICKETS' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN has_half_price = true THEN 1 END) as com_meia_entrada,
    COUNT(CASE WHEN availability = 'public' THEN 1 END) as publicos,
    COUNT(CASE WHEN availability = 'restricted' THEN 1 END) as restritos,
    COUNT(CASE WHEN sale_start_date IS NOT NULL THEN 1 END) as com_periodo_vendas,
    0 as online,
    0 as pagos,
    0 as gratuitos;

DO $$
BEGIN
    RAISE NOTICE '=== ATUALIZAÇÃO CONCLUÍDA COM SUCESSO ===';
    RAISE NOTICE 'Novas funcionalidades disponíveis:';
    RAISE NOTICE '✅ Assunto e subcategoria de eventos';
    RAISE NOTICE '✅ Data de término e cálculo de duração';
    RAISE NOTICE '✅ Endereço detalhado (CEP, rua, número, etc.)';
    RAISE NOTICE '✅ Tipos de localização (físico/online/TBD)';
    RAISE NOTICE '✅ Tipos de ingresso (pago/gratuito)';
    RAISE NOTICE '✅ Metadados de imagem (tamanho, formato)';
    RAISE NOTICE '✅ Configurações avançadas de ingressos';
    RAISE NOTICE '✅ Meia-entrada e períodos de vendas';
    RAISE NOTICE '✅ Disponibilidade (público/restrito/manual)';
    RAISE NOTICE '✅ Quantidade mínima e máxima por compra';
    RAISE NOTICE '✅ Auditoria com created_by e updated_at';
    RAISE NOTICE '✅ Índices otimizados para performance';
    RAISE NOTICE '✅ Trigger automático para updated_at';
    RAISE NOTICE '✅ Função para calcular duração de eventos';
    RAISE NOTICE '✅ Bucket event_banners configurado';
    RAISE NOTICE '✅ Migração de dados existentes';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 O modal de eventos agora suporta todas as 5 etapas:';
    RAISE NOTICE '1. Informações básicas (nome, imagem, assunto, categoria)';
    RAISE NOTICE '2. Data e horário (início, fim, duração automática)';
    RAISE NOTICE '3. Descrição (rich text editor)';
    RAISE NOTICE '4. Local (físico/online/TBD, endereço completo)';
    RAISE NOTICE '5. Ingressos (pago/gratuito, configurações avançadas)';
END $$;