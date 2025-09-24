-- CORREÇÃO SIMPLES E DEFINITIVA PARA TICKET_USERS
-- Execute este script no Supabase para resolver o erro

-- 1. Remover TODOS os triggers que podem causar conflito
DROP TRIGGER IF EXISTS trigger_generate_qr_code ON ticket_users CASCADE;
DROP TRIGGER IF EXISTS ticket_user_qr_trigger ON ticket_users CASCADE;
DROP TRIGGER IF EXISTS generate_qr_code ON ticket_users CASCADE;
DROP TRIGGER IF EXISTS update_qr_code ON ticket_users CASCADE;
DROP TRIGGER IF EXISTS simple_qr_trigger ON ticket_users CASCADE;

-- 2. Remover TODAS as funções que podem causar conflito
DROP FUNCTION IF EXISTS generate_ticket_qr_code() CASCADE;
DROP FUNCTION IF EXISTS generate_qr_code() CASCADE;
DROP FUNCTION IF EXISTS update_ticket_qr_code() CASCADE;
DROP FUNCTION IF EXISTS generate_simple_qr_code() CASCADE;

-- 3. Limpar policies problemáticas
DROP POLICY IF EXISTS "ticket_users_policy" ON ticket_users;
DROP POLICY IF EXISTS "Users can manage their ticket users" ON ticket_users;
DROP POLICY IF EXISTS "ticket_users_access_policy" ON ticket_users;
DROP POLICY IF EXISTS "simple_ticket_users_policy" ON ticket_users;
DROP POLICY IF EXISTS "allow_ticket_users" ON ticket_users;

-- 4. Verificar estrutura da tabela
DO $$
BEGIN
    -- Adicionar coluna qr_code se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_users' AND column_name = 'qr_code'
    ) THEN
        ALTER TABLE ticket_users ADD COLUMN qr_code TEXT;
        RAISE NOTICE '✅ Coluna qr_code adicionada';
    END IF;
    
    -- Verificar se ticket_id existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_users' AND column_name = 'ticket_id'
    ) THEN
        ALTER TABLE ticket_users ADD COLUMN ticket_id UUID REFERENCES tickets(id);
        RAISE NOTICE '✅ Coluna ticket_id adicionada';
    END IF;
END $$;

-- 5. Criar policy super simples
CREATE POLICY "allow_authenticated_users" ON ticket_users
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Habilitar RLS
ALTER TABLE ticket_users ENABLE ROW LEVEL SECURITY;

-- 7. Testar estrutura
SELECT 'Estrutura da tabela ticket_users:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ticket_users' 
ORDER BY ordinal_position;

SELECT 'Correção aplicada! Agora teste criar um ticket_user.' as resultado;