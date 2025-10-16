-- Migration: Adicionar colunas necessárias para PagBank na tabela orders
-- Data: 2025-10-14
-- Descrição: Adiciona colunas event_id, user_id, order_code, quantity, ticket_type e pagbank_order_id

-- 1. Adicionar coluna event_id (referência para eventos)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

-- 2. Adicionar coluna user_id (alias para customer_id para compatibilidade)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Adicionar coluna order_code (código alternativo do pedido)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_code VARCHAR(100);

-- 4. Adicionar coluna quantity (quantidade total de ingressos)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- 5. Adicionar coluna ticket_type (tipo de ingresso)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(100);

-- 6. Adicionar coluna pagbank_order_id (ID do pedido no PagBank)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS pagbank_order_id VARCHAR(100);

-- 7. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON public.orders USING btree (event_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders USING btree (order_code);
CREATE INDEX IF NOT EXISTS idx_orders_pagbank_order_id ON public.orders USING btree (pagbank_order_id);

-- 8. Atualizar user_id com valores de customer_id existentes (para registros antigos)
UPDATE public.orders 
SET user_id = customer_id 
WHERE user_id IS NULL AND customer_id IS NOT NULL;

-- 9. Comentários nas colunas
COMMENT ON COLUMN public.orders.event_id IS 'ID do evento relacionado ao pedido';
COMMENT ON COLUMN public.orders.user_id IS 'ID do usuário (compatibilidade com código PagBank)';
COMMENT ON COLUMN public.orders.order_code IS 'Código alternativo do pedido (ex: ORD-123456)';
COMMENT ON COLUMN public.orders.quantity IS 'Quantidade total de ingressos no pedido';
COMMENT ON COLUMN public.orders.ticket_type IS 'Tipo de ingresso (ex: VIP, Pista)';
COMMENT ON COLUMN public.orders.pagbank_order_id IS 'ID do pedido no PagBank';

-- 10. Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE '✅ Colunas PagBank adicionadas com sucesso à tabela orders!';
END $$;

