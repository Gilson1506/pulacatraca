-- =====================================================
-- CORREÇÃO COMPLETA DA TABELA EVENTS
-- =====================================================

-- 1. VERIFICAR CONSTRAINTS ATUAIS
SELECT 
    'CONSTRAINTS ATUAIS' as info,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN is_nullable = 'NO' THEN 'OBRIGATÓRIO'
        ELSE 'OPCIONAL'
    END as status
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. CORRIGIR end_date PARA PERMITIR NULL
ALTER TABLE public.events 
ALTER COLUMN end_date DROP NOT NULL;

-- 3. ADICIONAR VALORES PADRÃO PARA CAMPOS OBRIGATÓRIOS
ALTER TABLE public.events 
ALTER COLUMN end_date SET DEFAULT NULL;

-- 4. VERIFICAR SE HÁ DADOS EXISTENTES COM PROBLEMAS
SELECT 
    'DADOS EXISTENTES' as info,
    COUNT(*) as total_events,
    COUNT(CASE WHEN end_date IS NULL THEN 1 END) as sem_data_fim,
    COUNT(CASE WHEN title IS NULL THEN 1 END) as sem_titulo,
    COUNT(CASE WHEN description IS NULL THEN 1 END) as sem_descricao,
    COUNT(CASE WHEN location IS NULL THEN 1 END) as sem_local,
    COUNT(CASE WHEN price IS NULL THEN 1 END) as sem_preco,
    COUNT(CASE WHEN category IS NULL THEN 1 END) as sem_categoria
FROM events;

-- 5. CORRIGIR DADOS EXISTENTES COM CAMPOS NULL
UPDATE events 
SET 
    title = COALESCE(title, 'Evento sem título'),
    description = COALESCE(description, 'Descrição não disponível'),
    location = COALESCE(location, 'Local não informado'),
    price = COALESCE(price, 0),
    category = COALESCE(category, 'evento'),
    status = COALESCE(status, 'pending'),
    end_date = COALESCE(end_date, start_date + INTERVAL '2 hours')
WHERE 
    title IS NULL 
    OR description IS NULL 
    OR location IS NULL 
    OR price IS NULL 
    OR category IS NULL 
    OR status IS NULL 
    OR end_date IS NULL;

-- 6. ADICIONAR CAMPOS QUE PODEM ESTAR FALTANDO
DO $$
BEGIN
    -- Adicionar campo image se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'image') THEN
        ALTER TABLE public.events ADD COLUMN image text;
    END IF;
    
    -- Adicionar campo subject se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'subject') THEN
        ALTER TABLE public.events ADD COLUMN subject text;
    END IF;
    
    -- Adicionar campo subcategory se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'subcategory') THEN
        ALTER TABLE public.events ADD COLUMN subcategory text;
    END IF;
    
    -- Adicionar campo location_type se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location_type') THEN
        ALTER TABLE public.events ADD COLUMN location_type text DEFAULT 'physical';
    END IF;
    
    -- Adicionar campo location_name se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location_name') THEN
        ALTER TABLE public.events ADD COLUMN location_name text;
    END IF;
    
    -- Adicionar campo location_city se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location_city') THEN
        ALTER TABLE public.events ADD COLUMN location_city text;
    END IF;
    
    -- Adicionar campo location_state se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'location_state') THEN
        ALTER TABLE public.events ADD COLUMN location_state text;
    END IF;
    
    -- Adicionar campo ticket_type se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'ticket_type') THEN
        ALTER TABLE public.events ADD COLUMN ticket_type text DEFAULT 'paid';
    END IF;
    
    -- Adicionar campo classification se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'classification') THEN
        ALTER TABLE public.events ADD COLUMN classification character varying(10) DEFAULT 'Livre';
    END IF;
    
    -- Adicionar campo important_info se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'important_info') THEN
        ALTER TABLE public.events ADD COLUMN important_info text[] DEFAULT ARRAY['Chegue com antecedência'];
    END IF;
    
    -- Adicionar campo attractions se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'attractions') THEN
        ALTER TABLE public.events ADD COLUMN attractions text[] DEFAULT ARRAY['Programação especial'];
    END IF;
    
    -- Adicionar campo tags se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'tags') THEN
        ALTER TABLE public.events ADD COLUMN tags text[];
    END IF;
    
    -- Adicionar campo banner_metadata se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'banner_metadata') THEN
        ALTER TABLE public.events ADD COLUMN banner_metadata jsonb DEFAULT '{}';
    END IF;
    
    -- Adicionar campo banner_alt_text se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'banner_alt_text') THEN
        ALTER TABLE public.events ADD COLUMN banner_alt_text text;
    END IF;
    
    -- Adicionar campo max_tickets_per_user se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'max_tickets_per_user') THEN
        ALTER TABLE public.events ADD COLUMN max_tickets_per_user integer DEFAULT 5;
    END IF;
    
    -- Adicionar campo min_tickets_per_user se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'min_tickets_per_user') THEN
        ALTER TABLE public.events ADD COLUMN min_tickets_per_user integer DEFAULT 1;
    END IF;
    
    -- Adicionar campo sold_tickets se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'sold_tickets') THEN
        ALTER TABLE public.events ADD COLUMN sold_tickets integer DEFAULT 0;
    END IF;
