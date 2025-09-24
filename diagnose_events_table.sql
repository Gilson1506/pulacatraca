-- Script para diagnosticar e corrigir problemas na tabela events
-- Execute este script no seu banco de dados Supabase

-- 1. VERIFICAR ESTRUTURA ATUAL DA TABELA
DO $$
BEGIN
    RAISE NOTICE '=== DIAGNÓSTICO DA TABELA EVENTS ===';
    RAISE NOTICE 'Verificando estrutura e dados...';
END $$;

-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'events' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR DADOS EXISTENTES
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO DADOS EXISTENTES ===';
END $$;

-- Contar eventos por status
SELECT 
    status,
    COUNT(*) as total,
    COUNT(CASE WHEN title IS NULL OR title = '' THEN 1 END) as sem_titulo,
    COUNT(CASE WHEN description IS NULL OR description = '' THEN 1 END) as sem_descricao,
    COUNT(CASE WHEN start_date IS NULL THEN 1 END) as sem_data_inicio,
    COUNT(CASE WHEN location IS NULL OR location = '' THEN 1 END) as sem_local,
    COUNT(CASE WHEN image IS NULL OR image = '' THEN 1 END) as sem_imagem,
    COUNT(CASE WHEN subject IS NULL OR subject = '' THEN 1 END) as sem_assunto,
    COUNT(CASE WHEN category IS NULL OR category = '' THEN 1 END) as sem_categoria,
    COUNT(CASE WHEN classification IS NULL OR classification = '' THEN 1 END) as sem_classificacao,
    COUNT(CASE WHEN important_info IS NULL OR array_length(important_info, 1) = 0 THEN 1 END) as sem_info_importante,
    COUNT(CASE WHEN attractions IS NULL OR array_length(attractions, 1) = 0 THEN 1 END) as sem_atracoes
FROM events 
GROUP BY status;

-- 3. VERIFICAR EVENTOS COM PROBLEMAS
DO $$
BEGIN
    RAISE NOTICE '=== EVENTOS COM PROBLEMAS ===';
END $$;

-- Eventos com campos críticos nulos
SELECT 
    id,
    title,
    status,
    CASE 
        WHEN title IS NULL OR title = '' THEN '❌ SEM TÍTULO'
        ELSE '✅ TÍTULO OK'
    END as titulo_status,
    CASE 
        WHEN description IS NULL OR description = '' THEN '❌ SEM DESCRIÇÃO'
        ELSE '✅ DESCRIÇÃO OK'
    END as descricao_status,
    CASE 
        WHEN start_date IS NULL THEN '❌ SEM DATA INÍCIO'
        ELSE '✅ DATA INÍCIO OK'
    END as data_status,
    CASE 
        WHEN location IS NULL OR location = '' THEN '❌ SEM LOCAL'
        ELSE '✅ LOCAL OK'
    END as local_status,
    CASE 
        WHEN image IS NULL OR image = '' THEN '❌ SEM IMAGEM'
        ELSE '✅ IMAGEM OK'
    END as imagem_status
FROM events 
WHERE title IS NULL OR title = '' 
   OR description IS NULL OR description = '' 
   OR start_date IS NULL 
   OR location IS NULL OR location = ''
   OR image IS NULL OR image = ''
ORDER BY created_at DESC;

-- 4. VERIFICAR CAMPOS DE ARRAY
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO CAMPOS DE ARRAY ===';
END $$;

-- Verificar campos important_info
SELECT 
    id,
    title,
    important_info,
    CASE 
        WHEN important_info IS NULL THEN 'NULL'
        WHEN array_length(important_info, 1) = 0 THEN 'ARRAY VAZIO'
        ELSE 'ARRAY COM DADOS'
    END as important_info_status,
    array_length(important_info, 1) as important_info_length
FROM events 
WHERE important_info IS NULL OR array_length(important_info, 1) = 0
LIMIT 10;

-- Verificar campos attractions
SELECT 
    id,
    title,
    attractions,
    CASE 
        WHEN attractions IS NULL THEN 'NULL'
        WHEN array_length(attractions, 1) = 0 THEN 'ARRAY VAZIO'
        ELSE 'ARRAY COM DADOS'
    END as attractions_status,
    array_length(attractions, 1) as attractions_length
FROM events 
LIMIT 10;

-- 5. CORRIGIR DADOS PROBLEMÁTICOS
DO $$
BEGIN
    RAISE NOTICE '=== CORRIGINDO DADOS PROBLEMÁTICOS ===';
END $$;

