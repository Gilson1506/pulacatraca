-- =====================================================
-- LIMPAR TRANSAÇÕES DE TESTE ANTIGAS
-- Execute no SQL Editor do Supabase
-- =====================================================

-- 1. Ver quantas transações existem
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN pagbank_transaction_id IS NOT NULL THEN 1 END) as with_pagbank_id
FROM public.transactions;

-- 2. Ver transações duplicadas
SELECT 
  pagbank_transaction_id, 
  COUNT(*) as count,
  string_agg(id::text, ', ') as transaction_ids,
  string_agg(status, ', ') as statuses
FROM public.transactions
WHERE pagbank_transaction_id IS NOT NULL
GROUP BY pagbank_transaction_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 3. Ver últimas 20 transações
SELECT 
  id,
  order_id,
  pagbank_transaction_id,
  status,
  amount,
  payment_method,
  created_at
FROM public.transactions
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- LIMPEZA (DESCOMENTAR APENAS UMA OPÇÃO)
-- =====================================================

-- OPÇÃO 1: Deletar transações da última hora (desenvolvimento)
-- DELETE FROM public.transactions 
-- WHERE created_at > NOW() - INTERVAL '1 hour';

-- OPÇÃO 2: Deletar transações pendentes antigas (>30min)
-- DELETE FROM public.transactions 
-- WHERE status = 'pending' 
--   AND created_at < NOW() - INTERVAL '30 minutes';

-- OPÇÃO 3: Limpar TUDO (apenas para desenvolvimento)
-- TRUNCATE public.transactions CASCADE;
-- TRUNCATE public.orders CASCADE;
-- TRUNCATE public.tickets CASCADE;

-- =====================================================
-- VERIFICAR RESULTADO
-- =====================================================
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM public.transactions;