END $$;

-- 7. ATUALIZAR CAMPOS ADICIONAIS COM VALORES PADRÃO
UPDATE events 
SET 
    subject = COALESCE(subject, category),
    subcategory = COALESCE(subcategory, category),
    location_name = COALESCE(location_name, location),
    location_city = COALESCE(location_city, 'Cidade não informada'),
    location_state = COALESCE(location_state, 'Estado não informado'),
    ticket_type = COALESCE(ticket_type, 'paid'),
    classification = COALESCE(classification, 'Livre'),
    important_info = COALESCE(important_info, ARRAY['Chegue com antecedência']),
    attractions = COALESCE(attractions, ARRAY['Programação especial']),
    tags = COALESCE(tags, ARRAY[category]),
    banner_metadata = COALESCE(banner_metadata, '{}'),
    banner_alt_text = COALESCE(banner_alt_text, title),
    max_tickets_per_user = COALESCE(max_tickets_per_user, 5),
    min_tickets_per_user = COALESCE(min_tickets_per_user, 1),
    sold_tickets = COALESCE(sold_tickets, 0)
WHERE 
    subject IS NULL 
    OR subcategory IS NULL 
    OR location_name IS NULL 
    OR location_city IS NULL 
    OR location_state IS NULL 
    OR ticket_type IS NULL 
    OR classification IS NULL 
    OR important_info IS NULL 
    OR attractions IS NULL 
    OR tags IS NULL 
    OR banner_metadata IS NULL 
    OR banner_alt_text IS NULL 
    OR max_tickets_per_user IS NULL 
    OR min_tickets_per_user IS NULL 
    OR sold_tickets IS NULL;

-- 8. VERIFICAR CONSTRAINTS APÓS CORREÇÃO
SELECT 
    'CONSTRAINTS APÓS CORREÇÃO' as info,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN is_nullable = 'NO' THEN 'OBRIGATÓRIO'
        ELSE 'OPCIONAL'
    END as status
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. VERIFICAR RESULTADO FINAL
SELECT 
    'RESULTADO FINAL' as status,
    COUNT(*) as total_events,
    COUNT(CASE WHEN title IS NOT NULL THEN 1 END) as com_titulo,
    COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as com_descricao,
    COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as com_local,
    COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as com_preco,
    COUNT(CASE WHEN category IS NOT NULL THEN 1 END) as com_categoria,
    COUNT(CASE WHEN end_date IS NOT NULL THEN 1 END) as com_data_fim,
    COUNT(CASE WHEN end_date IS NULL THEN 1 END) as sem_data_fim
FROM events;

-- 10. VERIFICAR SE A TABELA ESTÁ FUNCIONANDO
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    CASE 
        WHEN COUNT(*) = COUNT(CASE WHEN title IS NOT NULL THEN 1 END) 
             AND COUNT(*) = COUNT(CASE WHEN description IS NOT NULL THEN 1 END)
             AND COUNT(*) = COUNT(CASE WHEN location IS NOT NULL THEN 1 END)
             AND COUNT(*) = COUNT(CASE WHEN price IS NOT NULL THEN 1 END)
             AND COUNT(*) = COUNT(CASE WHEN category IS NOT NULL THEN 1 END)
        THEN '✅ TABELA CORRIGIDA COM SUCESSO'
        ELSE '❌ AINDA HÁ PROBLEMAS'
    END as resultado
FROM events;
