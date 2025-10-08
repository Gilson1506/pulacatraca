-- Script SQL para reverter as alterações na tabela event_ticket_types
-- Use com cuidado - este script remove as novas funcionalidades

-- 1. Remover tabela de lotes e suas dependências
DROP TRIGGER IF EXISTS trigger_update_event_ticket_batches_updated_at ON public.event_ticket_batches;
DROP FUNCTION IF EXISTS update_event_ticket_batches_updated_at();
DROP INDEX IF EXISTS idx_event_ticket_batches_ticket_type_id;
DROP INDEX IF EXISTS idx_event_ticket_batches_batch_number;
DROP TABLE IF EXISTS public.event_ticket_batches;

-- 2. Remover campos de meia-entrada
ALTER TABLE public.event_ticket_types 
DROP COLUMN IF EXISTS half_price_title;

ALTER TABLE public.event_ticket_types 
DROP COLUMN IF EXISTS half_price_quantity;

ALTER TABLE public.event_ticket_types 
DROP COLUMN IF EXISTS half_price_price;

ALTER TABLE public.event_ticket_types 
DROP COLUMN IF EXISTS half_price_price_feminine;

-- 3. Remover constraint e campo price_type
ALTER TABLE public.event_ticket_types 
DROP CONSTRAINT IF EXISTS event_ticket_types_price_type_check;

ALTER TABLE public.event_ticket_types 
DROP COLUMN IF EXISTS price_type;

-- 4. Restaurar campo 'area' (se necessário)
-- ALTER TABLE public.event_ticket_types 
-- ADD COLUMN IF NOT EXISTS area text NULL;

-- 5. Restaurar valores padrão originais
ALTER TABLE public.event_ticket_types 
ALTER COLUMN min_quantity SET DEFAULT 1;

ALTER TABLE public.event_ticket_types 
ALTER COLUMN max_quantity SET DEFAULT 10;

-- 6. Verificar se o rollback foi bem-sucedido
SELECT 
  'Rollback completed successfully!' as status,
  COUNT(*) as existing_tickets
FROM public.event_ticket_types;
