-- Script SQL para migrar dados existentes
-- Execute APÓS executar update_event_ticket_types.sql

-- 1. Migrar ingressos existentes que usam price_masculine/price_feminine para price_type
UPDATE public.event_ticket_types 
SET price_type = CASE 
  WHEN price_masculine IS NOT NULL AND price_feminine IS NOT NULL 
    AND price_masculine != price_feminine THEN 'gender_separate'
  ELSE 'unissex'
END
WHERE price_type IS NULL OR price_type = 'unissex';

-- 2. Se existirem dados de meia-entrada em algum campo existente, migrar para os novos campos
-- (Ajuste conforme sua estrutura atual de dados)

-- 3. Limpar valores padrão de min_quantity e max_quantity para tickets existentes
-- (Mantém os valores que o usuário já definiu, apenas remove valores padrão desnecessários)
UPDATE public.event_ticket_types 
SET min_quantity = NULL 
WHERE min_quantity = 1;

UPDATE public.event_ticket_types 
SET max_quantity = NULL 
WHERE max_quantity = 10;

-- 4. Verificar dados migrados
SELECT 
  'Data migration completed!' as status,
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN price_type = 'unissex' THEN 1 END) as unissex_tickets,
  COUNT(CASE WHEN price_type = 'gender_separate' THEN 1 END) as gender_separate_tickets,
  COUNT(CASE WHEN has_half_price = true THEN 1 END) as tickets_with_half_price
FROM public.event_ticket_types;

-- 5. Exemplo de consulta para verificar a estrutura atual
SELECT 
  id,
  title,
  price_type,
  price,
  price_masculine,
  price_feminine,
  half_price_title,
  half_price_quantity,
  has_half_price,
  min_quantity,
  max_quantity
FROM public.event_ticket_types 
LIMIT 5;
