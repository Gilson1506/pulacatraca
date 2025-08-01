-- Debug da tabela events
-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- Verificar se o evento específico existe
SELECT id, title, start_date, location, banner_url 
FROM events 
WHERE id = '0e650dc7-b5bd-40d6-acda-91f952c0e611';

-- Testar query simplificada
SELECT 
  id,
  title,
  description,
  start_date,
  end_date,
  location,
  banner_url,
  category,
  price,
  status,
  organizer_id
FROM events 
WHERE id = '0e650dc7-b5bd-40d6-acda-91f952c0e611';

-- Verificar se há problemas com colunas específicas
SELECT COUNT(*) as total_events FROM events;
SELECT COUNT(*) as events_with_banner FROM events WHERE banner_url IS NOT NULL;