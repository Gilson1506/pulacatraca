-- CORREÇÃO IMEDIATA PARA ERRO QR_CODE AMBÍGUO
-- Execute este script diretamente no SQL Editor do Supabase

-- 1. REMOVER TODOS OS TRIGGERS RELACIONADOS A QR_CODE
DROP TRIGGER IF EXISTS trigger_generate_qr_code ON ticket_users CASCADE;
DROP TRIGGER IF EXISTS ticket_user_qr_trigger ON ticket_users CASCADE;
DROP TRIGGER IF EXISTS generate_qr_code ON ticket_users CASCADE;
DROP TRIGGER IF EXISTS update_qr_code ON ticket_users CASCADE;

-- 2. REMOVER FUNÇÕES QUE PODEM ESTAR CAUSANDO CONFLITO
DROP FUNCTION IF EXISTS generate_ticket_qr_code() CASCADE;
DROP FUNCTION IF EXISTS generate_qr_code() CASCADE;
DROP FUNCTION IF EXISTS update_ticket_qr_code() CASCADE;

-- 3. VERIFICAR SE A COLUNA QR_CODE EXISTE
DO $$
DECLARE
    qr_column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_users' AND column_name = 'qr_code'
    ) INTO qr_column_exists;
    
    IF qr_column_exists THEN
        RAISE NOTICE '✅ Coluna qr_code existe na tabela ticket_users';
        
        -- 4. CRIAR FUNÇÃO SIMPLES SEM AMBIGUIDADE
        CREATE OR REPLACE FUNCTION generate_simple_qr_code()
        RETURNS TRIGGER AS $func$
        BEGIN
            -- Verificar se qr_code está vazio e preencher
            IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
                NEW.qr_code := 'QR_' || NEW.id;
            END IF;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        
        -- 5. CRIAR TRIGGER SIMPLES
        CREATE TRIGGER simple_qr_trigger
            BEFORE INSERT OR UPDATE ON ticket_users
            FOR EACH ROW
            EXECUTE FUNCTION generate_simple_qr_code();
            
        RAISE NOTICE '✅ Trigger simples criado com sucesso';
    ELSE
        RAISE NOTICE '⚠️ Coluna qr_code não existe - adicionando...';
        
        -- Adicionar coluna qr_code se não existir
        ALTER TABLE ticket_users ADD COLUMN qr_code TEXT;
        
        -- Criar função e trigger após adicionar coluna
        CREATE OR REPLACE FUNCTION generate_simple_qr_code()
        RETURNS TRIGGER AS $func$
        BEGIN
            IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
                NEW.qr_code := 'QR_' || NEW.id;
            END IF;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        
        CREATE TRIGGER simple_qr_trigger
            BEFORE INSERT OR UPDATE ON ticket_users
            FOR EACH ROW
            EXECUTE FUNCTION generate_simple_qr_code();
            
        RAISE NOTICE '✅ Coluna qr_code adicionada e trigger criado';
    END IF;
END $$;

-- 6. CORRIGIR POLICIES RLS (PODE SER A FONTE DO PROBLEMA)
DROP POLICY IF EXISTS "ticket_users_policy" ON ticket_users;
DROP POLICY IF EXISTS "Users can manage their ticket users" ON ticket_users;
DROP POLICY IF EXISTS "ticket_users_access_policy" ON ticket_users;

-- Criar policy sem referência ambígua
CREATE POLICY "simple_ticket_users_policy" ON ticket_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_users.ticket_id 
            AND t.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_users.ticket_id 
            AND t.user_id = auth.uid()
        )
    );

-- 7. HABILITAR RLS
ALTER TABLE ticket_users ENABLE ROW LEVEL SECURITY;

-- 8. TESTE FINAL
SELECT 'Script executado com sucesso! Teste agora a criação de ticket_user.' as resultado;

-- Para testar, use:
-- INSERT INTO ticket_users (ticket_id, name, email, document) 
-- VALUES ('seu-ticket-id-aqui', 'Nome Teste', 'email@teste.com', '123456789');