-- Corrigir campos nulos com valores padrão
UPDATE events 
SET 
    title = COALESCE(title, 'Evento sem título'),
    description = COALESCE(description, 'Descrição não disponível'),
    subject = COALESCE(subject, 'Evento'),
    category = COALESCE(category, 'evento'),
    classification = COALESCE(classification, 'Livre'),
    important_info = COALESCE(important_info, ARRAY['Chegue com antecedência', 'Documento obrigatório']),
    attractions = COALESCE(attractions, ARRAY['Programação especial']),
    location = COALESCE(location, 'Local a ser definido'),
    image = COALESCE(image, 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDgwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjM2OEE3Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iMjEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMzIiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FdmVudG88L3RleHQ+Cjwvc3ZnPgo='),
    location_type = COALESCE(location_type, 'tbd'),
    location_name = COALESCE(location_name, 'Local a ser definido'),
    location_city = COALESCE(location_city, 'Cidade não informada'),
    location_state = COALESCE(location_state, 'Estado não informado'),
    ticket_type = COALESCE(ticket_type, 'free'),
    price = COALESCE(price, 0)
WHERE title IS NULL OR title = '' 
   OR description IS NULL OR description = '' 
   OR subject IS NULL OR subject = ''
   OR category IS NULL OR category = ''
   OR important_info IS NULL OR array_length(important_info, 1) = 0
   OR attractions IS NULL OR array_length(attractions, 1) = 0
   OR location IS NULL OR location = ''
   OR image IS NULL OR image = '';

-- 6. VERIFICAR SE HÁ PROBLEMAS DE TIPO DE DADOS
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO TIPOS DE DADOS ===';
END $$;

-- Verificar se há problemas com campos de data
SELECT 
    id,
    title,
    start_date,
    end_date,
    CASE 
        WHEN start_date IS NULL THEN '❌ DATA INÍCIO NULL'
        WHEN start_date::text = '' THEN '❌ DATA INÍCIO VAZIA'
        ELSE '✅ DATA INÍCIO OK'
    END as data_inicio_status,
    CASE 
        WHEN end_date IS NULL THEN '✅ DATA FIM NULL (OPCIONAL)'
        WHEN end_date::text = '' THEN '❌ DATA FIM VAZIA'
        ELSE '✅ DATA FIM OK'
    END as data_fim_status
FROM events 
WHERE start_date::text = '' OR (end_date IS NOT NULL AND end_date::text = '')
LIMIT 10;

-- 7. VERIFICAR RELACIONAMENTOS
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO RELACIONAMENTOS ===';
END $$;

-- Verificar se há eventos sem organizador
SELECT 
    id,
    title,
    organizer_id,
    CASE 
        WHEN organizer_id IS NULL THEN '❌ SEM ORGANIZADOR'
        ELSE '✅ COM ORGANIZADOR'
    END as organizador_status
FROM events 
WHERE organizer_id IS NULL;

-- Verificar se há tipos de ingresso para eventos
SELECT 
    e.id,
    e.title,
    COUNT(ett.id) as tipos_ingresso_count,
    CASE 
        WHEN COUNT(ett.id) = 0 THEN '❌ SEM TIPOS DE INGRESSO'
        ELSE '✅ COM TIPOS DE INGRESSO'
    END as tipos_ingresso_status
FROM events e
LEFT JOIN event_ticket_types ett ON e.id = ett.event_id
GROUP BY e.id, e.title
HAVING COUNT(ett.id) = 0
LIMIT 10;

-- 8. CRIAR ÍNDICES PARA MELHORAR PERFORMANCE
DO $$
BEGIN
    RAISE NOTICE '=== CRIANDO ÍNDICES ===';
END $$;

-- Índices para melhorar consultas
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_location_type ON events(location_type);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_subject ON events(subject);

-- Índice para campos de array (GIN)
CREATE INDEX IF NOT EXISTS idx_events_important_info ON events USING GIN(important_info);
CREATE INDEX IF NOT EXISTS idx_events_attractions ON events USING GIN(attractions);

-- 9. VERIFICAR RESULTADO FINAL
DO $$
BEGIN
    RAISE NOTICE '=== RESULTADO FINAL ===';
END $$;

-- Contar eventos por status após correção
SELECT 
    status,
    COUNT(*) as total,
    COUNT(CASE WHEN title IS NULL OR title = '' THEN 1 END) as sem_titulo,
    COUNT(CASE WHEN description IS NULL OR description = '' THEN 1 END) as sem_descricao,
    COUNT(CASE WHEN start_date IS NULL THEN 1 END) as sem_data_inicio,
    COUNT(CASE WHEN location IS NULL OR location = '' THEN 1 END) as sem_local,
    COUNT(CASE WHEN image IS NULL OR image = '' THEN 1 END) as sem_imagem
FROM events 
GROUP BY status;

-- 10. RECOMENDAÇÕES
DO $$
BEGIN
    RAISE NOTICE '=== RECOMENDAÇÕES ===';
    RAISE NOTICE '✅ Execute este script regularmente para manter a qualidade dos dados';
    RAISE NOTICE '✅ Configure validações no frontend para evitar dados nulos';
    RAISE NOTICE '✅ Use triggers para validar dados antes da inserção';
    RAISE NOTICE '✅ Monitore logs de erro para identificar problemas';
    RAISE NOTICE '✅ Configure alertas para campos obrigatórios nulos';
END $$;

-- 11. TESTAR CONSULTA DE EVENTOS
DO $$
BEGIN
    RAISE NOTICE '=== TESTANDO CONSULTA ===';
END $$;

-- Testar consulta similar à da página de eventos
SELECT 
    id,
    title,
    description,
    start_date,
    location,
    image,
    subject,
    category,
    classification,
    important_info,
    attractions,
    location_type,
    location_name,
    location_city,
    location_state,
    ticket_type,
    price,
    status
FROM events 
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 5;
