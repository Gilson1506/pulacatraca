-- FIX RÁPIDO: ADICIONAR COLUNAS FALTANTES

-- Verificar estrutura atual
SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets';

-- Adicionar ticket_type se não existir
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_type TEXT DEFAULT 'Padrão';

-- Adicionar buyer_id se não existir  
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS buyer_id UUID;

-- Desabilitar RLS
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;

-- Verificar colunas depois
SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets' ORDER BY column_name;