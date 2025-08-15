-- ===================================================================
-- SCRIPT PARA VERIFICAR E CORRIGIR ESTRUTURA DA TABELA EVENTS
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

-- 2. VERIFICAR SE COLUNAS DE IMAGEM EXISTEM
DO $$
DECLARE
    has_image BOOLEAN := FALSE;
    has_banner_url BOOLEAN := FALSE;
    has_image_url BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== VERIFICANDO COLUNAS DE IMAGEM ===';
    
    -- Verificar se existe coluna 'image'
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'image'
    ) INTO has_image;
    
    -- Verificar se existe coluna 'banner_url'
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'banner_url'
    ) INTO has_banner_url;
    
    -- Verificar se existe coluna 'image_url'
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'image_url'
    ) INTO has_image_url;
    
    RAISE NOTICE 'Coluna image existe: %', has_image;
    RAISE NOTICE 'Coluna banner_url existe: %', has_banner_url;
    RAISE NOTICE 'Coluna image_url existe: %', has_image_url;
    
    -- Criar coluna image se não existir
    IF NOT has_image THEN
        -- Se banner_url existe, renomear para image
        IF has_banner_url THEN
            ALTER TABLE events RENAME COLUMN banner_url TO image;
            RAISE NOTICE '✅ Coluna banner_url renomeada para image';
        -- Se image_url existe, renomear para image
        ELSIF has_image_url THEN
            ALTER TABLE events RENAME COLUMN image_url TO image;
            RAISE NOTICE '✅ Coluna image_url renomeada para image';
        -- Se nenhuma existe, criar nova
        ELSE
            ALTER TABLE events ADD COLUMN image TEXT;
            RAISE NOTICE '✅ Coluna image criada';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Coluna image já existe';
    END IF;
END $$;

-- 3. GARANTIR QUE A COLUNA IMAGE SEJA TEXT
DO $$
BEGIN
    ALTER TABLE events ALTER COLUMN image TYPE TEXT;
    RAISE NOTICE '✅ Coluna image definida como TEXT';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Erro ao alterar tipo da coluna image: %', SQLERRM;
END $$;

-- 4. ADICIONAR OUTRAS COLUNAS NECESSÁRIAS SE NÃO EXISTIREM
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
        WHERE table_name = 'events' AND column_name = 'location_name'
    ) THEN
        ALTER TABLE events ADD COLUMN location_name TEXT;
        RAISE NOTICE '✅ Coluna location_name adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_name já existe';
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
        WHERE table_name = 'events' AND column_name = 'location_neighborhood'
    ) THEN
        ALTER TABLE events ADD COLUMN location_neighborhood TEXT;
        RAISE NOTICE '✅ Coluna location_neighborhood adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_neighborhood já existe';
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
        WHERE table_name = 'events' AND column_name = 'location_complement'
    ) THEN
        ALTER TABLE events ADD COLUMN location_complement TEXT;
        RAISE NOTICE '✅ Coluna location_complement adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_complement já existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'location_search'
    ) THEN
        ALTER TABLE events ADD COLUMN location_search TEXT;
        RAISE NOTICE '✅ Coluna location_search adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_search já existe';
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

-- 5. GARANTIR TIPOS DE DADOS CORRETOS
DO $$
BEGIN
    -- Garantir que description seja TEXT
    BEGIN
        ALTER TABLE events ALTER COLUMN description TYPE TEXT;
        RAISE NOTICE '✅ Coluna description definida como TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Erro ao alterar description: %', SQLERRM;
    END;

    -- Garantir que location seja TEXT
    BEGIN
        ALTER TABLE events ALTER COLUMN location TYPE TEXT;
        RAISE NOTICE '✅ Coluna location definida como TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Erro ao alterar location: %', SQLERRM;
    END;
END $$;

-- 6. ATUALIZAR DADOS EXISTENTES
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

-- 7. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_events_subject ON events(subject);
CREATE INDEX IF NOT EXISTS idx_events_subcategory ON events(subcategory);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_location_type ON events(location_type);
CREATE INDEX IF NOT EXISTS idx_events_location_city ON events(location_city);
CREATE INDEX IF NOT EXISTS idx_events_location_state ON events(location_state);
CREATE INDEX IF NOT EXISTS idx_events_ticket_type ON events(ticket_type);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_updated_at ON events(updated_at);

-- 8. CRIAR TRIGGER PARA UPDATED_AT
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

-- 9. VERIFICAR ESTRUTURA FINAL
DO $$
BEGIN
    RAISE NOTICE '=== ESTRUTURA FINAL DA TABELA EVENTS ===';
END $$;

SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 10. ESTATÍSTICAS FINAIS
SELECT 
    COUNT(*) as total_events,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_events,
    COUNT(CASE WHEN subject IS NOT NULL THEN 1 END) as with_subject,
    COUNT(CASE WHEN location_type = 'physical' THEN 1 END) as physical_events,
    COUNT(CASE WHEN location_type = 'online' THEN 1 END) as online_events,
    COUNT(CASE WHEN ticket_type = 'paid' THEN 1 END) as paid_events,
    COUNT(CASE WHEN ticket_type = 'free' THEN 1 END) as free_events,
    COUNT(CASE WHEN image IS NOT NULL AND image != '' THEN 1 END) as with_image
FROM events;

DO $$
BEGIN
    RAISE NOTICE '=== CORREÇÃO DA ESTRUTURA EVENTS CONCLUÍDA ===';
    RAISE NOTICE 'Principais correções aplicadas:';
    RAISE NOTICE '✅ Coluna image criada/renomeada corretamente';
    RAISE NOTICE '✅ Todas as novas colunas do modal adicionadas';
    RAISE NOTICE '✅ Tipos de dados corrigidos (TEXT)';
    RAISE NOTICE '✅ Dados existentes migrados automaticamente';
    RAISE NOTICE '✅ Índices criados para performance';
    RAISE NOTICE '✅ Trigger para updated_at configurado';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Agora o sistema está pronto para:';
    RAISE NOTICE '1. Upload de imagens no bucket event_banners';
    RAISE NOTICE '2. Modal de eventos com 5 etapas completas';
    RAISE NOTICE '3. EventPage e CheckoutPage com informações detalhadas';
    RAISE NOTICE '4. Compatibilidade total com eventos existentes';
END $$;