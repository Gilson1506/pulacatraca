-- ✅ TICKET USERS SYSTEM - Sistema de usuários de ingressos
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela ticket_users
CREATE TABLE IF NOT EXISTS ticket_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL CHECK (length(trim(name)) >= 2),
    email VARCHAR(100) NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    document VARCHAR(20), -- CPF, CNPJ ou outro documento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices únicos para evitar duplicatas
    UNIQUE(email)
);

-- 2. Adicionar campo ticket_user_id na tabela tickets se não existir
DO $$
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' 
        AND column_name = 'ticket_user_id'
    ) THEN
        ALTER TABLE tickets ADD COLUMN ticket_user_id UUID REFERENCES ticket_users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Coluna ticket_user_id adicionada à tabela tickets';
    ELSE
        RAISE NOTICE '⚠️ Coluna ticket_user_id já existe na tabela tickets';
    END IF;
END $$;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_ticket_users_email ON ticket_users(email);
CREATE INDEX IF NOT EXISTS idx_ticket_users_created_at ON ticket_users(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_user_id ON tickets(ticket_user_id);

-- 4. Criar trigger para updated_at na tabela ticket_users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ticket_users_updated_at ON ticket_users;
CREATE TRIGGER update_ticket_users_updated_at
    BEFORE UPDATE ON ticket_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Habilitar RLS na tabela ticket_users
ALTER TABLE ticket_users ENABLE ROW LEVEL SECURITY;

-- 6. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view ticket users" ON ticket_users;
DROP POLICY IF EXISTS "Users can create ticket users" ON ticket_users;
DROP POLICY IF EXISTS "Users can update their ticket users" ON ticket_users;
DROP POLICY IF EXISTS "Admins can manage all ticket users" ON ticket_users;

-- 7. Criar políticas RLS para ticket_users

-- Usuários podem ver dados de ticket_users associados aos seus ingressos
CREATE POLICY "Users can view ticket users" ON ticket_users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE tickets.ticket_user_id = ticket_users.id 
            AND tickets.user_id = auth.uid()
        )
    );

-- Usuários podem criar novos ticket_users
CREATE POLICY "Users can create ticket users" ON ticket_users
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Usuários podem atualizar ticket_users dos seus próprios ingressos
CREATE POLICY "Users can update their ticket users" ON ticket_users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE tickets.ticket_user_id = ticket_users.id 
            AND tickets.user_id = auth.uid()
        )
    );

-- Admins podem gerenciar todos os ticket_users
CREATE POLICY "Admins can manage all ticket users" ON ticket_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- 8. Atualizar políticas da tabela tickets para incluir ticket_user_id

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view their tickets with ticket users" ON tickets;
DROP POLICY IF EXISTS "Users can update their tickets with ticket users" ON tickets;

-- Usuários podem ver seus ingressos com dados do ticket_user
CREATE POLICY "Users can view their tickets with ticket users" ON tickets
    FOR SELECT
    USING (user_id = auth.uid());

-- Usuários podem atualizar ticket_user_id nos seus ingressos
CREATE POLICY "Users can update their tickets with ticket users" ON tickets
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 9. Função para gerar QR Code único
CREATE OR REPLACE FUNCTION generate_ticket_qr_code(ticket_id UUID, user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN ticket_id::TEXT || '-' || user_id::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger para atualizar QR Code quando ticket_user_id for definido
CREATE OR REPLACE FUNCTION update_ticket_qr_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Se ticket_user_id foi definido e qr_code está vazio ou é o antigo formato
    IF NEW.ticket_user_id IS NOT NULL AND 
       (OLD.ticket_user_id IS NULL OR OLD.ticket_user_id != NEW.ticket_user_id) THEN
        NEW.qr_code = generate_ticket_qr_code(NEW.id, NEW.ticket_user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ticket_qr_code ON tickets;
CREATE TRIGGER trigger_update_ticket_qr_code
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_qr_code();

-- 11. Atualizar ingressos existentes que não têm QR code adequado
UPDATE tickets 
SET qr_code = CASE 
    WHEN ticket_user_id IS NOT NULL THEN generate_ticket_qr_code(id, ticket_user_id)
    ELSE COALESCE(qr_code, id::TEXT)
END
WHERE qr_code IS NULL OR qr_code = '';

-- 12. Criar função para validar QR Code
CREATE OR REPLACE FUNCTION validate_ticket_qr_code(qr_code_input TEXT)
RETURNS TABLE (
    ticket_id UUID,
    ticket_user_id UUID,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    parts TEXT[];
    t_id UUID;
    u_id UUID;
BEGIN
    -- Dividir o QR code em partes
    parts := string_to_array(qr_code_input, '-');
    
    -- Verificar formato
    IF array_length(parts, 1) != 2 THEN
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE, 'Formato de QR Code inválido';
        RETURN;
    END IF;
    
    -- Converter para UUID
    BEGIN
        t_id := parts[1]::UUID;
        u_id := parts[2]::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE, 'QR Code com formato inválido';
        RETURN;
    END;
    
    -- Verificar se o ticket existe e está correto
    IF EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = t_id 
        AND t.ticket_user_id = u_id 
        AND t.qr_code = qr_code_input
        AND t.status = 'valid'
    ) THEN
        RETURN QUERY SELECT t_id, u_id, TRUE, 'QR Code válido'::TEXT;
    ELSE
        RETURN QUERY SELECT t_id, u_id, FALSE, 'QR Code inválido ou ingresso não encontrado';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 13. Testar a estrutura
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de usuários de ingressos configurado com sucesso!';
    RAISE NOTICE '📊 Tabela ticket_users criada com campos: id, name, email, document';
    RAISE NOTICE '🔗 Campo ticket_user_id adicionado à tabela tickets';
    RAISE NOTICE '🔒 RLS habilitado com políticas para usuários e admins';
    RAISE NOTICE '📈 Índices criados para performance';
    RAISE NOTICE '🔔 Triggers configurados para updated_at e QR code';
    RAISE NOTICE '✅ Função de validação de QR Code criada';
    RAISE NOTICE '🎯 QR Code format: ticket_id-ticket_user_id';
END $$;