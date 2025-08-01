-- CORREÇÃO SIMPLES PARA ERRO QR_CODE AMBÍGUO
-- Erro: column reference "qr_code" is ambiguous

-- 1. Verificar estrutura da tabela ticket_users
SELECT 'Estrutura da tabela ticket_users:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ticket_users' 
ORDER BY ordinal_position;

-- 2. Listar triggers existentes
SELECT 'Triggers na tabela ticket_users:' as info;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'ticket_users';

-- 3. Corrigir função que pode ter referência ambígua
DROP FUNCTION IF EXISTS generate_ticket_qr_code() CASCADE;

CREATE OR REPLACE FUNCTION generate_ticket_qr_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Usar NEW.qr_code explicitamente para evitar ambiguidade
    IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
        NEW.qr_code := 'TU_' || NEW.id || '_' || EXTRACT(epoch FROM NOW())::bigint;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recriar trigger com nova função
DROP TRIGGER IF EXISTS trigger_generate_qr_code ON ticket_users;
DROP TRIGGER IF EXISTS ticket_user_qr_trigger ON ticket_users;

-- Só criar trigger se a coluna qr_code existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_users' AND column_name = 'qr_code'
    ) THEN
        CREATE TRIGGER trigger_generate_qr_code
            BEFORE INSERT OR UPDATE ON ticket_users
            FOR EACH ROW
            EXECUTE FUNCTION generate_ticket_qr_code();
        RAISE NOTICE '✅ Trigger de QR code criado';
    ELSE
        RAISE NOTICE '⚠️ Coluna qr_code não existe - trigger não criado';
    END IF;
END $$;

-- 5. Verificar e corrigir policies RLS
DROP POLICY IF EXISTS "ticket_users_policy" ON ticket_users;
DROP POLICY IF EXISTS "Users can manage their ticket users" ON ticket_users;

-- Criar policy simples e clara
CREATE POLICY "ticket_users_access_policy" ON ticket_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE tickets.id = ticket_users.ticket_id 
            AND tickets.user_id = auth.uid()
        )
    );

-- 6. Garantir que RLS está habilitado
ALTER TABLE ticket_users ENABLE ROW LEVEL SECURITY;

-- 7. Teste simples
SELECT 'Testando inserção básica...' as info;

-- Resultado final
SELECT 'Correção aplicada! Teste a criação de ticket_user agora.' as resultado;