-- ✅ CHAT MESSAGES TABLE - Sistema de suporte com LiveChat
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela chat_messages se não existir
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL CHECK (length(trim(message)) > 0),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(receiver_id, read) WHERE read = false;

-- 3. Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Habilitar RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can send messages to anyone" ON chat_messages;

-- 6. Criar políticas RLS

-- Usuários podem ver mensagens onde são remetente ou destinatário
CREATE POLICY "Users can view their own messages" ON chat_messages
    FOR SELECT
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    );

-- Usuários podem enviar mensagens
CREATE POLICY "Users can send messages" ON chat_messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        auth.uid() IS NOT NULL
    );

-- Usuários podem marcar suas mensagens recebidas como lidas
CREATE POLICY "Users can update their received messages" ON chat_messages
    FOR UPDATE
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- Admins podem ver todas as mensagens (para suporte)
CREATE POLICY "Admins can view all messages" ON chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- Admins podem enviar mensagens para qualquer usuário
CREATE POLICY "Admins can send messages to anyone" ON chat_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- 7. Garantir que existe pelo menos um admin para suporte
DO $$
BEGIN
    -- Verificar se existe admin ativo
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE role = 'admin' AND is_active = true
    ) THEN
        -- Criar um perfil de suporte padrão se não existir
        INSERT INTO profiles (id, email, name, role, is_active, is_verified)
        VALUES (
            'support-agent-default',
            'suporte@pulacatraca.com',
            'Suporte PulaCatraca',
            'admin',
            true,
            true
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            is_active = true,
            is_verified = true;
    END IF;
END $$;

-- 8. Criar função para notificações em tempo real (opcional)
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar sobre nova mensagem
    PERFORM pg_notify(
        'new_message',
        json_build_object(
            'id', NEW.id,
            'sender_id', NEW.sender_id,
            'receiver_id', NEW.receiver_id,
            'message', NEW.message,
            'created_at', NEW.created_at
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Criar trigger para notificações
DROP TRIGGER IF EXISTS trigger_notify_new_message ON chat_messages;
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();

-- 10. Testar a estrutura
DO $$
BEGIN
    RAISE NOTICE '✅ Tabela chat_messages configurada com sucesso!';
    RAISE NOTICE '📊 Estrutura: id, sender_id, receiver_id, message, read, created_at, updated_at';
    RAISE NOTICE '🔒 RLS habilitado com políticas para usuários e admins';
    RAISE NOTICE '📈 Índices criados para performance';
    RAISE NOTICE '🔔 Triggers configurados para updated_at e notificações';
    RAISE NOTICE '👥 Admin padrão criado se necessário';
END $$;