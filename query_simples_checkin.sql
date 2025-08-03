-- ===================================================================
-- QUERY ULTRA-SIMPLES PARA VER TABELA CHECKIN
-- ===================================================================

-- VER SE A TABELA CHECKIN EXISTE
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'checkin' AND table_schema = 'public';

-- VER COLUNAS DA TABELA CHECKIN
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'checkin' AND table_schema = 'public'
ORDER BY ordinal_position;

-- VER DADOS DA TABELA CHECKIN (SE EXISTIR)
SELECT * FROM checkin LIMIT 1;