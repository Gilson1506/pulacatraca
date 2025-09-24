-- =====================================================
-- CORREÇÃO DOS PROBLEMAS DE MAPEAMENTO DE CAMPOS
-- TABELA: public.events
-- =====================================================

-- 1. VERIFICAR CAMPOS QUE ESTÃO NULL MAS NÃO DEVERIAM ESTAR
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND table_schema = 'public'
    AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- 2. VERIFICAR DADOS ATUAIS COM PROBLEMAS
SELECT 
    id,
    title,
    description,
    organizer_id,
    start_date,
    end_date,
    location,
    status,
    price,
    category,
    created_at,
    updated_at
FROM events 
WHERE description IS NULL 
    OR location IS NULL 
    OR price IS NULL 
    OR category IS NULL
LIMIT 10;

-- 3. CORRIGIR CAMPOS OBRIGATÓRIOS QUE ESTÃO NULL
UPDATE events 
SET 
    description = COALESCE(description, 'Descrição não disponível'),
    location = COALESCE(location, 'Local não informado'),
    price = COALESCE(price, 0),
    category = COALESCE(category, 'evento'),
    status = COALESCE(status, 'pending')
WHERE 
    description IS NULL 
    OR location IS NULL 
    OR price IS NULL 
    OR category IS NULL 
    OR status IS NULL;

-- 4. CORRIGIR CAMPOS DE LOCALIZAÇÃO
UPDATE events 
SET 
    location_city = COALESCE(location_city, 'Cidade não informada'),
    location_state = COALESCE(location_state, 'Estado não informado'),
    location_type = COALESCE(location_type, 'physical'),
    location_name = COALESCE(location_name, COALESCE(location, 'Local não informado'))
WHERE 
    location_city IS NULL 
    OR location_state IS NULL 
    OR location_type IS NULL 
    OR location_name IS NULL;

-- 5. CORRIGIR CAMPOS DE CLASSIFICAÇÃO
UPDATE events 
SET 
    classification = COALESCE(classification, 'Livre'),
    subject = COALESCE(subject, 'Evento'),
    subcategory = COALESCE(subcategory, category),
    ticket_type = COALESCE(ticket_type, 'paid')
WHERE 
    classification IS NULL 
    OR subject IS NULL 
    OR subcategory IS NULL 
    OR ticket_type IS NULL;

-- 6. CORRIGIR CAMPOS DE INGRESSOS
UPDATE events 
SET 
    available_tickets = COALESCE(available_tickets, 0),
    total_tickets = COALESCE(total_tickets, 0),
    sold_tickets = COALESCE(sold_tickets, 0),
    max_tickets_per_user = COALESCE(max_tickets_per_user, 5),
    min_tickets_per_user = COALESCE(min_tickets_per_user, 1)
WHERE 
    available_tickets IS NULL 
    OR total_tickets IS NULL 
    OR sold_tickets IS NULL 
    OR max_tickets_per_user IS NULL 
    OR min_tickets_per_user IS NULL;

-- 7. CORRIGIR CAMPOS DE ARRAYS
UPDATE events 
SET 
    important_info = COALESCE(important_info, ARRAY['Chegue com antecedência', 'Documento obrigatório']),
    attractions = COALESCE(attractions, ARRAY['Programação especial']),
    tags = COALESCE(tags, ARRAY[category])
WHERE 
    important_info IS NULL 
    OR attractions IS NULL 
    OR tags IS NULL;

-- 8. CORRIGIR CAMPOS DE METADADOS
UPDATE events 
SET 
    banner_metadata = COALESCE(banner_metadata, '{}'::jsonb),
    banner_alt_text = COALESCE(banner_alt_text, title)
WHERE 
    banner_metadata IS NULL 
    OR banner_alt_text IS NULL;

-- 9. VERIFICAR SE HÁ PROBLEMAS DE FOREIGN KEY
SELECT 
    e.id,
    e.title,
    e.organizer_id,
    p.id as profile_id,
    p.name as organizer_name
FROM events e
LEFT JOIN profiles p ON e.organizer_id = p.id
WHERE p.id IS NULL;

-- 10. CORRIGIR ORGANIZER_ID SE NECESSÁRIO (SUBSTITUIR POR UM ID VÁLIDO)
-- ATENÇÃO: Execute apenas se souber qual ID usar
-- UPDATE events SET organizer_id = 'ID_VÁLIDO_AQUI' WHERE organizer_id NOT IN (SELECT id FROM profiles);

-- 11. VERIFICAR RESULTADO DAS CORREÇÕES
SELECT 
    COUNT(*) as total_events,
    COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as with_description,
    COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as with_location,
    COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as with_price,
    COUNT(CASE WHEN category IS NOT NULL THEN 1 END) as with_category,
    COUNT(CASE WHEN status IS NOT NULL THEN 1 END) as with_status
FROM events;

-- 12. CRIAR ÍNDICES ADICIONAIS PARA MELHORAR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_events_price ON public.events USING btree (price);
CREATE INDEX IF NOT EXISTS idx_events_available_tickets ON public.events USING btree (available_tickets);
CREATE INDEX IF NOT EXISTS idx_events_total_tickets ON public.events USING btree (total_tickets);

-- 13. VERIFICAR CONSTRAINTS
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'events'::regclass;

-- =====================================================
-- RECOMENDAÇÕES PARA O FRONTEND
-- =====================================================

/*
PROBLEMAS IDENTIFICADOS NO FRONTEND:

1. MAPEAMENTO INCORRETO DE CAMPOS:
   - Frontend envia: 'name' -> Banco espera: 'title'
   - Frontend envia: 'date' -> Banco espera: 'start_date'
   - Frontend envia: 'time' -> Banco espera: 'start_time'
   - Frontend envia: 'endDate' -> Banco espera: 'end_date'
   - Frontend envia: 'endTime' -> Banco espera: 'end_time'

2. CAMPOS OBRIGATÓRIOS NÃO SENDO PREENCHIDOS:
   - description: Deve ter valor padrão se não informado
   - location: Deve ter valor padrão se não informado
   - price: Deve ser 0 se não informado
   - category: Deve ter valor padrão se não informado

3. CAMPOS ADICIONAIS NÃO SENDO PREENCHIDOS:
   - location_city, location_state, location_type
   - classification, subject, subcategory
   - important_info, attractions, tags

SOLUÇÕES IMPLEMENTADAS:

1. Valores padrão para campos obrigatórios
2. Correção de campos NULL para valores padrão
3. Índices adicionais para melhorar performance
4. Verificação de integridade referencial
*/

-- =====================================================
-- SCRIPT DE VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se ainda há campos NULL em campos obrigatórios
SELECT 
    'PROBLEMAS RESTANTES' as status,
    COUNT(*) as total_problems
FROM events 
WHERE 
    description IS NULL 
    OR location IS NULL 
    OR price IS NULL 
    OR category IS NULL 
    OR status IS NULL;

-- Se retornar 0, todos os problemas foram corrigidos
-- Se retornar > 0, execute novamente os UPDATEs acima
