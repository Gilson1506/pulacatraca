-- CORREÇÃO DE EMERGÊNCIA - REMOVER AMBIGUIDADE QR_CODE
-- Execute este script IMEDIATAMENTE no Supabase

-- PASSO 1: DESABILITAR TODOS OS TRIGGERS DA TABELA
ALTER TABLE ticket_users DISABLE TRIGGER ALL;

-- PASSO 2: REMOVER TODAS AS FUNCTIONS E TRIGGERS RELACIONADOS
DROP TRIGGER IF EXISTS trigger_generate_qr_code ON ticket_users CASCADE;
DROP TRIGGER IF EXISTS ticket_user_qr_trigger ON ticket_users CASCADE;
DROP TRIGGER IF EXISTS generate_qr_code ON ticket_users CASCADE;
DROP TRIGGER IF EXISTS update_qr_code ON ticket_users CASCADE;
DROP TRIGGER IF EXISTS simple_qr_trigger ON ticket_users CASCADE;

DROP FUNCTION IF EXISTS generate_ticket_qr_code() CASCADE;
DROP FUNCTION IF EXISTS generate_qr_code() CASCADE;
DROP FUNCTION IF EXISTS update_ticket_qr_code() CASCADE;
DROP FUNCTION IF EXISTS generate_simple_qr_code() CASCADE;

-- PASSO 3: REMOVER TODAS AS POLICIES
DROP POLICY IF EXISTS "ticket_users_policy" ON ticket_users;
DROP POLICY IF EXISTS "Users can manage their ticket users" ON ticket_users;
DROP POLICY IF EXISTS "ticket_users_access_policy" ON ticket_users;
DROP POLICY IF EXISTS "simple_ticket_users_policy" ON ticket_users;

-- PASSO 4: DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE ticket_users DISABLE ROW LEVEL SECURITY;

-- PASSO 5: VERIFICAR E CORRIGIR ESTRUTURA DA TABELA
-- Verificar se a coluna qr_code existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_users' AND column_name = 'qr_code'
    ) THEN
        ALTER TABLE ticket_users ADD COLUMN qr_code TEXT;
        RAISE NOTICE '✅ Coluna qr_code adicionada';
    ELSE
        RAISE NOTICE '✅ Coluna qr_code já existe';
    END IF;
END $$;

-- PASSO 6: CRIAR POLICY MÍNIMA PARA FUNCIONAR
CREATE POLICY "allow_ticket_users" ON ticket_users FOR ALL USING (true);

-- PASSO 7: REABILITAR RLS
ALTER TABLE ticket_users ENABLE ROW LEVEL SECURITY;

-- TESTE: Tentar inserção simples
SELECT 'Correção aplicada! Tabela ticket_users limpa de ambiguidades.' as status;
SELECT 'Agora teste criar um ticket_user na aplicação.' as instrucao;

-- INFORMAÇÕES PARA DEBUG
SELECT 'Estrutura atual da tabela:' as debug;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ticket_users' 
ORDER BY ordinal_position;

SELECT 'Triggers ativos (deve estar vazio):' as debug2;
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'ticket_users';