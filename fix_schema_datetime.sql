-- 🔧 CORREÇÃO DO ESQUEMA DA TABELA EVENTS
-- Adicionar colunas datetime faltantes e corrigir estrutura

-- 1. Verificar colunas atuais (execute primeiro para ver o que existe)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND table_schema = 'public'
ORDER BY column_name;

-- 2. Adicionar colunas datetime se não existirem
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMP WITH TIME ZONE;

-- 3. Migrar dados existentes (se houver colunas antigas)
-- Se existirem start_date + start_time separados, combine-os
UPDATE public.events 
SET start_datetime = CASE 
    WHEN start_date IS NOT NULL THEN start_date::timestamp with time zone
    ELSE NULL
END
WHERE start_datetime IS NULL;

-- Se existirem end_date + end_time separados, combine-os
UPDATE public.events 
SET end_datetime = CASE 
    WHEN end_date IS NOT NULL THEN end_date::timestamp with time zone
    ELSE NULL
END
WHERE end_datetime IS NULL;

-- 4. Definir start_datetime como obrigatório (NOT NULL)
ALTER TABLE public.events 
ALTER COLUMN start_datetime SET NOT NULL;

-- 5. Verificar resultado final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
    AND table_schema = 'public'
    AND column_name LIKE '%datetime%'
ORDER BY column_name;

-- 6. Testar inserção de dados
-- INSERT INTO public.events (
--     title,
--     description,
--     start_datetime,
--     end_datetime,
--     organizer_id,
--     status
-- ) VALUES (
--     'Teste Schema',
--     'Teste após correção do schema',
--     '2025-08-21T07:13:00+00:00',
--     '2025-08-22T07:13:00+00:00',
--     '7fd39ee2-24bd-49e3-bb42-1a7ce64cb078',
--     'pending'
-- );
