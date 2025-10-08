-- Script SQL para atualizar a tabela event_ticket_types
-- Adaptação para as novas funcionalidades de preços por gênero, meia-entrada e sistema de lotes

-- 1. Adicionar campo para tipo de preço (unissex ou por gênero)
ALTER TABLE public.event_ticket_types 
ADD COLUMN IF NOT EXISTS price_type character varying(20) DEFAULT 'unissex'::character varying;

-- 2. Adicionar constraint para price_type
ALTER TABLE public.event_ticket_types 
ADD CONSTRAINT IF NOT EXISTS event_ticket_types_price_type_check 
CHECK (price_type = ANY (ARRAY['unissex'::character varying, 'gender_separate'::character varying]));

-- 3. Adicionar campos para meia-entrada
ALTER TABLE public.event_ticket_types 
ADD COLUMN IF NOT EXISTS half_price_title character varying(45) NULL;

ALTER TABLE public.event_ticket_types 
ADD COLUMN IF NOT EXISTS half_price_quantity integer NULL DEFAULT 0;

ALTER TABLE public.event_ticket_types 
ADD COLUMN IF NOT EXISTS half_price_price numeric(10, 2) NULL;

ALTER TABLE public.event_ticket_types 
ADD COLUMN IF NOT EXISTS half_price_price_feminine numeric(10, 2) NULL;

-- 4. Remover campo 'area' (não é mais usado)
ALTER TABLE public.event_ticket_types 
DROP COLUMN IF EXISTS area;

-- 5. Atualizar valores padrão para campos de quantidade (remover valores padrão)
ALTER TABLE public.event_ticket_types 
ALTER COLUMN min_quantity SET DEFAULT NULL;

ALTER TABLE public.event_ticket_types 
ALTER COLUMN max_quantity SET DEFAULT NULL;

-- 6. Criar tabela para lotes de ingressos
CREATE TABLE IF NOT EXISTS public.event_ticket_batches (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  ticket_type_id uuid NOT NULL,
  batch_number integer NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  price_type character varying(20) NOT NULL DEFAULT 'unissex'::character varying,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  price_feminine numeric(10, 2) NULL,
  sale_start_date timestamp with time zone NULL,
  sale_start_time time NULL,
  sale_end_date timestamp with time zone NULL,
  sale_end_time time NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT event_ticket_batches_pkey PRIMARY KEY (id),
  CONSTRAINT event_ticket_batches_ticket_type_id_fkey 
    FOREIGN KEY (ticket_type_id) REFERENCES public.event_ticket_types(id) ON DELETE CASCADE,
  CONSTRAINT event_ticket_batches_price_type_check 
    CHECK (price_type = ANY (ARRAY['unissex'::character varying, 'gender_separate'::character varying])),
  CONSTRAINT event_ticket_batches_batch_number_check 
    CHECK (batch_number > 0),
  CONSTRAINT event_ticket_batches_quantity_check 
    CHECK (quantity >= 0)
) TABLESPACE pg_default;

-- 7. Criar índices para a tabela de lotes
CREATE INDEX IF NOT EXISTS idx_event_ticket_batches_ticket_type_id 
ON public.event_ticket_batches USING btree (ticket_type_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_event_ticket_batches_batch_number 
ON public.event_ticket_batches USING btree (batch_number) TABLESPACE pg_default;

-- 8. Criar trigger para atualizar updated_at na tabela de lotes
CREATE OR REPLACE FUNCTION update_event_ticket_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_event_ticket_batches_updated_at ON public.event_ticket_batches;

CREATE TRIGGER trigger_update_event_ticket_batches_updated_at
  BEFORE UPDATE ON public.event_ticket_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_event_ticket_batches_updated_at();

-- 9. Atualizar dados existentes para definir price_type como 'unissex' por padrão
UPDATE public.event_ticket_types 
SET price_type = 'unissex' 
WHERE price_type IS NULL;

-- 10. Comentários para documentação
COMMENT ON COLUMN public.event_ticket_types.price_type IS 'Tipo de preço: unissex (preço único) ou gender_separate (preços por gênero)';
COMMENT ON COLUMN public.event_ticket_types.half_price_title IS 'Nome da meia-entrada (ex: "VIP - MEIA")';
COMMENT ON COLUMN public.event_ticket_types.half_price_quantity IS 'Quantidade disponível para meia-entrada';
COMMENT ON COLUMN public.event_ticket_types.half_price_price IS 'Preço da meia-entrada (masculino ou unissex)';
COMMENT ON COLUMN public.event_ticket_types.half_price_price_feminine IS 'Preço da meia-entrada feminina (apenas se price_type = gender_separate)';

COMMENT ON TABLE public.event_ticket_batches IS 'Lotes de ingressos com diferentes preços e períodos de venda';
COMMENT ON COLUMN public.event_ticket_batches.batch_number IS 'Número do lote (1º, 2º, 3º, etc.)';
COMMENT ON COLUMN public.event_ticket_batches.quantity IS 'Quantidade de ingressos neste lote';
COMMENT ON COLUMN public.event_ticket_batches.price_type IS 'Tipo de preço do lote: unissex ou gender_separate';
COMMENT ON COLUMN public.event_ticket_batches.price IS 'Preço do lote (masculino ou unissex)';
COMMENT ON COLUMN public.event_ticket_batches.price_feminine IS 'Preço feminino do lote (apenas se price_type = gender_separate)';

-- 11. Verificar se a migração foi bem-sucedida
SELECT 
  'Migration completed successfully!' as status,
  COUNT(*) as existing_tickets
FROM public.event_ticket_types;
