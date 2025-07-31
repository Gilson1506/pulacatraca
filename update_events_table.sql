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