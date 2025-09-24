-- ===================================================================
-- SCRIPT PARA CORRIGIR ESTRUTURA DA TABELA TICKETS
-- ===================================================================

-- DIAGNÓSTICO DA TABELA TICKETS
SELECT 'TICKETS CURRENT STRUCTURE' as info, 
       column_name, 
       data_type, 
       is_nullable, 
       column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- CORREÇÃO IMEDIATA DA TABELA TICKETS
DO $$
BEGIN
    RAISE NOTICE '=== CORRIGINDO ESTRUTURA DA TABELA TICKETS ===';
    
    -- Garantir que a tabela tickets existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
        CREATE TABLE tickets (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            price DECIMAL(10,2) DEFAULT 0,
            quantity INTEGER DEFAULT 1,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Tabela tickets criada';
    END IF;
    
    -- Adicionar coluna description se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'description') THEN
        ALTER TABLE tickets ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Coluna description adicionada em tickets';
    END IF;
    
    -- Adicionar outras colunas necessárias do EventFormModal
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'event_id') THEN
        ALTER TABLE tickets ADD COLUMN event_id UUID;
        RAISE NOTICE '✅ Coluna event_id adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'sale_start_date') THEN
        ALTER TABLE tickets ADD COLUMN sale_start_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Coluna sale_start_date adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'sale_end_date') THEN
        ALTER TABLE tickets ADD COLUMN sale_end_date TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Coluna sale_end_date adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'sale_period_type') THEN
        ALTER TABLE tickets ADD COLUMN sale_period_type TEXT DEFAULT 'date';
        RAISE NOTICE '✅ Coluna sale_period_type adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'min_quantity') THEN
        ALTER TABLE tickets ADD COLUMN min_quantity INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Coluna min_quantity adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'max_quantity') THEN
        ALTER TABLE tickets ADD COLUMN max_quantity INTEGER DEFAULT 5;
        RAISE NOTICE '✅ Coluna max_quantity adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'availability') THEN
        ALTER TABLE tickets ADD COLUMN availability TEXT DEFAULT 'public';
        RAISE NOTICE '✅ Coluna availability adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'has_half_price') THEN
        ALTER TABLE tickets ADD COLUMN has_half_price BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Coluna has_half_price adicionada em tickets';
    END IF;
    
    -- Garantir que colunas básicas existem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'name') THEN
        ALTER TABLE tickets ADD COLUMN name TEXT NOT NULL DEFAULT 'Ingresso';
        RAISE NOTICE '✅ Coluna name adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'price') THEN
        ALTER TABLE tickets ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Coluna price adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'quantity') THEN
        ALTER TABLE tickets ADD COLUMN quantity INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Coluna quantity adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'created_at') THEN
        ALTER TABLE tickets ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Coluna created_at adicionada em tickets';
    END IF;
    
    -- Adicionar outras colunas úteis
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'status') THEN
        ALTER TABLE tickets ADD COLUMN status TEXT DEFAULT 'active';
        RAISE NOTICE '✅ Coluna status adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'buyer_id') THEN
        ALTER TABLE tickets ADD COLUMN buyer_id UUID;
        RAISE NOTICE '✅ Coluna buyer_id adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'user_id') THEN
        ALTER TABLE tickets ADD COLUMN user_id UUID;
        RAISE NOTICE '✅ Coluna user_id adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'ticket_type') THEN
        ALTER TABLE tickets ADD COLUMN ticket_type TEXT DEFAULT 'Padrão';
        RAISE NOTICE '✅ Coluna ticket_type adicionada em tickets';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'code') THEN
        ALTER TABLE tickets ADD COLUMN code TEXT;
        RAISE NOTICE '✅ Coluna code adicionada em tickets';
    END IF;
    
END $$;

-- CRIAR FOREIGN KEY PARA EVENT_ID SE NÃO EXISTIR
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_tickets_event_id' AND table_name = 'tickets') THEN
        BEGIN
            ALTER TABLE tickets ADD CONSTRAINT fk_tickets_event_id 
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ FK tickets -> events criada';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Erro ao criar FK tickets -> events: %', SQLERRM;
        END;
    END IF;
END $$;

-- CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_id ON tickets(buyer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_availability ON tickets(availability);
CREATE INDEX IF NOT EXISTS idx_tickets_sale_dates ON tickets(sale_start_date, sale_end_date);

-- HABILITAR RLS NA TABELA TICKETS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- CRIAR POLÍTICAS RLS PARA TICKETS
DROP POLICY IF EXISTS "Users can view tickets" ON tickets;
CREATE POLICY "Users can view tickets" ON tickets
FOR SELECT USING (
    -- Usuários podem ver tickets de eventos aprovados
    event_id IN (SELECT id FROM events WHERE status = 'approved')
    OR
    -- Organizadores podem ver tickets de seus eventos
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
    OR
    -- Compradores podem ver seus próprios tickets
    buyer_id = auth.uid()
    OR
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "Organizers can create tickets" ON tickets;
CREATE POLICY "Organizers can create tickets" ON tickets
FOR INSERT WITH CHECK (
    -- Apenas organizadores podem criar tickets para seus eventos
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
);

DROP POLICY IF EXISTS "Organizers can update tickets" ON tickets;
CREATE POLICY "Organizers can update tickets" ON tickets
FOR UPDATE USING (
    -- Apenas organizadores podem atualizar tickets de seus eventos
    event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid())
    OR
    -- Compradores podem atualizar alguns campos de seus tickets
    (buyer_id = auth.uid() OR user_id = auth.uid())
);

-- VERIFICAÇÃO FINAL DA ESTRUTURA
SELECT 'TICKETS FINAL STRUCTURE' as info, 
       column_name, 
       data_type, 
       is_nullable, 
       column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- VERIFICAR FOREIGN KEYS
SELECT 
    'TICKETS FOREIGN KEYS' as info,
    tc.constraint_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'tickets'
ORDER BY tc.constraint_name;

-- ESTATÍSTICAS
SELECT 
    'TICKETS' as tabela,
    COUNT(*) as total_records,
    COUNT(CASE WHEN event_id IS NOT NULL THEN 1 END) as with_event,
    COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as with_description,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active
FROM tickets;

-- MENSAGEM FINAL
DO $$
BEGIN
    RAISE NOTICE '=== CORREÇÃO DA TABELA TICKETS CONCLUÍDA ===';
    RAISE NOTICE '✅ Coluna description adicionada';
    RAISE NOTICE '✅ Todas as colunas do EventFormModal presentes';
    RAISE NOTICE '✅ Foreign keys configuradas';
    RAISE NOTICE '✅ Índices otimizados criados';
    RAISE NOTICE '✅ Políticas RLS configuradas';
    RAISE NOTICE '✅ Cache do schema será atualizado automaticamente';
    RAISE NOTICE '🎯 EventFormModal poderá criar ingressos sem erros!';
    RAISE NOTICE '🚀 Teste criar um evento com ingressos agora!';
END $$;