-- ===================================================================
-- SCRIPT PARA ATUALIZAR TABELA DE EVENTOS
-- ===================================================================

-- 1. VERIFICAR ESTRUTURA ATUAL DA TABELA EVENTS
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO ESTRUTURA ATUAL DA TABELA EVENTS ===';
END $$;

SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_name = 'events' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ADICIONAR COLUNAS SE NÃO EXISTIREM
DO $$
BEGIN
    -- Adicionar coluna subcategory se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'subcategory'
    ) THEN
        ALTER TABLE events ADD COLUMN subcategory TEXT;
        RAISE NOTICE '✅ Coluna subcategory adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna subcategory já existe';
    END IF;

    -- Adicionar coluna end_date se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'end_date'
    ) THEN
        ALTER TABLE events ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Coluna end_date adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna end_date já existe';
    END IF;

    -- Adicionar coluna address se não existir (endereço completo)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'address'
    ) THEN
        ALTER TABLE events ADD COLUMN address TEXT;
        RAISE NOTICE '✅ Coluna address adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna address já existe';
    END IF;

    -- Adicionar coluna location_type se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'location_type'
    ) THEN
        ALTER TABLE events ADD COLUMN location_type TEXT DEFAULT 'physical' CHECK (location_type IN ('tbd', 'physical', 'online'));
        RAISE NOTICE '✅ Coluna location_type adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna location_type já existe';
    END IF;

    -- Adicionar coluna image_size se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'image_size'
    ) THEN
        ALTER TABLE events ADD COLUMN image_size INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Coluna image_size adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna image_size já existe';
    END IF;

    -- Adicionar coluna image_format se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'image_format'
    ) THEN
        ALTER TABLE events ADD COLUMN image_format TEXT;
        RAISE NOTICE '✅ Coluna image_format adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna image_format já existe';
    END IF;

    -- Adicionar coluna created_by se não existir (para auditoria)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE events ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Coluna created_by adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna created_by já existe';
    END IF;

    -- Adicionar coluna updated_at se não existir
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

-- 3. ATUALIZAR TIPOS DE DADOS SE NECESSÁRIO
DO $$
BEGIN
    -- Aumentar limite da coluna description se for muito pequeno
    DECLARE
        desc_length INTEGER;
    BEGIN
        SELECT character_maximum_length INTO desc_length
        FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'description';
        
        IF desc_length IS NOT NULL AND desc_length < 5000 THEN
            ALTER TABLE events ALTER COLUMN description TYPE TEXT;
            RAISE NOTICE '✅ Coluna description expandida para TEXT';
        ELSE
            RAISE NOTICE '⚠️ Coluna description já é TEXT ou suficientemente grande';
        END IF;
    END;

    -- Garantir que image seja TEXT para URLs longas
    ALTER TABLE events ALTER COLUMN image TYPE TEXT;
    RAISE NOTICE '✅ Coluna image definida como TEXT';
END $$;

