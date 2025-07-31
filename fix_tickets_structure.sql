-- ===================================================================
-- SCRIPT PARA ATUALIZAR ESTRUTURA DA TABELA TICKETS
-- ===================================================================

-- 1. VERIFICAR ESTRUTURA ATUAL DA TABELA TICKETS
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO ESTRUTURA ATUAL DA TABELA TICKETS ===';
END $$;

SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ADICIONAR NOVAS COLUNAS PARA TICKETS SE NÃO EXISTIREM
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
END $$;

-- 3. GARANTIR TIPOS DE DADOS CORRETOS
DO $$
BEGIN
    -- Expandir coluna description em tickets
    BEGIN
        ALTER TABLE tickets ALTER COLUMN description TYPE TEXT;
        RAISE NOTICE '✅ Coluna description em tickets definida como TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Erro ao alterar description em tickets: %', SQLERRM;
    END;

    -- Garantir que name seja TEXT
    BEGIN
        ALTER TABLE tickets ALTER COLUMN name TYPE TEXT;
        RAISE NOTICE '✅ Coluna name em tickets definida como TEXT';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Erro ao alterar name em tickets: %', SQLERRM;
    END;
END $$;

-- 4. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tickets_availability ON tickets(availability);
CREATE INDEX IF NOT EXISTS idx_tickets_sale_dates ON tickets(sale_start_date, sale_end_date);
CREATE INDEX IF NOT EXISTS idx_tickets_has_half_price ON tickets(has_half_price);
CREATE INDEX IF NOT EXISTS idx_tickets_sale_period_type ON tickets(sale_period_type);

-- 5. ATUALIZAR DADOS EXISTENTES
DO $$
BEGIN
    -- Definir valores padrão para tickets existentes
    UPDATE tickets 
    SET 
        has_half_price = FALSE,
        sale_period_type = 'date',
        availability = 'public',
        min_quantity = 1,
        max_quantity = 5
    WHERE 
        has_half_price IS NULL 
        OR sale_period_type IS NULL 
        OR availability IS NULL 
        OR min_quantity IS NULL 
        OR max_quantity IS NULL;

    RAISE NOTICE '✅ Dados existentes de tickets atualizados';
END $$;

-- 6. VERIFICAR ESTRUTURA FINAL DA TABELA TICKETS
DO $$
BEGIN
    RAISE NOTICE '=== ESTRUTURA FINAL DA TABELA TICKETS ===';
END $$;

SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. ESTATÍSTICAS FINAIS
SELECT 
    COUNT(*) as total_tickets,
    COUNT(CASE WHEN has_half_price = true THEN 1 END) as with_half_price,
    COUNT(CASE WHEN availability = 'public' THEN 1 END) as public_tickets,
    COUNT(CASE WHEN availability = 'restricted' THEN 1 END) as restricted_tickets,
    COUNT(CASE WHEN sale_start_date IS NOT NULL THEN 1 END) as with_sale_period,
    COUNT(CASE WHEN sale_period_type = 'date' THEN 1 END) as by_date,
    COUNT(CASE WHEN sale_period_type = 'batch' THEN 1 END) as by_batch
FROM tickets;

DO $$
BEGIN
    RAISE NOTICE '=== ATUALIZAÇÃO DA TABELA TICKETS CONCLUÍDA ===';
    RAISE NOTICE 'Novas funcionalidades de tickets disponíveis:';
    RAISE NOTICE '✅ Meia-entrada (has_half_price)';
    RAISE NOTICE '✅ Períodos de vendas (sale_start_date, sale_end_date)';
    RAISE NOTICE '✅ Tipos de período (por data ou lote)';
    RAISE NOTICE '✅ Disponibilidade (público/restrito/manual)';
    RAISE NOTICE '✅ Quantidade mínima e máxima por compra';
    RAISE NOTICE '✅ Índices otimizados para performance';
    RAISE NOTICE '✅ Dados existentes preservados e atualizados';
END $$;