-- 4. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_events_organizer_status ON events(organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_location_type ON events(location_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- 5. CRIAR TRIGGER PARA UPDATED_AT
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

-- 6. ATUALIZAR POLÍTICAS RLS PARA NOVAS COLUNAS
DROP POLICY IF EXISTS "Users can view published events" ON events;
CREATE POLICY "Users can view published events" ON events
FOR SELECT USING (status = 'approved' OR organizer_id = auth.uid());

DROP POLICY IF EXISTS "Organizers can manage their events" ON events;
CREATE POLICY "Organizers can manage their events" ON events
FOR ALL USING (organizer_id = auth.uid());

-- 7. CRIAR FUNÇÃO PARA LIMPAR IMAGENS ÓRFÃS
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Esta função pode ser executada periodicamente para limpar imagens não utilizadas
    -- Por enquanto, apenas retorna 0
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ATUALIZAR DADOS EXISTENTES
DO $$
BEGIN
    -- Definir location_type para eventos existentes baseado no campo location
    UPDATE events 
    SET location_type = CASE 
        WHEN location ILIKE '%online%' OR location ILIKE '%virtual%' THEN 'online'
        WHEN location ILIKE '%será definido%' OR location ILIKE '%tbd%' THEN 'tbd'
        ELSE 'physical'
    END
    WHERE location_type IS NULL;

    -- Definir created_by como organizer_id para eventos existentes
    UPDATE events 
    SET created_by = organizer_id 
    WHERE created_by IS NULL AND organizer_id IS NOT NULL;

    RAISE NOTICE '✅ Dados existentes atualizados';
END $$;

-- 9. VERIFICAR BUCKET DE IMAGENS NO STORAGE
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO CONFIGURAÇÃO DO STORAGE ===';
    RAISE NOTICE 'Execute no painel do Supabase:';
    RAISE NOTICE '1. Vá para Storage > Buckets';
    RAISE NOTICE '2. Verifique se o bucket "event-images" existe';
    RAISE NOTICE '3. Se não existir, será criado automaticamente pelo upload';
    RAISE NOTICE '4. Configurações recomendadas:';
    RAISE NOTICE '   - Public: true';
    RAISE NOTICE '   - File size limit: 5MB';
    RAISE NOTICE '   - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp';
END $$;

-- 10. VERIFICAR ESTRUTURA FINAL
DO $$
BEGIN
    RAISE NOTICE '=== ESTRUTURA FINAL DA TABELA EVENTS ===';
END $$;

SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 11. ESTATÍSTICAS DA TABELA
SELECT 
    COUNT(*) as total_events,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_events,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_events,
    COUNT(CASE WHEN image IS NOT NULL AND image != '' THEN 1 END) as events_with_image,
    COUNT(CASE WHEN location_type = 'physical' THEN 1 END) as physical_events,
    COUNT(CASE WHEN location_type = 'online' THEN 1 END) as online_events,
    COUNT(CASE WHEN location_type = 'tbd' THEN 1 END) as tbd_events
FROM events;

DO $$
BEGIN
    RAISE NOTICE '=== ATUALIZAÇÃO DA TABELA EVENTS CONCLUÍDA ===';
    RAISE NOTICE 'Novas funcionalidades disponíveis:';
    RAISE NOTICE '✅ Suporte a imagens até 5MB';
    RAISE NOTICE '✅ Subcategorias de eventos';
    RAISE NOTICE '✅ Data de término dos eventos';
    RAISE NOTICE '✅ Endereço completo separado';
    RAISE NOTICE '✅ Tipos de localização (físico/online/TBD)';
    RAISE NOTICE '✅ Metadados de imagem';
    RAISE NOTICE '✅ Auditoria com created_by e updated_at';
    RAISE NOTICE '✅ Índices para melhor performance';
    RAISE NOTICE '✅ Trigger automático para updated_at';
    RAISE NOTICE '✅ Políticas RLS atualizadas';
END $$;

-- Atualização da tabela events para adicionar campos de classificação, importância e atrações
-- Execute este SQL no seu banco de dados Supabase

-- IMPORTANTE: Primeiro, vamos verificar se existe uma view que depende da tabela events
-- Se existir, precisamos recriá-la após as alterações

-- 1. Verificar se existe a view events_with_ticket_types
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE view_name = 'events_with_ticket_types') THEN
        RAISE NOTICE '⚠️ View events_with_ticket_types encontrada. Será recriada após as alterações.';
        DROP VIEW IF EXISTS events_with_ticket_types CASCADE;
    END IF;
END $$;

-- 2. Adicionar campo classification (classificação etária)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS classification VARCHAR(10) DEFAULT NULL;

-- 3. Adicionar campo important_info (informações importantes do evento)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS important_info TEXT[] DEFAULT NULL;

-- 4. Adicionar campo attractions (atrações do evento)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS attractions TEXT[] DEFAULT NULL;

-- 5. Adicionar comentários para documentação
COMMENT ON COLUMN events.classification IS 'Classificação etária do evento (livre, 10, 12, 14, 16, 18)';
COMMENT ON COLUMN events.important_info IS 'Array de informações importantes sobre o evento';
COMMENT ON COLUMN events.attractions IS 'Array de atrações/artistas do evento';

-- 6. Criar índices para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_events_classification ON events(classification);
CREATE INDEX IF NOT EXISTS idx_events_important_info ON events USING GIN(important_info);
CREATE INDEX IF NOT EXISTS idx_events_attractions ON events USING GIN(attractions);

-- 7. Recriar a view events_with_ticket_types se ela existia
-- (Esta é uma view comum em sistemas de eventos)
CREATE OR REPLACE VIEW events_with_ticket_types AS
SELECT 
    e.*,
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'id', ett.id,
                'title', ett.title,
                'name', ett.name,
                'price', ett.price,
                'price_masculine', ett.price_masculine,
                'price_feminine', ett.price_feminine,
                'area', ett.area,
                'quantity', ett.quantity,
                'available_quantity', ett.available_quantity,
                'description', ett.description,
                'status', ett.status
            )
        ) FROM event_ticket_types ett 
        WHERE ett.event_id = e.id AND ett.status = 'active'), 
        '[]'::json
    ) as ticket_types
FROM events e;

-- 8. Atualizar eventos existentes com valores padrão (opcional)
-- UPDATE events SET classification = 'livre' WHERE classification IS NULL;
-- UPDATE events SET important_info = '{}' WHERE important_info IS NULL;
-- UPDATE events SET attractions = '{}' WHERE attractions IS NULL;

-- 9. Verificar se as colunas foram criadas
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('classification', 'important_info', 'attractions')
ORDER BY column_name;

-- 10. Verificar se a view foi recriada
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'events_with_ticket_types';